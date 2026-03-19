import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Book from "../book/book.model";
import { Order } from "../order/order.model";
import Vendor from "./vendor.model";
import mongoose from "mongoose";

// GET /vendor/dashboard/stats
export const getVendorDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // Get vendor
    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const vendorId = vendor._id;

    // Calculate date ranges
    const today = new Date();
    const firstDayThisMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );
    const firstDayLastMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1,
    );
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // 1. Total Books Listed
    const totalBooks = await Book.countDocuments({
      uploader: userId,
      visibility: { $in: ["public", "pending"] },
    });

    const lastMonthBooks = await Book.countDocuments({
      uploader: userId,
      visibility: { $in: ["public", "pending"] },
      createdAt: { $gte: firstDayLastMonth, $lte: lastDayLastMonth },
    });

    const thisMonthBooks = await Book.countDocuments({
      uploader: userId,
      visibility: { $in: ["public", "pending"] },
      createdAt: { $gte: firstDayThisMonth },
    });

    const booksTrend =
      lastMonthBooks > 0
        ? Math.round(((thisMonthBooks - lastMonthBooks) / lastMonthBooks) * 100)
        : 0;

    // 2. Active Orders (Pending + Confirmed)
    const activeOrders = await Order.countDocuments({
      "items.vendorId": vendorId,
      status: { $in: ["pending", "confirmed", "processing"] },
    });

    const lastMonthActiveOrders = await Order.countDocuments({
      "items.vendorId": vendorId,
      status: { $in: ["pending", "confirmed", "processing"] },
      createdAt: { $gte: firstDayLastMonth, $lte: lastDayLastMonth },
    });

    const thisMonthActiveOrders = await Order.countDocuments({
      "items.vendorId": vendorId,
      status: { $in: ["pending", "confirmed", "processing"] },
      createdAt: { $gte: firstDayThisMonth },
    });

    const activeOrdersTrend =
      lastMonthActiveOrders > 0
        ? Math.round(
            ((thisMonthActiveOrders - lastMonthActiveOrders) /
              lastMonthActiveOrders) *
              100,
          )
        : 0;

    // 3. Monthly Revenue (commission deducted - vendor's net)
    const monthlyRevenueResult = await Order.aggregate([
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

    const lastMonthRevenueResult = await Order.aggregate([
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
    const revenueTrend =
      lastMonthRevenue > 0
        ? Math.round(
            ((vendorEarnings - lastMonthRevenue) / lastMonthRevenue) * 100,
          )
        : 0;

    // 4. Pending Deliveries
    const pendingDeliveries = await Order.countDocuments({
      "items.vendorId": vendorId,
      status: { $in: ["confirmed", "processing"] },
    });

    // 5. Free PDFs Uploaded
    const freePdfs = await Book.countDocuments({
      uploader: userId,
      type: "free",
      visibility: "public",
    });

    const lastMonthFreePdfs = await Book.countDocuments({
      uploader: userId,
      type: "free",
      visibility: "public",
      createdAt: { $gte: firstDayLastMonth, $lte: lastDayLastMonth },
    });

    const thisMonthFreePdfs = await Book.countDocuments({
      uploader: userId,
      type: "free",
      visibility: "public",
      createdAt: { $gte: firstDayThisMonth },
    });

    const pdfsTrend =
      lastMonthFreePdfs > 0
        ? Math.round(
            ((thisMonthFreePdfs - lastMonthFreePdfs) / lastMonthFreePdfs) * 100,
          )
        : 0;

    // 6. Average Rating
    const ratingResult = await Book.aggregate([
      {
        $match: {
          uploader: new mongoose.Types.ObjectId(userId),
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

    return res.status(StatusCodes.OK).json({
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
  } catch (error) {
    console.error("Get vendor dashboard stats error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET /vendor/dashboard/sales-chart
export const getVendorSalesChart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const vendorId = vendor._id;

    // Get last 30 days sales
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesData = await Order.aggregate([
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
    const sampledData = salesData.filter(
      (_, index) => index % 5 === 0 || index === salesData.length - 1,
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      data: sampledData.map((item, index) => ({
        date: `Day ${index * 5 + 1}`,
        revenue: Math.round(item.revenue),
      })),
    });
  } catch (error) {
    console.error("Get vendor sales chart error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET /vendor/dashboard/order-status
export const getVendorOrderStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const vendorId = vendor._id;

    const orderStatus = await Order.aggregate([
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

    const statusMap: Record<string, number> = {
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

    return res.status(StatusCodes.OK).json({
      success: true,
      data: [
        { name: "Pending", value: statusMap.pending },
        { name: "Confirmed", value: statusMap.confirmed },
        { name: "Delivered", value: statusMap.delivered },
        { name: "Cancelled", value: statusMap.cancelled },
      ],
    });
  } catch (error) {
    console.error("Get vendor order status error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET /vendor/dashboard/top-books
export const getVendorTopBooks = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const topBooks = await Order.aggregate([
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
          "book.uploader": new mongoose.Types.ObjectId(userId),
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

    return res.status(StatusCodes.OK).json({
      success: true,
      data: topBooks,
    });
  } catch (error) {
    console.error("Get vendor top books error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET /vendor/dashboard/pdf-performance
export const getVendorPDFPerformance = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // Note: This requires a downloads tracking system
    // For now, we'll return based on view counts or a placeholder
    const pdfBooks = await Book.find({
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

    return res.status(StatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get vendor PDF performance error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};
