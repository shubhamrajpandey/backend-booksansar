"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markHelpful = exports.deleteRating = exports.updateRating = exports.createRating = exports.getUserRatings = exports.getMyRating = exports.getBookRatings = void 0;
const rating_model_1 = __importDefault(require("./rating.model"));
const book_model_1 = __importDefault(require("../book/book.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const getBookRatings = async (req, res) => {
    try {
        const { bookId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [ratings, total, stats] = await Promise.all([
            rating_model_1.default.find({ bookId })
                .populate("userId", "name avatar")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            rating_model_1.default.countDocuments({ bookId }),
            rating_model_1.default.aggregate([
                { $match: { bookId: new mongoose_1.default.Types.ObjectId(bookId) } },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: "$rating" },
                        totalRatings: { $sum: 1 },
                        fiveStars: {
                            $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] },
                        },
                        fourStars: {
                            $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] },
                        },
                        threeStars: {
                            $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] },
                        },
                        twoStars: {
                            $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] },
                        },
                        oneStar: {
                            $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] },
                        },
                    },
                },
            ]),
        ]);
        const ratingStats = stats[0] || {
            averageRating: 0,
            totalRatings: 0,
            fiveStars: 0,
            fourStars: 0,
            threeStars: 0,
            twoStars: 0,
            oneStar: 0,
        };
        res.status(200).json({
            ratings,
            stats: ratingStats,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error("Get book ratings error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getBookRatings = getBookRatings;
const getMyRating = async (req, res) => {
    try {
        const { bookId } = req.params;
        const userId = req.user?.id;
        const rating = await rating_model_1.default.findOne({ bookId, userId });
        if (!rating) {
            return res.status(200).json({ rating: null });
        }
        res.status(200).json({ rating });
    }
    catch (error) {
        console.error("Get my rating error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getMyRating = getMyRating;
const getUserRatings = async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [ratings, total] = await Promise.all([
            rating_model_1.default.find({ userId })
                .populate("bookId", "title author coverImage additionalImages")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            rating_model_1.default.countDocuments({ userId }),
        ]);
        res.status(200).json({
            ratings,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error("Get user ratings error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getUserRatings = getUserRatings;
const createRating = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { bookId, rating, review } = req.body;
        if (!bookId || !rating) {
            return res
                .status(400)
                .json({ message: "Book ID and rating are required" });
        }
        if (rating < 1 || rating > 5) {
            return res
                .status(400)
                .json({ message: "Rating must be between 1 and 5" });
        }
        const book = await book_model_1.default.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }
        let existingRating = await rating_model_1.default.findOne({ bookId, userId });
        if (existingRating) {
            existingRating.rating = rating;
            if (review !== undefined)
                existingRating.review = review;
            await existingRating.save();
            await updateBookRating(bookId);
            return res.status(200).json({
                message: "Rating updated successfully",
                rating: existingRating,
            });
        }
        const newRating = await rating_model_1.default.create({
            bookId,
            userId,
            rating,
            review,
        });
        await updateBookRating(bookId);
        res.status(201).json({
            message: "Rating created successfully",
            rating: newRating,
        });
    }
    catch (error) {
        console.error("Create rating error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.createRating = createRating;
const updateRating = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { ratingId } = req.params;
        const { rating, review } = req.body;
        const existingRating = await rating_model_1.default.findById(ratingId);
        if (!existingRating) {
            return res.status(404).json({ message: "Rating not found" });
        }
        if (existingRating.userId.toString() !== userId) {
            return res
                .status(403)
                .json({ message: "Not authorized to update this rating" });
        }
        if (rating && (rating < 1 || rating > 5)) {
            return res
                .status(400)
                .json({ message: "Rating must be between 1 and 5" });
        }
        if (rating !== undefined)
            existingRating.rating = rating;
        if (review !== undefined)
            existingRating.review = review;
        await existingRating.save();
        await updateBookRating(existingRating.bookId);
        res.status(200).json({
            message: "Rating updated successfully",
            rating: existingRating,
        });
    }
    catch (error) {
        console.error("Update rating error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateRating = updateRating;
const deleteRating = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { ratingId } = req.params;
        const rating = await rating_model_1.default.findById(ratingId);
        if (!rating) {
            return res.status(404).json({ message: "Rating not found" });
        }
        if (rating.userId.toString() !== userId) {
            return res
                .status(403)
                .json({ message: "Not authorized to delete this rating" });
        }
        const bookId = rating.bookId;
        await rating_model_1.default.findByIdAndDelete(ratingId);
        await updateBookRating(bookId);
        res.status(200).json({ message: "Rating deleted successfully" });
    }
    catch (error) {
        console.error("Delete rating error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.deleteRating = deleteRating;
const markHelpful = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { ratingId } = req.params;
        const rating = await rating_model_1.default.findById(ratingId);
        if (!rating) {
            return res.status(404).json({ message: "Rating not found" });
        }
        const alreadyMarked = rating.helpfulVotes.some((vote) => vote.toString() === userId);
        if (alreadyMarked) {
            rating.helpfulVotes = rating.helpfulVotes.filter((vote) => vote.toString() !== userId);
            rating.helpful -= 1;
        }
        else {
            rating.helpfulVotes.push(new mongoose_1.default.Types.ObjectId(userId));
            rating.helpful += 1;
        }
        await rating.save();
        res.status(200).json({
            message: alreadyMarked ? "Removed helpful vote" : "Marked as helpful",
            helpful: rating.helpful,
            isHelpful: !alreadyMarked,
        });
    }
    catch (error) {
        console.error("Mark helpful error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.markHelpful = markHelpful;
async function updateBookRating(bookId) {
    const stats = await rating_model_1.default.aggregate([
        { $match: { bookId } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: "$rating" },
                totalRatings: { $sum: 1 },
            },
        },
    ]);
    if (stats.length > 0) {
        await book_model_1.default.findByIdAndUpdate(bookId, {
            rating: Math.round(stats[0].averageRating * 10) / 10,
            reviewsCount: stats[0].totalRatings,
        });
    }
    else {
        await book_model_1.default.findByIdAndUpdate(bookId, {
            rating: 0,
            reviewsCount: 0,
        });
    }
}
