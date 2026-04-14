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

    const uniqueVendorIds = [
      ...new Set(resolvedItems.map((i: any) => String(i.vendorId))),
    ];

    if (uniqueVendorIds.length > 1) {
      return res.status(400).json({
        success: false,
        message:
          "Your cart contains books from multiple vendors. Please checkout books from one vendor at a time for correct payment processing.",
        data: {
          vendorCount: uniqueVendorIds.length,
          hint: "Remove books from other vendors and checkout separately.",
        },
      });
    }

    const verifiedSubtotal = resolvedItems.reduce(
      (sum: number, i: any) => sum + i.price, 0,
    );
    const verifiedShippingCost = shippingCost ?? 0;
    const verifiedTotal = verifiedSubtotal + verifiedShippingCost;
    const transactionUuid = `BS-${Date.now()}`;
    const escrow = calculateEscrow(verifiedSubtotal, verifiedShippingCost);

    const order = new Order({
      orderId: transactionUuid,
      customerId,
      contact,
      items: resolvedItems,
      shippingAddress,
      shippingMethod: shippingMethod || "standard",
      shippingCost: verifiedShippingCost,
      subtotal: verifiedSubtotal,
      totalAmount: verifiedTotal,
      status: "pending_payment",
      payment: { method: "esewa", transactionUuid },
      escrow: { status: "holding", ...escrow },
      statusHistory: [{ status: "pending_payment", changedAt: new Date() }],
    });

    await order.save();

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

  if (!data) {
    return res.status(400).json({ success: false, message: "No payment data received" });
  }

  try {
    const result = await verifyEsewaPayment(data as string);

    if (!result.verified) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const order = await Order.findOneAndUpdate(
      { orderId: result.transactionUuid, status: "pending_payment" },
      {
        status: "payment_received",
        "payment.transactionCode": result.transactionCode,
        "payment.verifiedAt": new Date(),
        $push: {
          statusHistory: {
            status: "payment_received",
            changedAt: new Date(),
            note: `eSewa transaction ${result.transactionCode}`,
          },
        },
      },
      { new: true },
    );

    if (!order) {
      return res.status(200).json({ success: true, message: "Already processed" });
    }

    return res.json({
      success: true,
      message: "Payment verified. Order placed successfully.",
      data: {
        orderId: order.orderId,
        totalAmount: order.totalAmount,
        escrow: {
          bookPrice: order.escrow.grossAmount,
          bookSansarCommission: order.escrow.commissionAmount,
          vendorReceives: order.escrow.vendorAmount,
          riderReceives: (order.escrow as any).riderAmount ?? 0,
        },
      },
    });
  } catch (err: any) {
    logger.error("eSewa verification error");
    return res.status(500).json({ success: false, message: "Verification failed" });
  }
};