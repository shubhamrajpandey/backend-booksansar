import { Request, Response } from "express";
import { Order } from "./order.model";
import Vendor from "../vendor/vendor.model";

export const SHIPPING_RATES = {
  insideValley: 80,
  outsideValley: 150,
  free: 0,
} as const;

export const getShippingPreview = async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user?.id;
    const isInsideValley = req.query.insideValley === "true";

    const previousOrderCount = await Order.countDocuments({
      customerId,
      status: { $nin: ["cancelled", "pending_payment"] },
    });

    const isFirstOrder = previousOrderCount === 0;

    const shippingCost = isFirstOrder
      ? SHIPPING_RATES.free
      : isInsideValley
        ? SHIPPING_RATES.insideValley
        : SHIPPING_RATES.outsideValley;

    return res.json({
      success: true,
      data: {
        isFirstOrder,
        shippingCost,
        insideValleyRate: SHIPPING_RATES.insideValley,
        outsideValleyRate: SHIPPING_RATES.outsideValley,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch shipping info" });
  }
};

export const getMyOrders = async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user?.id;

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
    const userId = (req as any).user?.id;

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not found.",
      });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = { "items.vendorId": vendor._id };
    if (status) filter.status = status;

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

export const getVendorEarnings = async (_req: Request, res: Response) => {
  try {
    const earnings = await Order.aggregate([
      {
        $match: {
          status: {
            $in: [
              "payment_received",
              "confirmed",
              "shipped",
              "delivered",
              "refunded",
            ],
          },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.vendorId",
          totalOrders: { $addToSet: "$_id" },
          grossAmount: { $sum: "$escrow.grossAmount" },
          commissionAmount: { $sum: "$escrow.commissionAmount" },
          vendorAmount: { $sum: "$escrow.vendorAmount" },
          releasedAmount: {
            $sum: {
              $cond: [
                { $eq: ["$escrow.status", "released"] },
                "$escrow.vendorAmount",
                0,
              ],
            },
          },
          holdingAmount: {
            $sum: {
              $cond: [
                { $eq: ["$escrow.status", "holding"] },
                "$escrow.vendorAmount",
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "vendors",
          localField: "_id",
          foreignField: "_id",
          as: "vendor",
        },
      },
      { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "vendor.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          storeName: "$vendor.storeName",
          esewaId: "$vendor.esewaId",
          ownerName: "$user.name",
          ownerEmail: "$user.email",
          totalOrders: { $size: "$totalOrders" },
          grossAmount: 1,
          commissionAmount: 1,
          vendorAmount: 1,
          releasedAmount: 1,
          holdingAmount: 1,
        },
      },
      { $sort: { grossAmount: -1 } },
    ]);

    return res.json({ success: true, data: earnings });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch vendor earnings" });
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
