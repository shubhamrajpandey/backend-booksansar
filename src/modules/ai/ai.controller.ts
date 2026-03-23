import { Request, Response, NextFunction } from "express";
import {
  getSmartRecommendations,
  getTrendingBooks,
} from "../../services/ai.service";

// GET /api/ai/recommendations
// Query params: type (free|paid|all), genre, limit
export const getRecommendations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id; // from auth middleware
    const { type, genre, limit } = req.query;

    if (!userId) {
      // Not logged in — return trending
      const trending = await getTrendingBooks(
        (type as "free" | "paid" | "all") || "all",
        Number(limit) || 10,
      );
      return res.status(200).json({
        success: true,
        data: trending,
        source: "trending",
      });
    }

    const recommendations = await getSmartRecommendations({
      userId,
      type: (type as "free" | "paid" | "all") || "all",
      genre: genre as string | undefined,
      limit: Number(limit) || 10,
    });

    return res.status(200).json({
      success: true,
      data: recommendations,
      source: "personalized",
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/ai/trending
export const getTrending = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { type, limit } = req.query;
    const books = await getTrendingBooks(
      (type as "free" | "paid" | "all") || "all",
      Number(limit) || 10,
    );
    return res.status(200).json({ success: true, data: books });
  } catch (error) {
    next(error);
  }
};
