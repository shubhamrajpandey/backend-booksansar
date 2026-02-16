import { Request, Response } from "express";
import ReadingStats from "../models/readingstats.model";
import Book from "../models/book.model";
import mongoose from "mongoose";

export const trackReading = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { bookId, pagesRead, readingTimeSeconds } = req.body;

    if (!bookId || typeof pagesRead !== "number" || typeof readingTimeSeconds !== "number") {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const book = await Book.findById(bookId).select("genre");
    const genre = book?.genre || "Unknown";

    let stats = await ReadingStats.findOne({ userId });

    if (!stats) {
      stats = new ReadingStats({ userId });
    }

    stats.totalReadingTime += readingTimeSeconds;
    stats.pagesRead += pagesRead;

    const bookObjectId = book?._id as mongoose.Types.ObjectId | undefined;

    const alreadyRead = bookObjectId
      ? stats.readBooks.some((id) => id.toString() === bookObjectId.toString())
      : false;

    if (!alreadyRead && bookObjectId) {
      stats.readBooks.push(bookObjectId);
      stats.booksRead += 1;

      const now = new Date();
      const lastRead = stats.lastReadDate;
      if (
        !lastRead ||
        lastRead.getMonth() !== now.getMonth() ||
        lastRead.getFullYear() !== now.getFullYear()
      ) {
        stats.booksThisMonth = 1;
      } else {
        stats.booksThisMonth += 1;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastReadDate = stats.lastReadDate ? new Date(stats.lastReadDate) : null;
    if (lastReadDate) lastReadDate.setHours(0, 0, 0, 0);

    if (!lastReadDate) {
      stats.currentStreak = 1;
    } else {
      const diffDays = Math.floor(
        (today.getTime() - lastReadDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 0) {
        // same day — no change
      } else if (diffDays === 1) {
        stats.currentStreak += 1;
      } else {
        stats.currentStreak = 1;
      }
    }

    if (stats.currentStreak > stats.longestStreak) {
      stats.longestStreak = stats.currentStreak;
    }

    stats.lastReadDate = new Date();

    if (genre && genre !== "Unknown") {
      const genreMap = stats.genreCount as unknown as Map<string, number>;
      const current = genreMap.get(genre) || 0;
      genreMap.set(genre, current + 1);

      let maxCount = 0;
      let favGenre = stats.favoriteGenre;
      genreMap.forEach((count, g) => {
        if (count > maxCount) {
          maxCount = count;
          favGenre = g;
        }
      });
      stats.favoriteGenre = favGenre;
    }

    await stats.save();

    return res.status(200).json({ message: "Stats updated", stats });
  } catch (error) {
    console.error("trackReading error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};