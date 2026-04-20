"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayoutStats = exports.updatePayoutStatus = exports.getAllPayouts = exports.getMyPayouts = exports.requestPayout = void 0;
const payout_model_1 = require("./payout.model");
const vendor_model_1 = __importDefault(require("../vendor/vendor.model"));
const order_model_1 = require("../order/order.model");
const requestPayout = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { note } = req.body;
        const vendor = await vendor_model_1.default.findOne({ userId });
        if (!vendor) {
            return res.status(404).json({ success: false, message: "Vendor profile not found" });
        }
        const existing = await payout_model_1.Payout.findOne({
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
        const earningsResult = await order_model_1.Order.aggregate([
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
        const alreadyPaidResult = await payout_model_1.Payout.aggregate([
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
        const payout = await payout_model_1.Payout.create({
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
    }
    catch (err) {
        return res.status(500).json({ success: false, message: "Failed to request payout" });
    }
};
exports.requestPayout = requestPayout;
const getMyPayouts = async (req, res) => {
    try {
        const userId = req.user?.id;
        const vendor = await vendor_model_1.default.findOne({ userId });
        if (!vendor) {
            return res.status(404).json({ success: false, message: "Vendor profile not found" });
        }
        const payouts = await payout_model_1.Payout.find({ vendorId: vendor._id }).sort({ createdAt: -1 });
        return res.json({ success: true, data: payouts });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: "Failed to fetch payouts" });
    }
};
exports.getMyPayouts = getMyPayouts;
const getAllPayouts = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const filter = {};
        if (status && status !== "all")
            filter.status = status;
        const [payouts, total] = await Promise.all([
            payout_model_1.Payout.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate({
                path: "vendorId",
                select: "storeName esewaId userId",
                populate: { path: "userId", select: "name email" },
            }),
            payout_model_1.Payout.countDocuments(filter),
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
    }
    catch (err) {
        return res.status(500).json({ success: false, message: "Failed to fetch payouts" });
    }
};
exports.getAllPayouts = getAllPayouts;
const updatePayoutStatus = async (req, res) => {
    try {
        const { payoutId } = req.params;
        const { status, adminNote } = req.body;
        const allowed = ["processing", "paid", "rejected"];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }
        const payout = await payout_model_1.Payout.findOne({ payoutId });
        if (!payout) {
            return res.status(404).json({ success: false, message: "Payout not found" });
        }
        if (payout.status === "paid") {
            return res.status(400).json({ success: false, message: "Payout already completed" });
        }
        payout.status = status;
        if (adminNote)
            payout.adminNote = adminNote;
        if (status === "paid")
            payout.processedAt = new Date();
        await payout.save();
        return res.json({ success: true, message: `Payout marked as ${status}`, data: payout });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: "Failed to update payout" });
    }
};
exports.updatePayoutStatus = updatePayoutStatus;
const getPayoutStats = async (_req, res) => {
    try {
        const [byStatus, totals] = await Promise.all([
            payout_model_1.Payout.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            payout_model_1.Payout.aggregate([
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
        const statusMap = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
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
    }
    catch (err) {
        return res.status(500).json({ success: false, message: "Failed to fetch payout stats" });
    }
};
exports.getPayoutStats = getPayoutStats;
