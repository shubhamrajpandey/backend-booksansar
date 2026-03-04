import mongoose, { Schema, Document, Model } from "mongoose";

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  bookId: mongoose.Types.ObjectId;
  content: string;
  page?: number;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema: Schema<INote> = new Schema(
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
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    page: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
noteSchema.index({ userId: 1, bookId: 1 });
noteSchema.index({ bookId: 1, page: 1 });

const Note: Model<INote> = mongoose.model<INote>("Note", noteSchema);
export default Note;