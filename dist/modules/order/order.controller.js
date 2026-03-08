"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderStats = exports.getVendorEarnings = exports.updateOrderStatus = exports.getAllOrdersAdmin = exports.getVendorOrders = exports.getOrderById = exports.getMyOrders = void 0;
const order_model_1 = require("./order.model");
const vendor_model_1 = __importDefault(require("../vendor/vendor.model"));
const getMyOrders = async (req, res) => {
    try {
        const customerId = req.user?.id;
        const orders = await order_model_1.Order.find({ customerId })
            .sort({ createdAt: -1 })
            .select("-statusHistory");
        return res.json({ success: true, data: orders });
    }
    catch (err) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch orders" });
    }
};
exports.getMyOrders = getMyOrders;
const getOrderById = async (req, res) => {
    try {
        const order = await order_model_1.Order.findOne({ orderId: req.params.orderId })
            .populate("customerId", "name email")
            .populate("items.bookId", "title coverImage type")
            .populate("items.vendorId", "storeName");
        if (!order)
            return res
                .status(404)
                .json({ success: false, message: "Order not found" });
        return res.json({ success: true, data: order });
    }
    catch (err) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch order" });
    }
};
exports.getOrderById = getOrderById;
const getVendorOrders = async (req, res) => {
    try {
        const userId = req.user?.id;
        const vendor = await vendor_model_1.default.findOne({ userId });
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: "Vendor profile not found.",
            });
        }
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const filter = { "items.vendorId": vendor._id };
        if (status)
            filter.status = status;
        const [orders, total] = await Promise.all([
            order_model_1.Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate("customerId", "name email")
                .select("-statusHistory"),
            order_model_1.Order.countDocuments(filter),
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
    }
    catch (err) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch vendor orders" });
    }
};
exports.getVendorOrders = getVendorOrders;
const getAllOrdersAdmin = async (req, res) => {
    try {
        const { status, page = 1, limit = 20, search } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (search) {
            filter.$or = [
                { orderId: { $regex: search, $options: "i" } },
                { contact: { $regex: search, $options: "i" } },
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [orders, total] = await Promise.all([
            order_model_1.Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate("customerId", "name email")
                .select("-statusHistory"),
            order_model_1.Order.countDocuments(filter),
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
    }
    catch (err) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch orders" });
    }
};
exports.getAllOrdersAdmin = getAllOrdersAdmin;
const updateOrderStatus = async (req, res) => {
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
        const order = await order_model_1.Order.findOne({ orderId });
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
        order.status = status;
        order.statusHistory.push({
            status: status,
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
    }
    catch (err) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to update order status" });
    }
};
exports.updateOrderStatus = updateOrderStatus;
const getVendorEarnings = async (_req, res) => {
    try {
        const earnings = await order_model_1.Order.aggregate([
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
    }
    catch (err) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch vendor earnings" });
    }
};
exports.getVendorEarnings = getVendorEarnings;
const getOrderStats = async (_req, res) => {
    try {
        const [total, byStatus, revenue] = await Promise.all([
            order_model_1.Order.countDocuments(),
            order_model_1.Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            order_model_1.Order.aggregate([
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
        const statusMap = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
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
    }
    catch (err) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch stats" });
    }
};
exports.getOrderStats = getOrderStats;
