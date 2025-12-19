import { redisClient } from "../config/redis";
import { Request, Response, NextFunction } from "express";

export const cacheEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const cacheKey = `books:${userId}`;

    const cacheData = await redisClient.get(cacheKey);

    if (cacheData) {
      console.log("Events served from Redis cache");
      return res.status(200).json(JSON.parse(cacheData));
    }

    req.cacheKey = cacheKey;
    next();
  } catch (error) {
    console.error("Cache middleware error:", (error as Error).message);
    next();
  }
};
