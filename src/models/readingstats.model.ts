import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReadingStats extends Document {
  userId: mongoose.Types.ObjectId;
  booksRead: number;
  currentStreak: number;
  longestStreak: number;
  totalReadingTime: number;
  favoriteGenre: string;
  booksThisMonth: number;
  pagesRead: number;
  monthlyGoal: number;
  lastReadDate: Date | null;
  readBooks: mongoose.Types.ObjectId[];
  genreCount: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const ReadingStatsSchema: Schema = new Schema<IReadingStats>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    booksRead: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalReadingTime: { type: Number, default: 0 },
    favoriteGenre: { type: String, default: "Fiction" },
    booksThisMonth: { type: Number, default: 0 },
    pagesRead: { type: Number, default: 0 },
    monthlyGoal: { type: Number, default: 10 },
    lastReadDate: { type: Date, default: null },
    readBooks: [{ type: Schema.Types.ObjectId, ref: "Book" }],
    genreCount: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

const ReadingStats: Model<IReadingStats> = mongoose.model<IReadingStats>(
  "ReadingStats",
  ReadingStatsSchema
);

export default ReadingStats;