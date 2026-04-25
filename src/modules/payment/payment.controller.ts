import { Request, Response } from "express";
import {
  buildEsewaFormData,
  verifyEsewaPayment,
  ESEWA_PAYMENT_URL,
} from "../../services/esewa.service";
import { calculateEscrow } from "../../services/escrow.service";
import { Order } from "../order/order.model";
import Book from "../book/book.model";
import logger from "../../utils/logger";
import { notifyOrderPlaced } from "../notification/fcm.service";
import Vendor from "../vendor/vendor.model";

export const initiateEsewaPayment = async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user?.id;
    if (!customerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      items,
      contact,
      shippingAddress,
      shippingMethod,
      shippingCost,
    } = req.body;

    if (!items?.length) {
      return res.status(400).json({ success: false, message: "No items in order" });
    }

    const bookIds = items.map((i: any) => i.bookId);
    const books = await Book.find({ _id: { $in: bookIds } }).lean();
    const bookMap = new Map(books.map((b) => [String(b._id), b]));

    const resolvedItems = items.map((item: any) => {
      const book = bookMap.get(String(item.bookId));
      if (!book) throw new Error(`Book ${item.bookId} not found`);
      if (!book.vendorId) {
        throw new Error(`Book "${book.title}" has no vendor assigned.`);
      }
      return {
        bookId: book._id,
        title: book.title,
        author: book.author,
        image: book.coverImage || "",
        price: book.price ?? 0,
        bookType: book.type,
        vendorId: book.vendorId,
      };
    });

    const vendorGroups: Record<string, any[]> = {};
    for (const item of resolvedItems) {
      const vId = String(item.vendorId);
      if (!vendorGroups[vId]) vendorGroups[vId] = [];
      vendorGroups[vId].push(item);
    }

    const verifiedSubtotal = resolvedItems.reduce((sum: number, i: any) => sum + i.price, 0);
    const verifiedShippingCost = shippingCost ?? 0;
    const verifiedTotal = verifiedSubtotal + verifiedShippingCost;
    const transactionUuid = `BS-${Date.now()}`;

    const vendorIds = Object.keys(vendorGroups);
    let remainingShipping = verifiedShippingCost;

    const ordersToSave = [];
    let index = 0;

    for (const vId of vendorIds) {
      const itemsForVendor = vendorGroups[vId];
      const subtotalForVendor = itemsForVendor.reduce((sum: number, i: any) => sum + i.price, 0);

      let shippingForVendor = 0;
      if (index === vendorIds.length - 1) {
        shippingForVendor = remainingShipping;
      } else {
        shippingForVendor = parseFloat((verifiedShippingCost / vendorIds.length).toFixed(2));
        remainingShipping -= shippingForVendor;
      }

      const totalForVendor = subtotalForVendor + shippingForVendor;
      const escrow = calculateEscrow(subtotalForVendor, shippingForVendor);

      const order = new Order({
        orderId: `${transactionUuid}-${index + 1}`,
        customerId,
        contact,
        items: itemsForVendor,
        shippingAddress: {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          address: shippingAddress.address,
          city: shippingAddress.city,
          postalCode: shippingAddress.postalCode,
          province: shippingAddress.province,
          country: shippingAddress.country,
          shippingNote: shippingAddress.shippingNote,
          latitude: shippingAddress.latitude ?? null,
          longitude: shippingAddress.longitude ?? null,
        },
        shippingMethod: shippingMethod || "standard",
        shippingCost: shippingForVendor,
        subtotal: subtotalForVendor,
        totalAmount: totalForVendor,
        status: "pending_payment",
        payment: { method: "esewa", transactionUuid },
        escrow: { status: "holding", ...escrow },
        statusHistory: [{ status: "pending_payment", changedAt: new Date() }],
      });
      ordersToSave.push(order);
      index++;
    }

    await Promise.all(ordersToSave.map(o => o.save()));

    const formData = buildEsewaFormData({ amount: verifiedTotal, transactionUuid });

    return res.status(201).json({
      success: true,
      data: { formData, paymentUrl: ESEWA_PAYMENT_URL, orderId: transactionUuid },
    });
  } catch (err: any) {
    logger.error("eSewa initiate error");
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to initiate payment",
    });
  }
};

export const verifyEsewaPaymentCallback = async (req: Request, res: Response) => {
  const { data } = req.query;
  if (!data) return res.status(400).json({ success: false, message: "No payment data received" });

  try {
    const result = await verifyEsewaPayment(data as string);
    if (!result.verified) return res.status(400).json({ success: false, message: "Payment verification failed" });

    const orders = await Order.find({
      "payment.transactionUuid": result.transactionUuid,
      status: "pending_payment",
    });

    if (!orders || orders.length === 0) {
      return res.status(200).json({ success: true, message: "Already processed or not found" });
    }

    let totalAmount = 0;
    const escrowSummary = {
      bookPrice: 0,
      bookSansarCommission: 0,
      vendorReceives: 0,
      riderReceives: 0,
    };

    for (const order of orders) {
      order.status = "payment_received";
      order.payment.transactionCode = result.transactionCode;
      order.payment.verifiedAt = new Date();
      order.statusHistory.push({
        status: "payment_received",
        changedAt: new Date(),
        note: `eSewa transaction ${result.transactionCode}`,
      });
      await order.save();

      totalAmount += order.totalAmount;
      escrowSummary.bookPrice += order.escrow.grossAmount;
      escrowSummary.bookSansarCommission += order.escrow.commissionAmount;
      escrowSummary.vendorReceives += order.escrow.vendorAmount;
      escrowSummary.riderReceives += order.escrow.riderAmount;

      // ── Send notifications ──────────────────────────────────
      try {
        const customerId = order.customerId.toString();
        const vendorDocId = order.items[0]?.vendorId?.toString();
        const bookTitle = order.items[0]?.title || "Book";

        logger.info(`Notification attempt: customerId=${customerId}, vendorDocId=${vendorDocId}`);

        if (customerId && vendorDocId) {
          const vendor = await Vendor.findById(vendorDocId).select("userId").lean();
          logger.info(`Vendor lookup result: ${JSON.stringify(vendor)}`);

          if (vendor?.userId) {
            await notifyOrderPlaced(
              customerId,
              vendor.userId.toString(),
              order.orderId,
              bookTitle
            );
            logger.info(`✅ Order notification sent: customer=${customerId}, vendor=${vendor.userId}`);
          } else {
            logger.warn(`⚠️ Vendor not found for vendorDocId=${vendorDocId}`);
          }
        }
      } catch (notifErr) {
        // ← NEVER crash the main flow
        logger.error(`Failed to send order placed notification: ${notifErr}`);
      }
      // ────────────────────────────────────────────────────────
    }

    // ← return is OUTSIDE the for loop — this was the bug in your version!
    return res.json({
      success: true,
      message: "Payment verified. Order placed successfully.",
      data: {
        orderId: result.transactionUuid,
        totalAmount,
        escrow: escrowSummary,
      },
    });
  } catch (err: any) {
    logger.error("eSewa verification error");
    return res.status(500).json({ success: false, message: "Verification failed" });
  }
};