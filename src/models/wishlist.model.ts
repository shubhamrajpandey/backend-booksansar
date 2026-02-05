import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWishlistItem {
  bookId: mongoose.Types.ObjectId;
  addedAt: Date;
}

export interface IWishlist extends Document {
  userId: mongoose.Types.ObjectId;
  items: IWishlistItem[];
  createdAt: Date;
  updatedAt: Date;
}

const wishlistItemSchema = new Schema(
  {
    bookId: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const wishlistSchema: Schema<IWishlist> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    items: [wishlistItemSchema],
  },
  { timestamps: true }
);

wishlistSchema.index({ userId: 1 });
wishlistSchema.index({ "items.bookId": 1 });

const Wishlist: Model<IWishlist> = mongoose.model<IWishlist>(
  "Wishlist",
  wishlistSchema
);

export default Wishlist;