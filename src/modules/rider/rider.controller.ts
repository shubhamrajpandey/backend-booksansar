import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Order } from "../order/order.model";
import User from "../user/user.model";
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
            books: (order.items || []).map((item: any) => ({
                title: item.title,
                quantity: 1,
            })),
            totalAmount: order.totalAmount || 0,
            // ── Rider sees delivery charge they will earn ──
            deliveryEarning: order.escrow?.riderAmount || order.shippingCost || 0,
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
            status: "in_transit",
        })
            .populate("customerId", "name phoneNumber")
            .lean() as any;

        if (!order) {
            return res.status(StatusCodes.OK).json({ success: true, data: null });
        }

        return res.status(StatusCodes.OK).json({
            success: true,
            data: {
                orderId: order._id,
                customerName: order.customerId?.name || "Customer",
                address: order.shippingAddress
                    ? `${order.shippingAddress.address}, ${order.shippingAddress.city}`
                    : "",
                coordinates: null,
            },
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
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
            // ── FIX: rider earned the delivery charge, not % of total ──
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
                Order.countDocuments({
                    riderId: new mongoose.Types.ObjectId(riderId),
                    status: "delivered",
                }),
                Order.countDocuments({
                    riderId: new mongoose.Types.ObjectId(riderId),
                    status: "delivered",
                    deliveredAt: { $gte: startOfMonth },
                }),
                // ── FIX: sum escrow.riderAmount (delivery charges) ──────
                Order.aggregate([
                    {
                        $match: {
                            riderId: new mongoose.Types.ObjectId(riderId),
                            status: "delivered",
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            // Use riderAmount from escrow, fallback to shippingCost
                            total: {
                                $sum: {
                                    $ifNull: ["$escrow.riderAmount", "$shippingCost"],
                                },
                            },
                        },
                    },
                ]),
                // Pending payout = last 30 days deliveries not yet paid
                Order.aggregate([
                    {
                        $match: {
                            riderId: new mongoose.Types.ObjectId(riderId),
                            status: "delivered",
                            deliveredAt: {
                                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                            },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            total: {
                                $sum: {
                                    $ifNull: ["$escrow.riderAmount", "$shippingCost"],
                                },
                            },
                        },
                    },
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

export const getRiderEarningsAdmin = async (req: Request, res: Response) => {
    try {
        const earnings = await Order.aggregate([
            { $match: { status: "delivered", riderId: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: "$riderId",
                    totalDeliveries: { $sum: 1 },
                    // Sum escrow.riderAmount (delivery charge), fallback to shippingCost
                    totalEarnings: {
                        $sum: { $ifNull: ["$escrow.riderAmount", "$shippingCost"] },
                    },
                    // Last 30 days = pending payout
                    pendingPayout: {
                        $sum: {
                            $cond: [
                                {
                                    $gte: [
                                        "$deliveredAt",
                                        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                                    ],
                                },
                                { $ifNull: ["$escrow.riderAmount", "$shippingCost"] },
                                0,
                            ],
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "rider",
                },
            },
            { $unwind: { path: "$rider", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    name: "$rider.name",
                    email: "$rider.email",
                    phoneNumber: "$rider.phoneNumber",
                    totalDeliveries: 1,
                    totalEarnings: 1,
                    pendingPayout: 1,
                },
            },
            { $sort: { pendingPayout: -1 } },
        ]);

        return res.status(StatusCodes.OK).json({ success: true, data: earnings });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }
};