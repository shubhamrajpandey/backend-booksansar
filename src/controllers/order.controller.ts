import { Request, Response } from "express";
import { Order } from "../models/order.model";
import Vendor from "../models/vendor.model";

export const getMyOrders = async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user?.id; // ✅ was user?._id

    const orders = await Order.find({ customerId })
      .sort({ createdAt: -1 })
      .select("-statusHistory");

    return res.json({ success: true, data: orders });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch orders" });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId })
      .populate("customerId", "name email")
      .populate("items.bookId", "title coverImage type")
      .populate("items.vendorId", "storeName");

    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    return res.json({ success: true, data: order });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch order" });
  }
};

export const getVendorOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id; // ✅ was user?._id

    // ✅ Must look up Vendor by userId — items.vendorId stores Vendor._id not User._id
    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not found.",
      });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = { "items.vendorId": vendor._id }; // ✅ now using vendor._id
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("customerId", "name email") // ✅ was missing
        .select("-statusHistory"),
      Order.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch vendor orders" });
  }
};

export const getAllOrdersAdmin = async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("customerId", "name email")
        .select("-statusHistory"),
      Order.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch orders" });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { status, note } = req.body;
    const { orderId } = req.params;

    const allowed = [
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ];
    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const order = await Order.findOne({ orderId });
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    if (["delivered", "refunded"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change a ${order.status} order`,
      });
    }

    order.status = status as any;
    order.statusHistory.push({
      status: status as any,
      changedAt: new Date(),
      note,
    });

    if (status === "delivered" && order.escrow.status === "holding") {
      order.escrow.status = "released";
      order.escrow.releasedAt = new Date();
    }

    if (status === "refunded") {
      order.escrow.status = "refunded";
    }

    await order.save();

    return res.json({
      success: true,
      message: `Order updated to ${status}`,
      data: {
        orderId: order.orderId,
        status: order.status,
        escrowStatus: order.escrow.status,
        vendorAmount: order.escrow.vendorAmount,
        commissionAmount: order.escrow.commissionAmount,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to update order status" });
  }
};

export const getOrderStats = async (_req: Request, res: Response) => {
  try {
    const [total, byStatus, revenue] = await Promise.all([
      Order.countDocuments(),

      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),

      Order.aggregate([
        {
          $match: {
            status: {
              $in: ["payment_received", "confirmed", "shipped", "delivered"],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalCommission: { $sum: "$escrow.commissionAmount" },
            totalPaidOut: { $sum: "$escrow.vendorAmount" },
          },
        },
      ]),
    ]);

    const statusMap = Object.fromEntries(
      byStatus.map((s: any) => [s._id, s.count]),
    );

    return res.json({
      success: true,
      data: {
        total,
        pending: statusMap["pending_payment"] ?? 0,
        paymentReceived: statusMap["payment_received"] ?? 0,
        confirmed: statusMap["confirmed"] ?? 0,
        shipped: statusMap["shipped"] ?? 0,
        delivered: statusMap["delivered"] ?? 0,
        cancelled: statusMap["cancelled"] ?? 0,
        refunded: statusMap["refunded"] ?? 0,
        totalRevenue: revenue[0]?.totalRevenue ?? 0,
        totalCommission: revenue[0]?.totalCommission ?? 0,
        totalPaidOut: revenue[0]?.totalPaidOut ?? 0,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch stats" });
  }
};
