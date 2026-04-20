"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.updatePreferences = exports.getPreferences = exports.getOrders = exports.updateStreak = exports.getReadingStats = exports.updateProfile = exports.getProfile = void 0;
const user_model_1 = __importDefault(require("../user/user.model"));
const readingstats_model_1 = __importDefault(require("../readingstats/readingstats.model"));
const wishlist_model_1 = __importDefault(require("../wishlist/wishlist.model"));
const cart_model_1 = __importDefault(require("../cart/cart.model"));
const userpreferences_model_1 = __importDefault(require("../user/userpreferences.model"));
const order_model_1 = require("../order/order.model");
// Get user profile with all related data
const getProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await user_model_1.default.findById(userId).select("-password");
        if (!user)
            return res.status(404).json({ message: "User not found" });
        let stats = await readingstats_model_1.default.findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { new: true, upsert: true, setDefaultsOnInsert: true });
        if (stats.lastReadDate && stats.currentStreak > 0) {
            const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
            const lastRead = Date.UTC(new Date(stats.lastReadDate).getUTCFullYear(), new Date(stats.lastReadDate).getUTCMonth(), new Date(stats.lastReadDate).getUTCDate());
            const daysSince = (today - lastRead) / 86400000;
            if (daysSince > 1) {
                if (daysSince === 2 &&
                    stats.streakFreezeCount > 0 &&
                    !stats.streakFreezeUsed) {
                    stats.streakFreezeCount -= 1;
                    stats.streakFreezeUsed = true;
                }
                else {
                    stats.currentStreak = 0;
                    stats.streakFreezeUsed = false;
                }
                await stats.save();
            }
        }
        const [wishlist, cart, preferences] = await Promise.all([
            wishlist_model_1.default.findOne({ userId }).populate("items.bookId"),
            cart_model_1.default.findOne({ userId }).populate("items.bookId"),
            userpreferences_model_1.default.findOne({ userId }),
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
    }
    catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getProfile = getProfile;
// Update user profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { name, phoneNumber, location, bio, avatar } = req.body;
        const user = await user_model_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (name)
            user.name = name;
        if (phoneNumber)
            user.phoneNumber = phoneNumber;
        if (location !== undefined)
            user.location = location;
        if (bio !== undefined)
            user.bio = bio;
        if (avatar !== undefined)
            user.avatar = avatar;
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
    }
    catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateProfile = updateProfile;
// Get reading statistics
const getReadingStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        let stats = await readingstats_model_1.default.findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { new: true, upsert: true, setDefaultsOnInsert: true });
        res.status(200).json({ stats });
    }
    catch (error) {
        console.error("Get stats error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getReadingStats = getReadingStats;
// Update reading streak
const updateStreak = async (req, res) => {
    try {
        const userId = req.user?.id;
        let stats = await readingstats_model_1.default.findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { new: true, upsert: true, setDefaultsOnInsert: true });
        const today = new Date().setHours(0, 0, 0, 0);
        const lastRead = stats.lastReadDate
            ? new Date(stats.lastReadDate).setHours(0, 0, 0, 0)
            : null;
        if (lastRead === today - 86400000) {
            stats.currentStreak += 1;
        }
        else if (lastRead !== today) {
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
    }
    catch (error) {
        console.error("Update streak error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateStreak = updateStreak;
// Get user orders
const getOrders = async (req, res) => {
    try {
        const userId = req.user?.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [orders, total] = await Promise.all([
            order_model_1.Order.find({ customerId: userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("-statusHistory"),
            order_model_1.Order.countDocuments({ customerId: userId }),
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
    }
    catch (error) {
        console.error("Get orders error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getOrders = getOrders;
// Get user preferences
const getPreferences = async (req, res) => {
    try {
        const userId = req.user?.id;
        let preferences = await userpreferences_model_1.default.findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { new: true, upsert: true, setDefaultsOnInsert: true });
        res.status(200).json({ preferences });
    }
    catch (error) {
        console.error("Get preferences error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getPreferences = getPreferences;
// Update user preferences
const updatePreferences = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { notifications, theme, language } = req.body;
        const updatePayload = {};
        if (notifications)
            updatePayload.notifications = notifications;
        if (theme)
            updatePayload.theme = theme;
        if (language)
            updatePayload.language = language;
        let preferences = await userpreferences_model_1.default.findOneAndUpdate({ userId }, { $set: updatePayload, $setOnInsert: { userId } }, { new: true, upsert: true, setDefaultsOnInsert: true });
        res.status(200).json({
            message: "Preferences updated successfully",
            preferences,
        });
    }
    catch (error) {
        console.error("Update preferences error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updatePreferences = updatePreferences;
// Delete user account
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ message: "Password required" });
        }
        const user = await user_model_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        await Promise.all([
            user_model_1.default.findByIdAndDelete(userId),
            readingstats_model_1.default.findOneAndDelete({ userId }),
            wishlist_model_1.default.findOneAndDelete({ userId }),
            cart_model_1.default.findOneAndDelete({ userId }),
            userpreferences_model_1.default.findOneAndDelete({ userId }),
        ]);
        res.status(200).json({ message: "Account deleted successfully" });
    }
    catch (error) {
        console.error("Delete account error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.deleteAccount = deleteAccount;
