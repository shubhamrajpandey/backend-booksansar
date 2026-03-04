import mongoose, { Schema, Document, Model } from "mongoose";

export type SwapStatus = "open" | "pending" | "completed" | "cancelled";
export type ProposalStatus = "pending" | "accepted" | "rejected" | "cancelled";

export interface ISwapProposal {
  _id: mongoose.Types.ObjectId;
  proposerId: mongoose.Types.ObjectId;
  offeredBookTitle: string;
  offeredBookDescription: string;
  offeredBookImages: string[];
  offeredBookCondition: "new" | "used-good" | "used-ok";
  message?: string;
  status: ProposalStatus;
  createdAt: Date;
}

const SwapProposalSchema = new Schema<ISwapProposal>(
  {
    proposerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    offeredBookTitle: { type: String, required: true },
    offeredBookDescription: { type: String, required: true },
    offeredBookImages: [{ type: String, trim: true }],
    offeredBookCondition: {
      type: String,
      enum: ["new", "used-good", "used-ok"],
      required: true,
    },
    message: { type: String },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export interface IBookSwap extends Document {
  ownerId: mongoose.Types.ObjectId;
  bookTitle: string;
  bookAuthor: string;
  bookDescription: string;
  bookImages: string[];
  bookCondition: "new" | "used-good" | "used-ok";
  bookCategory?: string;
  bookLanguage?: string;
  wantedBookTitle?: string;
  wantedBookDescription: string;
  wantedBookCategory?: string;
  location?: string;
  preferLocalSwap: boolean;
  status: SwapStatus;
  proposals: ISwapProposal[];
  acceptedProposalId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BookSwapSchema = new Schema<IBookSwap>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    bookTitle: { type: String, required: true },
    bookAuthor: { type: String, required: true },
    bookDescription: { type: String, required: true },
    bookImages: [{ type: String, trim: true }],
    bookCondition: {
      type: String,
      enum: ["new", "used-good", "used-ok"],
      required: true,
    },
    bookCategory: { type: String },
    bookLanguage: { type: String },

    wantedBookTitle: { type: String },
    wantedBookDescription: { type: String, required: true },
    wantedBookCategory: { type: String },
    location: { type: String },
    preferLocalSwap: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["open", "pending", "completed", "cancelled"],
      default: "open",
    },

    proposals: [SwapProposalSchema],

    acceptedProposalId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

BookSwapSchema.index({ status: 1, createdAt: -1 });
BookSwapSchema.index({ ownerId: 1 });
BookSwapSchema.index({ bookCategory: 1 });

const BookSwap: Model<IBookSwap> = mongoose.model<IBookSwap>(
  "BookSwap",
  BookSwapSchema,
);

export default BookSwap;
