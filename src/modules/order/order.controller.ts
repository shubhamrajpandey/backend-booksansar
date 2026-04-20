import { Request, Response } from "express";
import { Order } from "./order.model";
import Vendor from "../vendor/vendor.model";
import User from "../user/user.model";
import { Payout } from "../payout/payout.model";

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
    return res.status(500).json({ success: false, message: "Failed to fetch shipping info" });
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
    return res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId })
      .populate("customerId", "name email")
      .populate("items.bookId", "title coverImage type")
      .populate("items.vendorId", "storeName")
      .populate("riderId", "name phoneNumber");

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    return res.json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch order" });
  }
};

export const getVendorOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const vendor = await Vendor.findOne({ userId });
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor profile not found." });

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = { "items.vendorId": vendor._id };
    if (status && status !== "all") filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("customerId", "name email")
        .populate("riderId", "name phoneNumber")
        .select("-statusHistory"),
      Order.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: orders,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch vendor orders" });
  }
};

export const assignRiderToOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { orderId } = req.params;
    const { riderId } = req.body;

    if (!riderId) {
      return res.status(400).json({ success: false, message: "riderId is required" });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    const order = await Order.findOne({ orderId, "items.vendorId": vendor._id });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (!["confirmed", "payment_received"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot assign rider to an order with status: ${order.status}`,
      });
    }

    const rider = await User.findOne({ _id: riderId, role: "rider", accountStatus: "active" });
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found or not active" });

    order.riderId = rider._id as any;
    order.status = "assigned";
    order.statusHistory.push({
      status: "assigned",
      changedAt: new Date(),
      note: `Assigned to rider: ${rider.name}`,
    });
    await order.save();

    return res.status(200).json({
      success: true,
      message: `Order assigned to ${rider.name} successfully.`,
      data: {
        orderId: order.orderId,
        status: order.status,
        rider: { id: rider._id, name: rider.name, phone: rider.phoneNumber },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getAvailableRiders = async (req: Request, res: Response) => {
  try {
    const riders = await User.find({ role: "rider" })
      .select("name phoneNumber location")
      .lean();
    return res.status(200).json({ success: true, data: riders });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllOrdersAdmin = async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
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
        .populate("riderId", "name phoneNumber")
        .select("-statusHistory"),
      Order.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      data: orders,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { status, note } = req.body;
    const { orderId } = req.params;

    const allowed = ["confirmed", "shipped", "delivered", "cancelled", "refunded"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (["delivered", "refunded"].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot change a ${order.status} order` });
    }

    order.status = status as any;
    order.statusHistory.push({ status: status as any, changedAt: new Date(), note });

    if (status === "delivered") {
      order.deliveredAt = new Date();
      if (order.escrow.status === "holding") {
        order.escrow.status = "released";
        order.escrow.releasedAt = new Date();
      }
    }
    if (status === "refunded") order.escrow.status = "refunded";

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
    return res.status(500).json({ success: false, message: "Failed to update order status" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/v1/orders/admin/vendor-earnings
// FIXED:
//   1. Added all new statuses (assigned, picked_up, in_transit)
//   2. Removed $unwind "$items" — it caused duplicate escrow sums
//   3. Group by order-level escrow, not per-item
//   4. releasedAmount = escrow.status "released" (delivered orders)
//   5. holdingAmount  = escrow.status "holding"  (in-progress orders)
// ─────────────────────────────────────────────────────────────
export const getVendorEarnings = async (_req: Request, res: Response) => {
  try {
    const earnings = await Order.aggregate([
      {
        // ── Include ALL active order statuses ──────────────────
        $match: {
          status: {
            $in: [
              "payment_received",
              "confirmed",
              "assigned",       // ← was missing
              "picked_up",      // ← was missing
              "in_transit",     // ← was missing
              "shipped",
              "delivered",
              "refunded",
            ],
          },
        },
      },
      // ── Do NOT unwind items — group at order level ──────────
      // Each order has ONE vendor so we read vendorId from first item
      {
        $group: {
          _id: { $arrayElemAt: ["$items.vendorId", 0] }, // first item's vendorId
          totalOrders: { $addToSet: "$_id" },
          grossAmount: { $sum: "$escrow.grossAmount" },
          commissionAmount: { $sum: "$escrow.commissionAmount" },
          vendorAmount: { $sum: "$escrow.vendorAmount" },
          // Released = delivered orders (escrow unlocked)
          releasedAmount: {
            $sum: {
              $cond: [
                { $eq: ["$escrow.status", "released"] },
                "$escrow.vendorAmount",
                0,
              ],
            },
          },
          // Holding = in-progress orders (escrow still locked)
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
    return res.status(500).json({ success: false, message: "Failed to fetch vendor earnings" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/v1/orders/admin/stats
// FIXED:
//   1. Added all new statuses to revenue match
//   2. totalPaidOut now reads from ACTUAL paid payouts (Payout model)
//      not from escrow.vendorAmount (which is what vendors are owed,
//      not what was actually sent to them via eSewa)
// ─────────────────────────────────────────────────────────────
export const getOrderStats = async (_req: Request, res: Response) => {
  try {
    const [total, byStatus, revenue, actualPayouts] = await Promise.all([
      Order.countDocuments(),

      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),

      // Revenue from all active orders
      Order.aggregate([
        {
          $match: {
            status: {
              $in: [
                "payment_received",
                "confirmed",
                "assigned",
                "picked_up",
                "in_transit",
                "shipped",
                "delivered",
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalCommission: { $sum: "$escrow.commissionAmount" },
            // This is what vendors are OWED (not what was paid)
            totalVendorOwed: { $sum: "$escrow.vendorAmount" },
          },
        },
      ]),

      // ── Actual payouts sent to vendors via eSewa ──────────────
      Payout.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, totalPaidOut: { $sum: "$netAmount" } } },
      ]),
    ]);

    const statusMap = Object.fromEntries(byStatus.map((s: any) => [s._id, s.count]));

    return res.json({
      success: true,
      data: {
        total,
        pending: statusMap["pending_payment"] ?? 0,
        paymentReceived: statusMap["payment_received"] ?? 0,
        confirmed: statusMap["confirmed"] ?? 0,
        assigned: statusMap["assigned"] ?? 0,
        pickedUp: statusMap["picked_up"] ?? 0,
        inTransit: statusMap["in_transit"] ?? 0,
        shipped: statusMap["shipped"] ?? 0,
        delivered: statusMap["delivered"] ?? 0,
        cancelled: statusMap["cancelled"] ?? 0,
        refunded: statusMap["refunded"] ?? 0,
        totalRevenue: revenue[0]?.totalRevenue ?? 0,
        totalCommission: revenue[0]?.totalCommission ?? 0,
        // What vendors are owed from escrow (delivered orders)
        totalPaidOut: revenue[0]?.totalVendorOwed ?? 0,
        // What was actually sent to vendors via eSewa
        actuallyPaidToVendors: actualPayouts[0]?.totalPaidOut ?? 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
};