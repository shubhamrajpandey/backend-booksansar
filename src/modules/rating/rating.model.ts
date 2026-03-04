import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRating extends Document {
  bookId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rating: number; 
  review?: string;
  helpful: number; 
  helpfulVotes: mongoose.Types.ObjectId[]; 
  createdAt: Date;
  updatedAt: Date;
}

const ratingSchema: Schema<IRating> = new Schema(
  {
    bookId: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    review: {
      type: String,
      maxlength: 1000,
    },

    helpful: {
      type: Number,
      default: 0,
    },

    helpfulVotes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);


ratingSchema.index({ bookId: 1, userId: 1 }, { unique: true });

ratingSchema.index({ bookId: 1, createdAt: -1 });

ratingSchema.index({ userId: 1, createdAt: -1 });

const Rating: Model<IRating> = mongoose.model<IRating>("Rating", ratingSchema);

export default Rating;