import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBookmark extends Document {
  userId: mongoose.Types.ObjectId;
  bookId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bookmarkSchema: Schema<IBookmark> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookId: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure a user can only bookmark a book once
bookmarkSchema.index({ userId: 1, bookId: 1 }, { unique: true });

const Bookmark: Model<IBookmark> = mongoose.model<IBookmark>(
  "Bookmark",
  bookmarkSchema
);
export default Bookmark;