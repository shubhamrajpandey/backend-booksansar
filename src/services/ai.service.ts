import mongoose from "mongoose";
import ReadingStats from "../modules/readingstats/readingstats.model";
import Rating from "../modules/rating/rating.model";
import UserPreferences from "../modules/user/userpreferences.model";
import Book from "../modules/book/book.model";

interface RecommendationQuery {
  userId: string;
  type?: "free" | "paid" | "all";
  genre?: string;
  limit?: number;
}

interface ScoredBook {
  bookId: string;
  score: number;
  reason: string;
}

async function getUserReadingProfile(userId: string) {
  const [stats, preferences] = await Promise.all([
    ReadingStats.findOne({ userId }),
    UserPreferences.findOne({ userId }),
  ]);

  const genreScores: Record<string, number> = {};

  if (stats?.genreCount) {
    for (const [genre, count] of stats.genreCount.entries()) {
      genreScores[genre] = (genreScores[genre] || 0) + (count as number) * 1.5;
    }
  }

  if (stats?.favoriteGenre) {
    genreScores[stats.favoriteGenre] =
      (genreScores[stats.favoriteGenre] || 0) + 5;
  }

  const alreadyReadIds = (stats?.readBooks || []).map((id) => id.toString());
  const currentlyReadingIds = (stats?.currentlyReading || []).map((r) =>
    r.bookId.toString(),
  );
  const excludeIds = [...alreadyReadIds, ...currentlyReadingIds];

  return {
    genreScores,
    excludeIds,
    language: preferences?.language || "en",
    favoriteGenre: stats?.favoriteGenre || null,
    totalBooksRead: stats?.booksRead || 0,
  };
}

async function getUserHighRatedGenres(userId: string): Promise<string[]> {
  const highRatings = await Rating.find({
    userId,
    rating: { $gte: 4 },
  })
    .populate("bookId", "genre category")
    .lean();

  const genres: string[] = [];
  for (const r of highRatings) {
    const book = r.bookId as any;
    if (book?.genre) genres.push(book.genre);
    if (book?.category) genres.push(book.category);
  }

  return [...new Set(genres)];
}

async function contentBasedRecommendations(
  userId: string,
  type: "free" | "paid" | "all",
  genre: string | undefined,
  excludeIds: string[],
  genreScores: Record<string, number>,
  limit: number,
): Promise<ScoredBook[]> {
  // Build base query
  const query: Record<string, any> = {
    _id: { $nin: excludeIds.map((id) => new mongoose.Types.ObjectId(id)) },
    status: "approved",
  };

  if (type === "free") query.isFree = true;
  if (type === "paid") query.isFree = false;

  // If a specific genre is requested, filter by it
  if (genre) {
    query.$or = [
      { genre: { $regex: genre, $options: "i" } },
      { category: { $regex: genre, $options: "i" } },
    ];
  }

  const books = await Book.find(query)
    .select("_id title genre category isFree averageRating totalRatings")
    .lean();

  const scored: ScoredBook[] = books.map((book: any) => {
    let score = 0;
    let reason = "Popular on BookSansar";

    // Score based on genre match with user's reading history
    const bookGenre = book.genre || "";
    const bookCategory = book.category || "";

    if (genreScores[bookGenre]) {
      score += genreScores[bookGenre] * 0.7;
      reason = `Based on your love of ${bookGenre}`;
    }
    if (genreScores[bookCategory]) {
      score += genreScores[bookCategory] * 0.5;
    }

    // Boost by rating quality
    if (book.averageRating) {
      score += book.averageRating * 2;
    }

    // Boost popular books slightly
    if (book.totalRatings > 10) score += 1;
    if (book.totalRatings > 50) score += 2;

    return {
      bookId: book._id.toString(),
      score: parseFloat(score.toFixed(2)),
      reason,
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

async function collaborativeRecommendations(
  userId: string,
  excludeIds: string[],
  limit: number,
): Promise<ScoredBook[]> {
  const userRatings = await Rating.find({ userId }).lean();
  if (userRatings.length === 0) return [];

  const userBookIds = userRatings.map((r) => r.bookId.toString());

  const similarUserRatings = await Rating.aggregate([
    {
      $match: {
        bookId: {
          $in: userRatings.map((r) => r.bookId),
        },
        userId: { $ne: new mongoose.Types.ObjectId(userId) },
      },
    },
    {
      $group: {
        _id: "$userId",
        commonBooks: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
    { $match: { commonBooks: { $gte: 2 } } },
    { $sort: { commonBooks: -1, avgRating: -1 } },
    { $limit: 20 },
  ]);

  if (similarUserRatings.length === 0) return [];

  const similarUserIds = similarUserRatings.map((u) => u._id);

  const recommendations = await Rating.aggregate([
    {
      $match: {
        userId: { $in: similarUserIds },
        rating: { $gte: 4 },
        bookId: {
          $nin: [
            ...excludeIds.map((id) => new mongoose.Types.ObjectId(id)),
            ...userBookIds.map((id) => new mongoose.Types.ObjectId(id)),
          ],
        },
      },
    },
    {
      $group: {
        _id: "$bookId",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1, avgRating: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "books",
        localField: "_id",
        foreignField: "_id",
        as: "book",
      },
    },
    { $unwind: "$book" },
    { $match: { "book.status": "approved" } },
  ]);

  return recommendations.map((r) => ({
    bookId: r._id.toString(),
    score: parseFloat((r.avgRating * r.count * 0.3).toFixed(2)),
    reason: "Readers with similar taste loved this",
  }));
}

export async function getRecommendations(
  query: RecommendationQuery,
): Promise<any[]> {
  const { userId, type = "all", genre, limit = 10 } = query;

  try {
    const profile = await getUserReadingProfile(userId);
    const highRatedGenres = await getUserHighRatedGenres(userId);

    for (const g of highRatedGenres) {
      profile.genreScores[g] = (profile.genreScores[g] || 0) + 3;
    }

    const [contentResults, collabResults] = await Promise.all([
      contentBasedRecommendations(
        userId,
        type,
        genre,
        profile.excludeIds,
        profile.genreScores,
        limit,
      ),
      collaborativeRecommendations(userId, profile.excludeIds, limit),
    ]);

    const scoreMap = new Map<string, ScoredBook>();

    for (const item of contentResults) {
      scoreMap.set(item.bookId, {
        ...item,
        score: item.score * 0.7,
      });
    }

    for (const item of collabResults) {
      if (scoreMap.has(item.bookId)) {
        const existing = scoreMap.get(item.bookId)!;
        existing.score += item.score * 0.3;
        existing.reason = "Highly recommended for you";
      } else {
        scoreMap.set(item.bookId, {
          ...item,
          score: item.score * 0.3,
        });
      }
    }

    const finalIds = [...scoreMap.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.bookId);

    const reasonMap = new Map(
      [...scoreMap.values()].map((item) => [item.bookId, item.reason]),
    );

    const books = await Book.find({
      _id: { $in: finalIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .populate("genre", "name")
      .populate("category", "name")
      .lean();

    const sortedBooks = finalIds
      .map((id) => {
        const book = books.find((b: any) => b._id.toString() === id);
        if (!book) return null;
        return {
          ...book,
          recommendationReason: reasonMap.get(id) || "Recommended for you",
        };
      })
      .filter(Boolean);

    return sortedBooks;
  } catch (error) {
    console.error("Recommendation error:", error);
    throw error;
  }
}

// ─────────────────────────────────────────────
// Fallback: Trending books (for new users with no history)
// ─────────────────────────────────────────────

export async function getTrendingBooks(
  type: "free" | "paid" | "all" = "all",
  limit = 10,
): Promise<any[]> {
  const query: Record<string, any> = { status: "approved" };
  if (type === "free") query.isFree = true;
  if (type === "paid") query.isFree = false;

  const books = await Book.find(query)
    .sort({ averageRating: -1, totalRatings: -1 })
    .limit(limit)
    .populate("genre", "name")
    .populate("category", "name")
    .lean();

  return books.map((book) => ({
    ...book,
    recommendationReason: "Trending on BookSansar",
  }));
}

// ─────────────────────────────────────────────
// Smart entry point — uses recommendations if history exists,
// falls back to trending for new users
// ─────────────────────────────────────────────

export async function getSmartRecommendations(
  query: RecommendationQuery,
): Promise<any[]> {
  const stats = await ReadingStats.findOne({ userId: query.userId });
  const hasHistory =
    (stats?.booksRead || 0) > 0 || (stats?.readingSessions?.length || 0) > 0;

  if (hasHistory) {
    return getRecommendations(query);
  }

  // New user — return trending
  return getTrendingBooks(query.type, query.limit);
}
