import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICartItem {
  bookId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  addedAt: Date;
}

export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema(
  {
    bookId: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    price: {
      type: Number,
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const cartSchema: Schema<ICart> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    items: [cartItemSchema],

    totalAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);


cartSchema.pre("save", function (next) {
  this.totalAmount = this.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  next();
});

cartSchema.index({ userId: 1 });

const Cart: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);

export default Cart;