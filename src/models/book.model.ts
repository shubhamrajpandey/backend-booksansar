import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBook extends Document {
  type: "free" | "physical" | "second-hand";
  title: string;
  author: string;
  category: string;
  genre?: string;
  description?: string;
  coverImage?: string;
  additionalImages?: string[];
  uploader: mongoose.Types.ObjectId;
  pdfUrl?: string;
  price?: number;
  mrp?: number;
  stock?: number;
  condition?: "new" | "used-good" | "used-ok";
  vendorId?: mongoose.Types.ObjectId;
  deliveryInfo?: {
    insideValley?: number;
    outsideValley?: number;
  };
  visibility: "public" | "pending" | "blocked";
  rating?: number;
  reviewsCount?: number;
  printedPrice?: number;
  bookType?: string;
  language?: string;
  edition?: string;
  negotiable?: boolean;
  sellerName?: string;
  phone?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookSchema: Schema = new Schema<IBook>(
  {
    type: {
      type: String,
      required: true,
      enum: ["free", "physical", "second-hand"],
    },

    title: { type: String, required: true },
    author: { type: String, required: true },
    category: { type: String, required: true },
    genre: { type: String },

    description: { type: String },
    coverImage: { type: String },
    additionalImages: [{ type: String }],

    uploader: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    pdfUrl: { type: String },

    price: { type: Number },
    mrp: { type: Number },

    stock: { type: Number },

    condition: {
      type: String,
      enum: ["new", "used-good", "used-ok"],
    },

    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
    },

    deliveryInfo: {
      insideValley: { type: Number },
      outsideValley: { type: Number },
    },

    visibility: {
      type: String,
      enum: ["public", "pending", "blocked"],
      required: true,
    },

    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    printedPrice: { type: Number },
    bookType: { type: String },
    language: { type: String },
    edition: { type: String },
    negotiable: { type: Boolean },
    sellerName: { type: String },
    phone: { type: String },
    location: { type: String },
  },
  {
    timestamps: true,
  }
);


const Book: Model<IBook> = mongoose.model<IBook>("Book", BookSchema);

export default Book;
