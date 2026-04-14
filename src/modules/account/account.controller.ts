import { Request, Response } from "express";
import User from "../user/user.model";
import ReadingStats from "../readingstats/readingstats.model";
import Wishlist from "../wishlist/wishlist.model";
import Cart from "../cart/cart.model";
import UserPreferences from "../user/userpreferences.model";
import { Order } from "../order/order.model";

// Get user profile with all related data
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    let stats = await ReadingStats.findOne({ userId });
    if (!stats) stats = await ReadingStats.create({ userId });

    if (stats.lastReadDate && stats.currentStreak > 0) {
      const today = Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate(),
      );
      const lastRead = Date.UTC(
        new Date(stats.lastReadDate).getUTCFullYear(),
        new Date(stats.lastReadDate).getUTCMonth(),
        new Date(stats.lastReadDate).getUTCDate(),
      );
      const daysSince = (today - lastRead) / 86_400_000;

      if (daysSince > 1) {

        if (
          daysSince === 2 &&
          stats.streakFreezeCount > 0 &&
          !stats.streakFreezeUsed
        ) {
          stats.streakFreezeCount -= 1;
          stats.streakFreezeUsed = true;
        } else {
          stats.currentStreak = 0;
          stats.streakFreezeUsed = false;
        }
        await stats.save();
      }
    }

    const [wishlist, cart, preferences] = await Promise.all([
      Wishlist.findOne({ userId }).populate("items.bookId"),
      Cart.findOne({ userId }).populate("items.bookId"),
      UserPreferences.findOne({ userId }),
    ]);

    res.status(200).json({
      user,
      stats: {
        booksRead: stats.booksRead,
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        totalReadingTime: stats.totalReadingTime,
        favoriteGenre: stats.favoriteGenre || "—",
        booksThisMonth: stats.booksThisMonth,
        pagesRead: stats.pagesRead,
        monthlyGoal: stats.monthlyGoal,
        lastReadDate: stats.lastReadDate,
        streakFreezeCount: stats.streakFreezeCount,
      },
      wishlistCount: wishlist?.items.length || 0,
      cartCount: cart?.items.length || 0,
      preferences,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, phoneNumber, location, bio, avatar } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (location !== undefined) user.location = location;
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        location: user.location,
        bio: user.bio,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get reading statistics
export const getReadingStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    let stats = await ReadingStats.findOne({ userId });

    if (!stats) {
      stats = await ReadingStats.create({ userId });
    }

    res.status(200).json({ stats });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update reading streak
export const updateStreak = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    let stats = await ReadingStats.findOne({ userId });

    if (!stats) {
      stats = await ReadingStats.create({ userId });
    }

    const today = new Date().setHours(0, 0, 0, 0);
    const lastRead = stats.lastReadDate
      ? new Date(stats.lastReadDate).setHours(0, 0, 0, 0)
      : null;

    if (lastRead === today - 86400000) {
      stats.currentStreak += 1;
    } else if (lastRead !== today) {
      stats.currentStreak = 1;
    }

    if (stats.currentStreak > stats.longestStreak) {
      stats.longestStreak = stats.currentStreak;
    }

    stats.lastReadDate = new Date();
    await stats.save();

    res.status(200).json({
      message: "Streak updated",
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
    });
  } catch (error) {
    console.error("Update streak error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user orders
export const getOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ customerId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-statusHistory"),
      Order.countDocuments({ customerId: userId }),
    ]);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user preferences
export const getPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    let preferences = await UserPreferences.findOne({ userId });

    if (!preferences) {
      preferences = await UserPreferences.create({ userId });
    }

    res.status(200).json({ preferences });
  } catch (error) {
    console.error("Get preferences error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user preferences
export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { notifications, theme, language } = req.body;

    let preferences = await UserPreferences.findOne({ userId });

    if (!preferences) {
      preferences = await UserPreferences.create({
        userId,
        notifications,
        theme,
        language,
      });
    } else {
      if (notifications) preferences.notifications = notifications;
      if (theme) preferences.theme = theme;
      if (language) preferences.language = language;

      await preferences.save();
    }

    res.status(200).json({
      message: "Preferences updated successfully",
      preferences,
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete user account
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await Promise.all([
      User.findByIdAndDelete(userId),
      ReadingStats.findOneAndDelete({ userId }),
      Wishlist.findOneAndDelete({ userId }),
      Cart.findOneAndDelete({ userId }),
      UserPreferences.findOneAndDelete({ userId }),
    ]);

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
