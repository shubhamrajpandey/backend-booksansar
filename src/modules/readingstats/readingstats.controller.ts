// PATH: backend-booksansar/src/modules/readingstats/readingstats.controller.ts

import { Request, Response } from "express";
import mongoose from "mongoose";
import ReadingStats from "./readingstats.model";
import logger from "../../utils/logger";

const ONE_DAY_MS = 86_400_000;

function toUTCMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function recalculateStreak(stats: any): void {
  const today = toUTCMidnight(new Date());
  const lastRead = stats.lastReadDate
    ? toUTCMidnight(new Date(stats.lastReadDate))
    : null;

  if (lastRead === null) {
    stats.currentStreak = 1;
  } else if (lastRead === today) {
    return; // already counted today, don't touch
  } else if (lastRead === today - ONE_DAY_MS) {
    stats.currentStreak += 1;
  } else {
    stats.currentStreak = 1; // gap
  }

  if (stats.currentStreak > stats.longestStreak) {
    stats.longestStreak = stats.currentStreak;
  }
  stats.lastReadDate = new Date();
}

async function decayStreakIfStale(stats: any): Promise<void> {
  if (!stats.lastReadDate || stats.currentStreak === 0) return;

  const today = toUTCMidnight(new Date());
  const lastRead = toUTCMidnight(new Date(stats.lastReadDate));
  const daysSince = (today - lastRead) / ONE_DAY_MS;

  if (daysSince <= 1) return;

  if (
    daysSince === 2 &&
    stats.streakFreezeCount > 0 &&
    !stats.streakFreezeUsed
  ) {
    stats.streakFreezeCount -= 1;
    stats.streakFreezeUsed = true;
    await stats.save();
    return;
  }

  stats.currentStreak = 0;
  stats.streakFreezeUsed = false;
  await stats.save();
}

function buildWeeklyActivity(
  sessions: any[],
): { day: string; pages: number }[] {
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // Last 7 days, oldest first
  const result: { day: string; pages: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * ONE_DAY_MS);
    const dateStr = d.toISOString().split("T")[0];
    const label = dayLabels[d.getDay()];

    const pages = sessions
      .filter((s) => {
        const sDate = new Date(s.sessionDate).toISOString().split("T")[0];
        return sDate === dateStr;
      })
      .reduce((sum: number, s: any) => sum + (s.pagesRead || 0), 0);

    result.push({ day: label, pages });
  }
  return result;
}

// ── GET /reading-stats ────────────────────────────────────────────────────────

export const getReadingStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let stats = await ReadingStats.findOne({ userId }).populate({
      path: "currentlyReading.bookId",
      select: "title author coverImage additionalImages totalPages",
    });

    if (!stats) {
      stats = await ReadingStats.create({ userId });
      // Re-populate after create
      stats = (await ReadingStats.findOne({ userId }).populate({
        path: "currentlyReading.bookId",
        select: "title author coverImage additionalImages totalPages",
      })) as any;
    }

    await decayStreakIfStale(stats);

    // ✅ AUTO-COMPLETE: fix any books that reached 100% before completion logic existed
    let needsSave = false;
    const toComplete = (stats!.currentlyReading || []).filter(
      (b: any) => b.totalPages > 0 && b.currentPage >= b.totalPages,
    );
    for (const entry of toComplete) {
      const alreadyRead = stats!.readBooks
        .map((id: any) => id.toString())
        .includes(entry.bookId.toString());
      if (!alreadyRead) {
        stats!.readBooks.push(entry.bookId);
        stats!.booksRead = (stats!.booksRead || 0) + 1;
        stats!.booksThisMonth = (stats!.booksThisMonth || 0) + 1;
        needsSave = true;
        logger.info(`[AutoComplete] Completed book ${entry.bookId}`);
      }
      // Remove from currentlyReading regardless
      stats!.currentlyReading = stats!.currentlyReading.filter(
        (b: any) => b.bookId.toString() !== entry.bookId.toString(),
      );
      needsSave = true;
    }
    if (needsSave) await stats!.save();

    const weeklyActivity = buildWeeklyActivity(stats!.readingSessions || []);

    return res.status(200).json({
      stats: {
        booksRead: stats!.booksRead,
        currentStreak: stats!.currentStreak,
        longestStreak: stats!.longestStreak,
        totalReadingTime: stats!.totalReadingTime,
        favoriteGenre: stats!.favoriteGenre || "—",
        booksThisMonth: stats!.booksThisMonth,
        pagesRead: stats!.pagesRead,
        monthlyGoal: stats!.monthlyGoal,
        lastReadDate: stats!.lastReadDate,
        streakFreezeCount: stats!.streakFreezeCount,
        currentlyReading: stats!.currentlyReading,
        weeklyActivity,
      },
    });
  } catch (error) {
    logger.error("getReadingStats error:");
    return res.status(500).json({ message: "Server error" });
  }
};

// ── GET /reading-stats/activity ───────────────────────────────────────────────

export const getActivityHeatmap = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const stats = await ReadingStats.findOne({ userId });
    if (!stats) return res.status(200).json({ activity: {} });

    const yearAgo = new Date(Date.now() - 365 * ONE_DAY_MS);
    const activity: Record<string, number> = {};

    for (const session of stats.readingSessions || []) {
      if (new Date(session.sessionDate) < yearAgo) continue;
      const key = new Date(session.sessionDate).toISOString().split("T")[0];
      activity[key] = (activity[key] || 0) + (session.pagesRead || 0);
    }

    return res.status(200).json({ activity });
  } catch (error) {
    logger.error("getActivityHeatmap error:");
    return res.status(500).json({ message: "Server error" });
  }
};

// ── POST /reading-stats/session ───────────────────────────────────────────────

export const logReadingSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { bookId, startPage, endPage, durationMinutes, totalPages } =
      req.body;

    // Validate required fields
    if (
      !bookId ||
      startPage === undefined ||
      endPage === undefined ||
      !durationMinutes
    ) {
      return res.status(400).json({
        message: "bookId, startPage, endPage, durationMinutes are required",
      });
    }

    const pagesRead = Math.max(0, Number(endPage) - Number(startPage));

    let stats = await ReadingStats.findOne({ userId });
    if (!stats) stats = await ReadingStats.create({ userId });

    // 1. Streak
    recalculateStreak(stats);

    // 2. Global counters
    stats.pagesRead = (stats.pagesRead || 0) + pagesRead;
    stats.totalReadingTime =
      (stats.totalReadingTime || 0) + Number(durationMinutes);

    // 3. Session log (keep 90 days)
    const cutoff = new Date(Date.now() - 90 * ONE_DAY_MS);
    stats.readingSessions = (stats.readingSessions || []).filter(
      (s) => new Date(s.sessionDate) > cutoff,
    );
    stats.readingSessions.push({
      bookId: new mongoose.Types.ObjectId(bookId),
      startPage: Number(startPage),
      endPage: Number(endPage),
      pagesRead,
      durationMinutes: Number(durationMinutes),
      sessionDate: new Date(),
    } as any);

    // 4. currentlyReading — find existing or create
    const bookIdStr = bookId.toString();
    const idx = stats.currentlyReading.findIndex(
      (b: any) => b.bookId.toString() === bookIdStr,
    );

    if (idx !== -1) {
      // Update: only advance forward, never go back
      const newPage = Number(endPage);
      if (newPage > stats.currentlyReading[idx].currentPage) {
        stats.currentlyReading[idx].currentPage = newPage;
      }
      stats.currentlyReading[idx].lastRead = new Date();

      // Update totalPages if we now know it (sent from frontend)
      if (totalPages && Number(totalPages) > 0) {
        stats.currentlyReading[idx].totalPages = Number(totalPages);
      }

      const total = stats.currentlyReading[idx].totalPages;
      if (total > 0) {
        stats.currentlyReading[idx].progressPercent = Math.min(
          100,
          Math.round((stats.currentlyReading[idx].currentPage / total) * 100),
        );
      }

      // ✅ BOOK COMPLETION: if user reached the last page, mark as finished
      const finishedPage = stats.currentlyReading[idx].currentPage;
      const finishedTotal = stats.currentlyReading[idx].totalPages;
      const alreadyRead = stats.readBooks
        .map((id: any) => id.toString())
        .includes(bookIdStr);

      if (finishedTotal > 0 && finishedPage >= finishedTotal && !alreadyRead) {
        logger.info(`[ReadingStats] Book completed! bookId=${bookIdStr}`);
        stats.readBooks.push(new mongoose.Types.ObjectId(bookId));
        stats.booksRead = (stats.booksRead || 0) + 1;
        stats.booksThisMonth = (stats.booksThisMonth || 0) + 1;
        // Remove from currently reading
        stats.currentlyReading.splice(idx, 1);
        // Update favorite genre
        try {
          const BookModel = mongoose.model("Book");
          const bookDoc = await BookModel.findById(bookId).select("genre");
          const genre = (bookDoc as any)?.genre;
          if (genre) {
            const count = (stats.genreCount?.get(genre) || 0) + 1;
            stats.genreCount?.set(genre, count);
            let maxGenre = genre,
              maxCount = 0;
            stats.genreCount?.forEach((v: number, k: string) => {
              if (v > maxCount) {
                maxCount = v;
                maxGenre = k;
              }
            });
            stats.favoriteGenre = maxGenre;
          }
        } catch {
          /* non-fatal */
        }
      }
    } else {
      // Auto-add new entry
      // Try to get totalPages from request body first (most reliable)
      let knownTotalPages = totalPages ? Number(totalPages) : 0;

      // If not sent, try DB
      if (!knownTotalPages) {
        try {
          const BookModel = mongoose.model("Book");
          const book = await BookModel.findById(bookId).select("totalPages");
          knownTotalPages = (book as any)?.totalPages || 0;
        } catch {
          knownTotalPages = 0;
        }
      }

      stats.currentlyReading.push({
        bookId: new mongoose.Types.ObjectId(bookId),
        currentPage: Number(endPage),
        totalPages: knownTotalPages,
        startedAt: new Date(),
        lastRead: new Date(),
        progressPercent:
          knownTotalPages > 0
            ? Math.min(
                100,
                Math.round((Number(endPage) / knownTotalPages) * 100),
              )
            : 0,
      } as any);
    }

    await stats.save();

    logger.info(
      `[ReadingStats] Session saved: user=${userId} book=${bookId} pages=${pagesRead} streak=${stats.currentStreak}`,
    );

    return res.status(200).json({
      message: "Session logged",
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      pagesRead: stats.pagesRead,
      booksThisMonth: stats.booksThisMonth,
    });
  } catch (error) {
    logger.error("logReadingSession error:");
    return res.status(500).json({ message: "Server error" });
  }
};

// ── POST /reading-stats/start-book ───────────────────────────────────────────

export const startReading = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { bookId, totalPages } = req.body;
    if (!bookId || !totalPages) {
      return res
        .status(400)
        .json({ message: "bookId and totalPages are required" });
    }

    let stats = await ReadingStats.findOne({ userId });
    if (!stats) stats = await ReadingStats.create({ userId });

    const already = stats.currentlyReading.some(
      (b: any) => b.bookId.toString() === bookId,
    );
    if (already) {
      return res.status(400).json({ message: "Book already in reading list" });
    }

    stats.currentlyReading.push({
      bookId: new mongoose.Types.ObjectId(bookId),
      currentPage: 0,
      totalPages: Number(totalPages),
      startedAt: new Date(),
      lastRead: new Date(),
      progressPercent: 0,
    } as any);

    await stats.save();
    return res.status(200).json({ message: "Book added to reading list" });
  } catch (error) {
    logger.error("startReading error:");
    return res.status(500).json({ message: "Server error" });
  }
};

// ── PATCH /reading-stats/update-progress ─────────────────────────────────────

export const updateProgress = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { bookId, currentPage } = req.body;
    if (!bookId || currentPage === undefined) {
      return res
        .status(400)
        .json({ message: "bookId and currentPage are required" });
    }

    const stats = await ReadingStats.findOne({ userId });
    if (!stats) return res.status(404).json({ message: "Stats not found" });

    const idx = stats.currentlyReading.findIndex(
      (b: any) => b.bookId.toString() === bookId,
    );
    if (idx === -1)
      return res.status(404).json({ message: "Book not in reading list" });

    stats.currentlyReading[idx].currentPage = Number(currentPage);
    stats.currentlyReading[idx].lastRead = new Date();
    const total = stats.currentlyReading[idx].totalPages;
    if (total > 0) {
      stats.currentlyReading[idx].progressPercent = Math.min(
        100,
        Math.round((Number(currentPage) / total) * 100),
      );
    }

    await stats.save();
    return res.status(200).json({ message: "Progress updated" });
  } catch (error) {
    logger.error("updateProgress error:");
    return res.status(500).json({ message: "Server error" });
  }
};

// ── PATCH /reading-stats/monthly-goal ────────────────────────────────────────

export const setMonthlyGoal = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { monthlyGoal } = req.body;
    if (!monthlyGoal || monthlyGoal < 1 || monthlyGoal > 365) {
      return res
        .status(400)
        .json({ message: "monthlyGoal must be between 1 and 365" });
    }

    const stats = await ReadingStats.findOneAndUpdate(
      { userId },
      { monthlyGoal },
      { upsert: true, new: true },
    );

    return res
      .status(200)
      .json({ message: "Goal updated", monthlyGoal: stats.monthlyGoal });
  } catch (error) {
    logger.error("setMonthlyGoal error:");
    return res.status(500).json({ message: "Server error" });
  }
};
