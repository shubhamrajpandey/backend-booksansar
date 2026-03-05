import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReadingSession {
  bookId: mongoose.Types.ObjectId;
  startPage: number;
  endPage: number;
  pagesRead: number;
  durationMinutes: number;
  sessionDate: Date;
}

export interface ICurrentlyReading {
  bookId: mongoose.Types.ObjectId;
  currentPage: number;
  totalPages: number;
  startedAt: Date;
  lastRead: Date;
  progressPercent: number;
}

export interface IReadingStats extends Document {
  userId: mongoose.Types.ObjectId;

  // ── Core counters ──────────────────────────────────────────
  booksRead: number;
  pagesRead: number;
  totalReadingTime: number; // minutes
  booksThisMonth: number;
  monthlyGoal: number;

  // ── Streak ────────────────────────────────────────────────
  currentStreak: number;
  longestStreak: number;
  lastReadDate: Date | null; // last calendar date user read (UTC midnight)
  streakFreezeUsed: boolean; // used a freeze token today?
  streakFreezeCount: number; // available freeze tokens

  // ── Genre ─────────────────────────────────────────────────
  favoriteGenre: string;
  genreCount: Map<string, number>;

  // ── Book lists ────────────────────────────────────────────
  readBooks: mongoose.Types.ObjectId[];
  currentlyReading: ICurrentlyReading[];

  // ── Session history (last 90 days kept) ───────────────────
  readingSessions: IReadingSession[];

  // ── Timestamps ────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

const ReadingSessionSchema = new Schema<IReadingSession>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    startPage: { type: Number, required: true },
    endPage: { type: Number, required: true },
    pagesRead: { type: Number, required: true },
    durationMinutes: { type: Number, required: true },
    sessionDate: { type: Date, default: Date.now },
  },
  { _id: true },
);

const CurrentlyReadingSchema = new Schema<ICurrentlyReading>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    currentPage: { type: Number, default: 0 },
    totalPages: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    lastRead: { type: Date, default: Date.now },
    progressPercent: { type: Number, default: 0 },
  },
  { _id: false },
);

const ReadingStatsSchema = new Schema<IReadingStats>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    booksRead: { type: Number, default: 0 },
    pagesRead: { type: Number, default: 0 },
    totalReadingTime: { type: Number, default: 0 },
    booksThisMonth: { type: Number, default: 0 },
    monthlyGoal: { type: Number, default: 10 },

    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastReadDate: { type: Date, default: null },
    streakFreezeUsed: { type: Boolean, default: false },
    streakFreezeCount: { type: Number, default: 0 },

    favoriteGenre: { type: String, default: "" },
    genreCount: { type: Map, of: Number, default: {} },

    readBooks: [{ type: Schema.Types.ObjectId, ref: "Book" }],
    currentlyReading: [CurrentlyReadingSchema],
    readingSessions: [ReadingSessionSchema],
  },
  { timestamps: true },
);

// ── Index for fast streak/session queries ──────────────────
ReadingStatsSchema.index({ userId: 1 });
ReadingStatsSchema.index({ "readingSessions.sessionDate": -1 });

const ReadingStats: Model<IReadingStats> = mongoose.model<IReadingStats>(
  "ReadingStats",
  ReadingStatsSchema,
);

export default ReadingStats;
