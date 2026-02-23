import { Request, Response } from "express";
import {
  buildEsewaFormData,
  verifyEsewaPayment,
  ESEWA_PAYMENT_URL,
} from "../services/esewa.service";
import { calculateEscrow } from "../services/escrow.service";
import { Order } from "../models/order.model";
import Book from "../models/book.model";

export const initiateEsewaPayment = async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user?._id;
    if (!customerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      items,
      contact,
      shippingAddress,
      shippingMethod,
      shippingCost,
      subtotal,
      totalAmount,
    } = req.body;

    if (!items?.length) {
      return res
        .status(400)
        .json({ success: false, message: "No items in order" });
    }

    const bookIds = items.map((i: any) => i.bookId);
    const books = await Book.find({ _id: { $in: bookIds } }).lean();

    const bookMap = new Map(books.map((b) => [String(b._id), b]));

    const resolvedItems = items.map((item: any) => {
      const book = bookMap.get(String(item.bookId));
      if (!book) throw new Error(`Book ${item.bookId} not found`);

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

    const verifiedSubtotal = resolvedItems.reduce(
      (sum: number, i: any) => sum + i.price,
      0,
    );
    const verifiedShipping = shippingMethod === "express" ? 150 : 0;
    const verifiedTotal = verifiedSubtotal + verifiedShipping;

    const transactionUuid = `BS-${Date.now()}`;
    const escrow = calculateEscrow(verifiedTotal);

    const order = new Order({
      orderId: transactionUuid,
      customerId,
      contact,
      items: resolvedItems,
      shippingAddress,
      shippingMethod: shippingMethod || "standard",
      shippingCost: verifiedShipping,
      subtotal: verifiedSubtotal,
      totalAmount: verifiedTotal,
      status: "pending_payment",
      payment: {
        method: "esewa",
        transactionUuid,
      },
      escrow: {
        status: "holding",
        ...escrow,
      },
      statusHistory: [{ status: "pending_payment", changedAt: new Date() }],
    });

    await order.save();

    const formData = buildEsewaFormData({
      amount: verifiedTotal,
      transactionUuid,
    });

    return res.status(201).json({
      success: true,
      data: {
        formData,
        paymentUrl: ESEWA_PAYMENT_URL,
        orderId: transactionUuid,
      },
    });
  } catch (err: any) {
    console.error("eSewa initiate error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to initiate payment",
    });
  }
};

export const verifyEsewaPaymentCallback = async (
  req: Request,
  res: Response,
) => {
  const { data } = req.query;

  if (!data) {
    return res
      .status(400)
      .json({ success: false, message: "No payment data received" });
  }

  try {
    const result = await verifyEsewaPayment(data as string);

    if (!result.verified) {
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }

    const order = await Order.findOneAndUpdate(
      {
        orderId: result.transactionUuid,
        status: "pending_payment",
      },
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
      return res
        .status(200)
        .json({ success: true, message: "Already processed" });
    }

    return res.json({
      success: true,
      message: "Payment verified. Order placed successfully.",
      data: {
        orderId: order.orderId,
        totalAmount: order.totalAmount,
        escrow: order.escrow,
      },
    });
  } catch (err: any) {
    console.error("eSewa verification error:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Verification failed" });
  }
};
