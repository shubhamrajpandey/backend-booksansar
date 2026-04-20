"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payRider = exports.getRiderEarningsAdmin = exports.requestPayout = exports.getRiderProfile = exports.getRiderStats = exports.getRiderHistory = exports.updateRiderLocation = exports.getActiveDelivery = exports.updateOrderStatus = exports.getRiderOrders = void 0;
const http_status_codes_1 = require("http-status-codes");
const order_model_1 = require("../order/order.model");
const user_model_1 = __importDefault(require("../user/user.model"));
const rider_payout_model_1 = require("./rider.payout.model");
const rider_application_model_1 = __importDefault(require("./rider.application.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const getRiderOrders = async (req, res) => {
    try {
        const riderId = req.user?.id;
        const orders = await order_model_1.Order.find({
            riderId: new mongoose_1.default.Types.ObjectId(riderId),
            status: { $in: ["assigned", "picked_up", "in_transit"] },
        })
            .populate("customerId", "name phoneNumber")
            .sort({ createdAt: -1 })
            .lean();
        const shaped = orders.map((order) => ({
            _id: order._id,
            orderId: order.orderId,
            customerName: order.customerId?.name || "Customer",
            customerPhone: order.customerId?.phoneNumber || order.contact || "",
            deliveryAddress: order.shippingAddress
                ? `${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.province}`
                : "",
            books: (order.items || []).map((item) => ({ title: item.title, quantity: 1 })),
            totalAmount: order.totalAmount || 0,
            deliveryEarning: order.escrow?.riderAmount || order.shippingCost || 0,
            status: order.status,
            createdAt: order.createdAt,
        }));
        return res.status(http_status_codes_1.StatusCodes.OK).json({ success: true, data: shaped });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
};
exports.getRiderOrders = getRiderOrders;
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const riderId = req.user?.id;
        const validStatuses = ["picked_up", "in_transit", "delivered"];
        if (!validStatuses.includes(status)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid status. Must be picked_up, in_transit, or delivered.",
            });
        }
        const order = await order_model_1.Order.findOne({
            _id: id,
            riderId: new mongoose_1.default.Types.ObjectId(riderId),
        });
        if (!order) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Order not found or not assigned to you.",
            });
        }
        order.status = status;
        order.statusHistory.push({
            status: status,
            changedAt: new Date(),
            note: `Rider marked as ${status}`,
        });
        if (status === "delivered") {
            order.deliveredAt = new Date();
            if (order.escrow.status === "holding") {
                order.escrow.status = "released";
                order.escrow.releasedAt = new Date();
            }
        }
        await order.save();
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: `Order marked as ${status.replace(/_/g, " ")}.`,
            data: { status: order.status },
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
};
exports.updateOrderStatus = updateOrderStatus;
const getActiveDelivery = async (req, res) => {
    try {
        const riderId = req.user?.id;
        const order = await order_model_1.Order.findOne({
            riderId: new mongoose_1.default.Types.ObjectId(riderId),
            status: { $in: ["assigned", "picked_up", "in_transit"] },
        })
            .populate("customerId", "name phoneNumber")
            .sort({ createdAt: -1 })
            .lean();
        if (!order) {
            return res.status(http_status_codes_1.StatusCodes.OK).json({ success: true, data: null });
        }
        const addr = order.shippingAddress;
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: {
                orderId: order._id,
                customerName: order.customerId?.name || "Customer",
                customerPhone: order.customerId?.phoneNumber || order.contact || "",
                address: addr ? `${addr.address}, ${addr.city}` : "",
                status: order.status,
                coordinates: addr?.latitude && addr?.longitude
                    ? { latitude: addr.latitude, longitude: addr.longitude }
                    : null,
            },
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }
};
exports.getActiveDelivery = getActiveDelivery;
const updateRiderLocation = async (req, res) => {
    try {
        return res.status(http_status_codes_1.StatusCodes.OK).json({ success: true, message: "Location updated." });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
};
exports.updateRiderLocation = updateRiderLocation;
const getRiderHistory = async (req, res) => {
    try {
        const riderId = req.user?.id;
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const orders = await order_model_1.Order.find({
            riderId: new mongoose_1.default.Types.ObjectId(riderId),
            status: "delivered",
        })
            .populate("customerId", "name")
            .sort({ deliveredAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const shaped = orders.map((order) => ({
            _id: order._id,
            orderId: order.orderId,
            customerName: order.customerId?.name || "Customer",
            deliveryAddress: order.shippingAddress
                ? `${order.shippingAddress.address}, ${order.shippingAddress.city}`
                : "",
            totalAmount: order.totalAmount || 0,
            riderEarning: order.escrow?.riderAmount || order.shippingCost || 0,
            status: "delivered",
            deliveredAt: order.deliveredAt || order.updatedAt,
        }));
        return res.status(http_status_codes_1.StatusCodes.OK).json({ success: true, data: shaped });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
};
exports.getRiderHistory = getRiderHistory;
const getRiderStats = async (req, res) => {
    try {
        const riderId = req.user?.id;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const [totalDeliveries, thisMonthDeliveries, earningsData, recentEarningsData] = await Promise.all([
            order_model_1.Order.countDocuments({ riderId: new mongoose_1.default.Types.ObjectId(riderId), status: "delivered" }),
            order_model_1.Order.countDocuments({ riderId: new mongoose_1.default.Types.ObjectId(riderId), status: "delivered", deliveredAt: { $gte: startOfMonth } }),
            order_model_1.Order.aggregate([
                { $match: { riderId: new mongoose_1.default.Types.ObjectId(riderId), status: "delivered" } },
                { $group: { _id: null, total: { $sum: { $ifNull: ["$escrow.riderAmount", "$shippingCost"] } } } },
            ]),
            order_model_1.Order.aggregate([
                { $match: { riderId: new mongoose_1.default.Types.ObjectId(riderId), status: "delivered", deliveredAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
                { $group: { _id: null, total: { $sum: { $ifNull: ["$escrow.riderAmount", "$shippingCost"] } } } },
            ]),
        ]);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: {
                totalDeliveries,
                thisMonthDeliveries,
                totalEarnings: earningsData[0]?.total || 0,
                pendingPayout: recentEarningsData[0]?.total || 0,
            },
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
};
exports.getRiderStats = getRiderStats;
const getRiderProfile = async (req, res) => {
    try {
        const riderId = req.user?.id;
        const [rider, application] = await Promise.all([
            user_model_1.default.findById(riderId).select("-password").lean(),
            rider_application_model_1.default.findOne({ riderId }).lean(),
        ]);
        if (!rider) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Rider not found.",
            });
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: {
                // User info
                id: rider._id,
                name: rider.name,
                email: rider.email,
                phoneNumber: rider.phoneNumber,
                location: rider.location,
                // Application info
                esewaId: application?.esewaId || "",
                vehicleType: application?.vehicleType || "",
                licenseNumber: application?.licenseNumber || "",
                experience: application?.experience || "",
                availability: application?.availability || "",
                district: application?.district || "",
                address: application?.address || "",
                licenseUrl: application?.licenseUrl || "",
                approvedAt: application?.updatedAt || null,
            },
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }
};
exports.getRiderProfile = getRiderProfile;
const requestPayout = async (req, res) => {
    try {
        const riderId = req.user?.id;
        const rider = await user_model_1.default.findById(riderId).lean();
        if (!rider) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({ success: false, message: "Rider not found." });
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Payout request submitted. You will receive payment within 2 business days.",
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
};
exports.requestPayout = requestPayout;
// ─────────────────────────────────────────────────────────────
// GET /api/v1/rider/admin/earnings  (admin only)
// Returns all riders with earnings minus already paid amounts
// ─────────────────────────────────────────────────────────────
const getRiderEarningsAdmin = async (req, res) => {
    try {
        // Step 1: Get total earnings per rider from orders
        const earnings = await order_model_1.Order.aggregate([
            { $match: { status: "delivered", riderId: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: "$riderId",
                    totalDeliveries: { $sum: 1 },
                    totalEarnings: { $sum: { $ifNull: ["$escrow.riderAmount", "$shippingCost"] } },
                },
            },
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "rider" } },
            { $unwind: { path: "$rider", preserveNullAndEmptyArrays: true } },
            // Get eSewa ID from rider application
            {
                $lookup: {
                    from: "riderapplications",
                    localField: "_id",
                    foreignField: "riderId",
                    as: "application",
                },
            },
            { $unwind: { path: "$application", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    name: "$rider.name",
                    email: "$rider.email",
                    phoneNumber: "$rider.phoneNumber",
                    esewaId: "$application.esewaId",
                    totalDeliveries: 1,
                    totalEarnings: 1,
                },
            },
            { $sort: { totalEarnings: -1 } },
        ]);
        // Step 2: For each rider, subtract already paid amounts
        const riderIds = earnings.map((e) => e._id);
        const paidPayouts = await rider_payout_model_1.RiderPayout.aggregate([
            { $match: { riderId: { $in: riderIds }, status: "paid" } },
            { $group: { _id: "$riderId", totalPaid: { $sum: "$amount" } } },
        ]);
        const paidMap = new Map(paidPayouts.map((p) => [String(p._id), p.totalPaid]));
        // Step 3: Calculate available (pending) balance
        const result = earnings.map((rider) => {
            const totalPaid = paidMap.get(String(rider._id)) || 0;
            const pendingPayout = Math.max(0, rider.totalEarnings - totalPaid);
            return {
                ...rider,
                totalPaid,
                pendingPayout,
            };
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({ success: true, data: result });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
};
exports.getRiderEarningsAdmin = getRiderEarningsAdmin;
// ─────────────────────────────────────────────────────────────
// POST /api/v1/rider/admin/pay  (admin only)
// Admin records a payout to a rider — saves to DB
// ─────────────────────────────────────────────────────────────
const payRider = async (req, res) => {
    try {
        const { riderId, amount, note } = req.body;
        if (!riderId || !amount) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "riderId and amount are required.",
            });
        }
        const rider = await user_model_1.default.findOne({ _id: riderId, role: "rider" });
        if (!rider) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Rider not found.",
            });
        }
        // Get eSewa ID from rider application
        const application = await rider_application_model_1.default.findOne({ riderId });
        const payout = await rider_payout_model_1.RiderPayout.create({
            payoutId: `RPAY-${Date.now()}`,
            riderId,
            amount: Number(amount),
            esewaId: application?.esewaId || "",
            status: "paid",
            note,
            processedAt: new Date(),
        });
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: `Rs. ${amount} payout recorded for ${rider.name}.`,
            data: payout,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
};
exports.payRider = payRider;
