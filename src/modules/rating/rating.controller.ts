import { Request, Response } from "express";
import Rating from "./rating.model";
import Book from "../book/book.model";
import mongoose from "mongoose";

export const getBookRatings = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [ratings, total, stats] = await Promise.all([
      Rating.find({ bookId })
        .populate("userId", "name avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Rating.countDocuments({ bookId }),
      Rating.aggregate([
        { $match: { bookId: new mongoose.Types.ObjectId(bookId) } },
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
  } catch (error) {
    console.error("Get book ratings error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMyRating = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const userId = req.user?.id;

    const rating = await Rating.findOne({ bookId, userId });

    if (!rating) {
      return res.status(200).json({ rating: null });
    }

    res.status(200).json({ rating });
  } catch (error) {
    console.error("Get my rating error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserRatings = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      Rating.find({ userId })
        .populate("bookId", "title author coverImage additionalImages")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Rating.countDocuments({ userId }),
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
  } catch (error) {
    console.error("Get user ratings error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createRating = async (req: Request, res: Response) => {
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

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    let existingRating = await Rating.findOne({ bookId, userId });

    if (existingRating) {
      existingRating.rating = rating;
      if (review !== undefined) existingRating.review = review;
      await existingRating.save();

      await updateBookRating(bookId);

      return res.status(200).json({
        message: "Rating updated successfully",
        rating: existingRating,
      });
    }

    const newRating = await Rating.create({
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
  } catch (error) {
    console.error("Create rating error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateRating = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { ratingId } = req.params;
    const { rating, review } = req.body;

    const existingRating = await Rating.findById(ratingId);

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

    if (rating !== undefined) existingRating.rating = rating;
    if (review !== undefined) existingRating.review = review;

    await existingRating.save();

    await updateBookRating(existingRating.bookId);

    res.status(200).json({
      message: "Rating updated successfully",
      rating: existingRating,
    });
  } catch (error) {
    console.error("Update rating error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteRating = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { ratingId } = req.params;

    const rating = await Rating.findById(ratingId);

    if (!rating) {
      return res.status(404).json({ message: "Rating not found" });
    }

    if (rating.userId.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this rating" });
    }

    const bookId = rating.bookId;

    await Rating.findByIdAndDelete(ratingId);

    await updateBookRating(bookId);

    res.status(200).json({ message: "Rating deleted successfully" });
  } catch (error) {
    console.error("Delete rating error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const markHelpful = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { ratingId } = req.params;

    const rating = await Rating.findById(ratingId);

    if (!rating) {
      return res.status(404).json({ message: "Rating not found" });
    }

    const alreadyMarked = rating.helpfulVotes.some(
      (vote) => vote.toString() === userId,
    );

    if (alreadyMarked) {
      rating.helpfulVotes = rating.helpfulVotes.filter(
        (vote) => vote.toString() !== userId,
      );
      rating.helpful -= 1;
    } else {
      rating.helpfulVotes.push(new mongoose.Types.ObjectId(userId));
      rating.helpful += 1;
    }

    await rating.save();

    res.status(200).json({
      message: alreadyMarked ? "Removed helpful vote" : "Marked as helpful",
      helpful: rating.helpful,
      isHelpful: !alreadyMarked,
    });
  } catch (error) {
    console.error("Mark helpful error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

async function updateBookRating(bookId: mongoose.Types.ObjectId) {
  const stats = await Rating.aggregate([
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
    await Book.findByIdAndUpdate(bookId, {
      rating: Math.round(stats[0].averageRating * 10) / 10,
      reviewsCount: stats[0].totalRatings,
    });
  } else {
    await Book.findByIdAndUpdate(bookId, {
      rating: 0,
      reviewsCount: 0,
    });
  }
}
