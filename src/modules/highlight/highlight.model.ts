import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHighlight extends Document {
  userId: mongoose.Types.ObjectId;
  bookId: mongoose.Types.ObjectId;
  page: number;
  text: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const highlightSchema: Schema<IHighlight> = new Schema(
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
    page: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      default: "#FFEB3B", // Default yellow highlight
    },
  },
  { timestamps: true }
);

// Index for efficient queries
highlightSchema.index({ userId: 1, bookId: 1 });
highlightSchema.index({ bookId: 1, page: 1 });

const Highlight: Model<IHighlight> = mongoose.model<IHighlight>(
  "Highlight",
  highlightSchema
);
export default Highlight;