import { Request, Response, NextFunction } from "express";
import {
  getSmartRecommendations,
  getTrendingBooks,
  chatWithBookSansarAI,
  aiSearch,
} from "../../services/ai.service";

export const getRecommendations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const { type, genre, limit } = req.query;

    if (!userId) {
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

export const aiChat = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    const reply = await chatWithBookSansarAI(message, history);

    return res.status(200).json({
      success: true,
      data: { reply },
    });
  } catch (error) {
    next(error);
  }
};

export const smartSearch = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required.",
      });
    }

    const results = await aiSearch(query);

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};