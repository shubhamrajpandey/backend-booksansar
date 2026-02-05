import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReadingStats extends Document {
  userId: mongoose.Types.ObjectId;
  booksRead: number;
  currentStreak: number;
  longestStreak: number;
  lastReadDate?: Date;
  totalReadingTime: number;
  favoriteGenre: string;
  booksThisMonth: number;
  pagesRead: number;
  monthlyGoal: number;
  createdAt: Date;
  updatedAt: Date;
}

const readingStatsSchema: Schema<IReadingStats> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    booksRead: {
      type: Number,
      default: 0,
    },

    currentStreak: {
      type: Number,
      default: 0,
    },

    longestStreak: {
      type: Number,
      default: 0,
    },

    lastReadDate: {
      type: Date,
    },

    totalReadingTime: {
      type: Number,
      default: 0,
    },

    favoriteGenre: {
      type: String,
      default: "Fiction",
    },

    booksThisMonth: {
      type: Number,
      default: 0,
    },

    pagesRead: {
      type: Number,
      default: 0,
    },

    monthlyGoal: {
      type: Number,
      default: 10,
    },
  },
  { timestamps: true }
);


readingStatsSchema.index({ userId: 1 });

const ReadingStats: Model<IReadingStats> = mongoose.model<IReadingStats>(
  "ReadingStats",
  readingStatsSchema
);

export default ReadingStats;