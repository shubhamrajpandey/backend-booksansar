import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import User from "../user/user.model";
import Vendor from "../vendor/vendor.model";
import Book from "../book/book.model";
import { Order } from "../order/order.model";
import { Payout } from "../payout/payout.model";

// GET /admin/dashboard/stats
export const getAdminDashboardStats = async (req: Request, res: Response) => {
  try {
    // Calculate date ranges
    const today = new Date();
    const firstDayThisMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );

    // 1. Total Vendors
    const totalVendors = await Vendor.countDocuments();

    // 2. Active Vendors (approved status)
    const activeVendors = await Vendor.countDocuments({ status: "approved" });

    // 3. Total Books Listed
    const totalBooks = await Book.countDocuments({
      visibility: { $in: ["public", "pending"] },
    });

    // 4. Monthly Revenue (Platform commission - 12%)
    const monthlyRevenueResult = await Order.aggregate([
      {
        $match: {
          status: "delivered",
          createdAt: { $gte: firstDayThisMonth },
        },
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$items.price" },
        },
      },
    ]);

    const monthlyRevenue = (monthlyRevenueResult[0]?.total || 0) * 0.12; // 12% platform commission

    // 5. Pending KYC
    const pendingKYC = await Vendor.countDocuments({ status: "pending" });

    // 6. Active Orders (today)
    const activeOrders = await Order.countDocuments({
      status: { $in: ["pending", "confirmed", "processing"] },
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59, 999)),
      },
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        totalVendors,
        activeVendors,
        totalBooks,
        monthlyRevenue: Math.round(monthlyRevenue),
        pendingKYC,
        activeOrders,
      },
    });
  } catch (error) {
    console.error("Get admin dashboard stats error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET /admin/dashboard/revenue-chart
export const getAdminRevenueChart = async (req: Request, res: Response) => {
  try {
    // Get last 6 months revenue
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const revenueData = await Order.aggregate([
      {
        $match: {
          status: "delivered",
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$createdAt" },
          },
          revenue: { $sum: "$items.price" },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          month: {
            $dateToString: {
              format: "%b",
              date: {
                $dateFromString: { dateString: { $concat: ["$_id", "-01"] } },
              },
            },
          },
          revenue: { $multiply: ["$revenue", 0.12] }, // 12% platform commission
        },
      },
    ]);

    return res.status(StatusCodes.OK).json({
      success: true,
      data: revenueData.map((item) => ({
        month: item.month,
        revenue: Math.round(item.revenue),
      })),
    });
  } catch (error) {
    console.error("Get admin revenue chart error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET /admin/dashboard/kyc-status
export const getAdminKYCStatus = async (req: Request, res: Response) => {
  try {
    const kycStatus = await Vendor.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusMap: Record<string, { value: number; color: string }> = {
      approved: { value: 0, color: "#16a34a" },
      pending: { value: 0, color: "#f59e0b" },
      rejected: { value: 0, color: "#ef4444" },
    };

    kycStatus.forEach((item) => {
      const status = item._id.toLowerCase();
      if (status in statusMap) {
        statusMap[status].value = item.count;
      }
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      data: [
        {
          name: "Approved",
          value: statusMap.approved.value,
          color: statusMap.approved.color,
        },
        {
          name: "Pending",
          value: statusMap.pending.value,
          color: statusMap.pending.color,
        },
        {
          name: "Rejected",
          value: statusMap.rejected.value,
          color: statusMap.rejected.color,
        },
      ],
    });
  } catch (error) {
    console.error("Get admin KYC status error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET /admin/dashboard/order-status
export const getAdminOrderStatus = async (req: Request, res: Response) => {
  try {
    const orderStatus = await Order.aggregate([
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
      } else if (status === "processing") {
        statusMap.confirmed += item.count;
      }
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      data: [
        { status: "Pending", orders: statusMap.pending },
        { status: "Confirmed", orders: statusMap.confirmed },
        { status: "Delivered", orders: statusMap.delivered },
        { status: "Cancelled", orders: statusMap.cancelled },
      ],
    });
  } catch (error) {
    console.error("Get admin order status error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};
