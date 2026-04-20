import { Request, Response } from "express";
import { Payout } from "./payout.model";
import Vendor from "../vendor/vendor.model";
import { Order } from "../order/order.model";

export const requestPayout = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { note } = req.body;

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" });
    }

    const existing = await Payout.findOne({
      vendorId: vendor._id,
      status: { $in: ["pending", "processing"] },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending payout request. Wait for it to be processed.",
      });
    }

    // ── ONLY count DELIVERED orders ──────────────────────────
    // Orders in progress (payment_received, confirmed, etc.)
    // are still in escrow — vendor cannot withdraw them yet
    const earningsResult = await Order.aggregate([
      {
        $match: {
          "items.vendorId": vendor._id,
          status: "delivered", // ← only delivered
        },
      },
      {
        $group: {
          _id: null,
          totalGross: { $sum: "$escrow.grossAmount" },
          totalCommission: { $sum: "$escrow.commissionAmount" },
          totalVendor: { $sum: "$escrow.vendorAmount" },
        },
      },
    ]);

    const grossAmount = earningsResult[0]?.totalGross ?? 0;
    const commissionAmount = earningsResult[0]?.totalCommission ?? 0;
    const totalEarned = earningsResult[0]?.totalVendor ?? 0;

    // ── Subtract already paid out amounts ────────────────────
    const alreadyPaidResult = await Payout.aggregate([
      { $match: { vendorId: vendor._id, status: "paid" } },
      { $group: { _id: null, totalPaidOut: { $sum: "$netAmount" } } },
    ]);

    const totalPaidOut = alreadyPaidResult[0]?.totalPaidOut ?? 0;
    const availableBalance = Math.max(0, totalEarned - totalPaidOut);

    if (availableBalance <= 0) {
      return res.status(400).json({
        success: false,
        message: "No available balance. Earnings are released only after orders are delivered.",
      });
    }

    const payoutId = `PAY-${Date.now()}`;
    const payout = await Payout.create({
      payoutId,
      vendorId: vendor._id,
      requestedAmount: grossAmount,
      commissionDeducted: commissionAmount,
      netAmount: availableBalance,
      esewaId: vendor.esewaId,
      status: "pending",
      note,
    });

    return res.status(201).json({
      success: true,
      message: "Payout request submitted successfully.",
      data: payout,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to request payout" });
  }
};

export const getMyPayouts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" });
    }
    const payouts = await Payout.find({ vendorId: vendor._id }).sort({ createdAt: -1 });
    return res.json({ success: true, data: payouts });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch payouts" });
  }
};

export const getAllPayouts = async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter: any = {};
    if (status && status !== "all") filter.status = status;

    const [payouts, total] = await Promise.all([
      Payout.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate({
          path: "vendorId",
          select: "storeName esewaId userId",
          populate: { path: "userId", select: "name email" },
        }),
      Payout.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: payouts,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch payouts" });
  }
};

export const updatePayoutStatus = async (req: Request, res: Response) => {
  try {
    const { payoutId } = req.params;
    const { status, adminNote } = req.body;

    const allowed: string[] = ["processing", "paid", "rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const payout = await Payout.findOne({ payoutId });
    if (!payout) {
      return res.status(404).json({ success: false, message: "Payout not found" });
    }
    if (payout.status === "paid") {
      return res.status(400).json({ success: false, message: "Payout already completed" });
    }

    payout.status = status as any;
    if (adminNote) payout.adminNote = adminNote;
    if (status === "paid") payout.processedAt = new Date();
    await payout.save();

    return res.json({ success: true, message: `Payout marked as ${status}`, data: payout });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to update payout" });
  }
};

export const getPayoutStats = async (_req: Request, res: Response) => {
  try {
    const [byStatus, totals] = await Promise.all([
      Payout.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Payout.aggregate([
        {
          $group: {
            _id: null,
            totalRequested: { $sum: "$netAmount" },
            totalPaid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$netAmount", 0] } },
            totalPending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$netAmount", 0] } },
          },
        },
      ]),
    ]);

    const statusMap = Object.fromEntries(byStatus.map((s: any) => [s._id, s.count]));

    return res.json({
      success: true,
      data: {
        pending: statusMap["pending"] ?? 0,
        processing: statusMap["processing"] ?? 0,
        paid: statusMap["paid"] ?? 0,
        rejected: statusMap["rejected"] ?? 0,
        totalRequested: totals[0]?.totalRequested ?? 0,
        totalPaid: totals[0]?.totalPaid ?? 0,
        totalPending: totals[0]?.totalPending ?? 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch payout stats" });
  }
};