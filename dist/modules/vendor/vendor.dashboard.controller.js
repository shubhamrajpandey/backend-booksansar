"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVendorPDFPerformance = exports.getVendorTopBooks = exports.getVendorOrderStatus = exports.getVendorSalesChart = exports.getVendorDashboardStats = void 0;
const http_status_codes_1 = require("http-status-codes");
const book_model_1 = __importDefault(require("../book/book.model"));
const order_model_1 = require("../order/order.model");
const vendor_model_1 = __importDefault(require("./vendor.model"));
const mongoose_1 = __importDefault(require("mongoose"));
// GET /vendor/dashboard/stats
const getVendorDashboardStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        // Get vendor
        const vendor = await vendor_model_1.default.findOne({ userId });
        if (!vendor) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Vendor not found",
            });
        }
        const vendorId = vendor._id;
        // Calculate date ranges
        const today = new Date();
        const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        // 1. Total Books Listed
        const totalBooks = await book_model_1.default.countDocuments({
            uploader: userId,
            visibility: { $in: ["public", "pending"] },
        });
        const lastMonthBooks = await book_model_1.default.countDocuments({
            uploader: userId,
            visibility: { $in: ["public", "pending"] },
            createdAt: { $gte: firstDayLastMonth, $lte: lastDayLastMonth },
        });
        const thisMonthBooks = await book_model_1.default.countDocuments({
            uploader: userId,
            visibility: { $in: ["public", "pending"] },
            createdAt: { $gte: firstDayThisMonth },
        });
        const booksTrend = lastMonthBooks > 0
            ? Math.round(((thisMonthBooks - lastMonthBooks) / lastMonthBooks) * 100)
            : 0;
        // 2. Active Orders (Pending + Confirmed)
        const activeOrders = await order_model_1.Order.countDocuments({
            "items.vendorId": vendorId,
            status: { $in: ["pending", "confirmed", "processing"] },
        });
        const lastMonthActiveOrders = await order_model_1.Order.countDocuments({
            "items.vendorId": vendorId,
            status: { $in: ["pending", "confirmed", "processing"] },
            createdAt: { $gte: firstDayLastMonth, $lte: lastDayLastMonth },
        });
        const thisMonthActiveOrders = await order_model_1.Order.countDocuments({
            "items.vendorId": vendorId,
            status: { $in: ["pending", "confirmed", "processing"] },
            createdAt: { $gte: firstDayThisMonth },
        });
        const activeOrdersTrend = lastMonthActiveOrders > 0
            ? Math.round(((thisMonthActiveOrders - lastMonthActiveOrders) /
                lastMonthActiveOrders) *
                100)
            : 0;
        // 3. Monthly Revenue (commission deducted - vendor's net)
        const monthlyRevenueResult = await order_model_1.Order.aggregate([
            {
                $match: {
                    "items.vendorId": vendorId,
                    status: "delivered",
                    createdAt: { $gte: firstDayThisMonth },
                },
            },
            {
                $unwind: "$items",
            },
            {
                $match: {
                    "items.vendorId": vendorId,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$items.price" },
                },
            },
        ]);
        const monthlyRevenue = monthlyRevenueResult[0]?.total || 0;
        const vendorEarnings = monthlyRevenue * 0.88; // 12% platform fee
        const lastMonthRevenueResult = await order_model_1.Order.aggregate([
            {
                $match: {
                    "items.vendorId": vendorId,
                    status: "delivered",
                    createdAt: { $gte: firstDayLastMonth, $lte: lastDayLastMonth },
                },
            },
            {
                $unwind: "$items",
            },
            {
                $match: {
                    "items.vendorId": vendorId,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$items.price" },
                },
            },
        ]);
        const lastMonthRevenue = (lastMonthRevenueResult[0]?.total || 0) * 0.88;
        const revenueTrend = lastMonthRevenue > 0
            ? Math.round(((vendorEarnings - lastMonthRevenue) / lastMonthRevenue) * 100)
            : 0;
        // 4. Pending Deliveries
        const pendingDeliveries = await order_model_1.Order.countDocuments({
            "items.vendorId": vendorId,
            status: { $in: ["confirmed", "processing"] },
        });
        // 5. Free PDFs Uploaded
        const freePdfs = await book_model_1.default.countDocuments({
            uploader: userId,
            type: "free",
            visibility: "public",
        });
        const lastMonthFreePdfs = await book_model_1.default.countDocuments({
            uploader: userId,
            type: "free",
            visibility: "public",
            createdAt: { $gte: firstDayLastMonth, $lte: lastDayLastMonth },
        });
        const thisMonthFreePdfs = await book_model_1.default.countDocuments({
            uploader: userId,
            type: "free",
            visibility: "public",
            createdAt: { $gte: firstDayThisMonth },
        });
        const pdfsTrend = lastMonthFreePdfs > 0
            ? Math.round(((thisMonthFreePdfs - lastMonthFreePdfs) / lastMonthFreePdfs) * 100)
            : 0;
        // 6. Average Rating
        const ratingResult = await book_model_1.default.aggregate([
            {
                $match: {
                    uploader: new mongoose_1.default.Types.ObjectId(userId),
                    visibility: "public",
                },
            },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: "$rating" },
                },
            },
        ]);
        const averageRating = ratingResult[0]?.avgRating || 0;
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: {
                totalBooks: {
                    value: totalBooks,
                    trend: booksTrend,
                },
                activeOrders: {
                    value: activeOrders,
                    trend: activeOrdersTrend,
                },
                monthlyRevenue: {
                    value: Math.round(vendorEarnings),
                    trend: revenueTrend,
                },
                pendingDeliveries: {
                    value: pendingDeliveries,
                    trend: 0,
                },
                freePdfs: {
                    value: freePdfs,
                    trend: pdfsTrend,
                },
                averageRating: {
                    value: averageRating.toFixed(1),
                    trend: 0,
                },
            },
        });
    }
    catch (error) {
        console.error("Get vendor dashboard stats error:", error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.getVendorDashboardStats = getVendorDashboardStats;
// GET /vendor/dashboard/sales-chart
const getVendorSalesChart = async (req, res) => {
    try {
        const userId = req.user?.id;
        const vendor = await vendor_model_1.default.findOne({ userId });
        if (!vendor) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Vendor not found",
            });
        }
        const vendorId = vendor._id;
        // Get last 30 days sales
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const salesData = await order_model_1.Order.aggregate([
            {
                $match: {
                    "items.vendorId": vendorId,
                    status: "delivered",
                    createdAt: { $gte: thirtyDaysAgo },
                },
            },
            {
                $unwind: "$items",
            },
            {
                $match: {
                    "items.vendorId": vendorId,
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    revenue: { $sum: "$items.price" },
                },
            },
            {
                $sort: { _id: 1 },
            },
            {
                $project: {
                    date: "$_id",
                    revenue: { $multiply: ["$revenue", 0.88] }, // 12% platform fee
                },
            },
        ]);
        // Sample every 5 days for cleaner chart
        const sampledData = salesData.filter((_, index) => index % 5 === 0 || index === salesData.length - 1);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: sampledData.map((item, index) => ({
                date: `Day ${index * 5 + 1}`,
                revenue: Math.round(item.revenue),
            })),
        });
    }
    catch (error) {
        console.error("Get vendor sales chart error:", error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.getVendorSalesChart = getVendorSalesChart;
// GET /vendor/dashboard/order-status
const getVendorOrderStatus = async (req, res) => {
    try {
        const userId = req.user?.id;
        const vendor = await vendor_model_1.default.findOne({ userId });
        if (!vendor) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Vendor not found",
            });
        }
        const vendorId = vendor._id;
        const orderStatus = await order_model_1.Order.aggregate([
            {
                $match: {
                    "items.vendorId": vendorId,
                },
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);
        const statusMap = {
            pending: 0,
            confirmed: 0,
            delivered: 0,
            cancelled: 0,
        };
        orderStatus.forEach((item) => {
            const status = item._id.toLowerCase();
            if (status in statusMap) {
                statusMap[status] = item.count;
            }
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: [
                { name: "Pending", value: statusMap.pending },
                { name: "Confirmed", value: statusMap.confirmed },
                { name: "Delivered", value: statusMap.delivered },
                { name: "Cancelled", value: statusMap.cancelled },
            ],
        });
    }
    catch (error) {
        console.error("Get vendor order status error:", error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.getVendorOrderStatus = getVendorOrderStatus;
// GET /vendor/dashboard/top-books
const getVendorTopBooks = async (req, res) => {
    try {
        const userId = req.user?.id;
        const topBooks = await order_model_1.Order.aggregate([
            {
                $unwind: "$items",
            },
            {
                $lookup: {
                    from: "books",
                    localField: "items.bookId",
                    foreignField: "_id",
                    as: "book",
                },
            },
            {
                $unwind: "$book",
            },
            {
                $match: {
                    "book.uploader": new mongoose_1.default.Types.ObjectId(userId),
                    status: "delivered",
                },
            },
            {
                $group: {
                    _id: "$book._id",
                    title: { $first: "$book.title" },
                    sales: { $sum: "$items.quantity" },
                },
            },
            {
                $sort: { sales: -1 },
            },
            {
                $limit: 5,
            },
            {
                $project: {
                    name: "$title",
                    sales: 1,
                    _id: 0,
                },
            },
        ]);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: topBooks,
        });
    }
    catch (error) {
        console.error("Get vendor top books error:", error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.getVendorTopBooks = getVendorTopBooks;
// GET /vendor/dashboard/pdf-performance
const getVendorPDFPerformance = async (req, res) => {
    try {
        const userId = req.user?.id;
        // Note: This requires a downloads tracking system
        // For now, we'll return based on view counts or a placeholder
        const pdfBooks = await book_model_1.default.find({
            uploader: userId,
            type: "free",
            visibility: "public",
        })
            .sort({ createdAt: -1 })
            .limit(4)
            .select("title");
        const data = pdfBooks.map((book) => ({
            name: book.title.substring(0, 20), // Truncate long titles
            downloads: Math.floor(Math.random() * 200) + 100, // Placeholder - implement actual download tracking
        }));
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data,
        });
    }
    catch (error) {
        console.error("Get vendor PDF performance error:", error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.getVendorPDFPerformance = getVendorPDFPerformance;
