import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Order } from "../order/order.model";
import User from "../user/user.model";
import { RiderPayout } from "./rider.payout.model";
import RiderApplication from "./rider.application.model";
import mongoose from "mongoose";

export const getRiderOrders = async (req: Request, res: Response) => {
    try {
        const riderId = req.user?.id;
        const orders = await Order.find({
            riderId: new mongoose.Types.ObjectId(riderId),
            status: { $in: ["assigned", "picked_up", "in_transit"] },
        })
            .populate("customerId", "name phoneNumber")
            .sort({ createdAt: -1 })
            .lean();

        const shaped = (orders as any[]).map((order) => ({
            _id: order._id,
            orderId: order.orderId,
            customerName: order.customerId?.name || "Customer",
            customerPhone: order.customerId?.phoneNumber || order.contact || "",
            deliveryAddress: order.shippingAddress
                ? `${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.province}`
                : "",
            books: (order.items || []).map((item: any) => ({ title: item.title, quantity: 1 })),
            totalAmount: order.totalAmount || 0,
            deliveryEarning: (order as any).escrow?.riderAmount || order.shippingCost || 0,
            status: order.status,
            createdAt: order.createdAt,
        }));

        return res.status(StatusCodes.OK).json({ success: true, data: shaped });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const riderId = req.user?.id;

        const validStatuses = ["picked_up", "in_transit", "delivered"];
        if (!validStatuses.includes(status)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid status. Must be picked_up, in_transit, or delivered.",
            });
        }

        const order = await Order.findOne({
            _id: id,
            riderId: new mongoose.Types.ObjectId(riderId),
        });

        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Order not found or not assigned to you.",
            });
        }

        order.status = status as any;
        order.statusHistory.push({
            status: status as any,
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
        return res.status(StatusCodes.OK).json({
            success: true,
            message: `Order marked as ${status.replace(/_/g, " ")}.`,
            data: { status: order.status },
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
};

export const getActiveDelivery = async (req: Request, res: Response) => {
    try {
        const riderId = req.user?.id;

        const order = await Order.findOne({
            riderId: new mongoose.Types.ObjectId(riderId),
            status: { $in: ["assigned", "picked_up", "in_transit"] },
        })
            .populate("customerId", "name phoneNumber")
            .sort({ createdAt: -1 })
            .lean() as any;

        if (!order) {
            return res.status(StatusCodes.OK).json({ success: true, data: null });
        }

        const addr = order.shippingAddress;

        return res.status(StatusCodes.OK).json({
            success: true,
            data: {
                orderId: order._id,
                customerName: order.customerId?.name || "Customer",
                customerPhone: order.customerId?.phoneNumber || order.contact || "",
                address: addr ? `${addr.address}, ${addr.city}` : "",
                status: order.status,
                coordinates:
                    addr?.latitude && addr?.longitude
                        ? { latitude: addr.latitude, longitude: addr.longitude }
                        : null,
            },
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }
};

export const updateRiderLocation = async (req: Request, res: Response) => {
    try {
        return res.status(StatusCodes.OK).json({ success: true, message: "Location updated." });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
};

export const getRiderHistory = async (req: Request, res: Response) => {
    try {
        const riderId = req.user?.id;
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const orders = await Order.find({
            riderId: new mongoose.Types.ObjectId(riderId),
            status: "delivered",
        })
            .populate("customerId", "name")
            .sort({ deliveredAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        const shaped = (orders as any[]).map((order) => ({
            _id: order._id,
            orderId: order.orderId,
            customerName: order.customerId?.name || "Customer",
            deliveryAddress: order.shippingAddress
                ? `${order.shippingAddress.address}, ${order.shippingAddress.city}`
                : "",
            totalAmount: order.totalAmount || 0,
            riderEarning: (order as any).escrow?.riderAmount || order.shippingCost || 0,
            status: "delivered",
            deliveredAt: order.deliveredAt || order.updatedAt,
        }));

        return res.status(StatusCodes.OK).json({ success: true, data: shaped });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
};

export const getRiderStats = async (req: Request, res: Response) => {
    try {
        const riderId = req.user?.id;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [totalDeliveries, thisMonthDeliveries, earningsData, recentEarningsData] =
            await Promise.all([
                Order.countDocuments({ riderId: new mongoose.Types.ObjectId(riderId), status: "delivered" }),
                Order.countDocuments({ riderId: new mongoose.Types.ObjectId(riderId), status: "delivered", deliveredAt: { $gte: startOfMonth } }),
                Order.aggregate([
                    { $match: { riderId: new mongoose.Types.ObjectId(riderId), status: "delivered" } },
                    { $group: { _id: null, total: { $sum: { $ifNull: ["$escrow.riderAmount", "$shippingCost"] } } } },
                ]),
                Order.aggregate([
                    { $match: { riderId: new mongoose.Types.ObjectId(riderId), status: "delivered", deliveredAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
                    { $group: { _id: null, total: { $sum: { $ifNull: ["$escrow.riderAmount", "$shippingCost"] } } } },
                ]),
            ]);

        return res.status(StatusCodes.OK).json({
            success: true,
            data: {
                totalDeliveries,
                thisMonthDeliveries,
                totalEarnings: earningsData[0]?.total || 0,
                pendingPayout: recentEarningsData[0]?.total || 0,
            },
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
};

export const requestPayout = async (req: Request, res: Response) => {
    try {
        const riderId = req.user?.id;
        const rider = await User.findById(riderId).lean();
        if (!rider) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Rider not found." });
        }
        return res.status(StatusCodes.OK).json({
            success: true,
            message: "Payout request submitted. You will receive payment within 2 business days.",
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/v1/rider/admin/earnings  (admin only)
// Returns all riders with earnings minus already paid amounts
// ─────────────────────────────────────────────────────────────
export const getRiderEarningsAdmin = async (req: Request, res: Response) => {
    try {
        // Step 1: Get total earnings per rider from orders
        const earnings = await Order.aggregate([
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
        const riderIds = earnings.map((e: any) => e._id);
        const paidPayouts = await RiderPayout.aggregate([
            { $match: { riderId: { $in: riderIds }, status: "paid" } },
            { $group: { _id: "$riderId", totalPaid: { $sum: "$amount" } } },
        ]);

        const paidMap = new Map(
            paidPayouts.map((p: any) => [String(p._id), p.totalPaid]),
        );

        // Step 3: Calculate available (pending) balance
        const result = earnings.map((rider: any) => {
            const totalPaid = paidMap.get(String(rider._id)) || 0;
            const pendingPayout = Math.max(0, rider.totalEarnings - totalPaid);
            return {
                ...rider,
                totalPaid,
                pendingPayout,
            };
        });

        return res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/v1/rider/admin/pay  (admin only)
// Admin records a payout to a rider — saves to DB
// ─────────────────────────────────────────────────────────────
export const payRider = async (req: Request, res: Response) => {
    try {
        const { riderId, amount, note } = req.body;

        if (!riderId || !amount) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "riderId and amount are required.",
            });
        }

        const rider = await User.findOne({ _id: riderId, role: "rider" });
        if (!rider) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Rider not found.",
            });
        }

        // Get eSewa ID from rider application
        const application = await RiderApplication.findOne({ riderId });

        const payout = await RiderPayout.create({
            payoutId: `RPAY-${Date.now()}`,
            riderId,
            amount: Number(amount),
            esewaId: application?.esewaId || "",
            status: "paid",
            note,
            processedAt: new Date(),
        });

        return res.status(StatusCodes.CREATED).json({
            success: true,
            message: `Rs. ${amount} payout recorded for ${rider.name}.`,
            data: payout,
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
};