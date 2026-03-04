import mongoose, { Schema, Document } from "mongoose";

export type OrderStatus =
  | "pending_payment"
  | "payment_received"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type EscrowStatus = "holding" | "released" | "refunded";

export interface IOrderItem {
  bookId: mongoose.Types.ObjectId;
  title: string;
  author: string;
  image: string;
  price: number;
  bookType: "free" | "physical" | "second-hand";
  vendorId: mongoose.Types.ObjectId;
}

export interface IShippingAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode?: string;
  province: string;
  country: string;
  shippingNote?: string;
}

export interface IEscrow {
  status: EscrowStatus;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  vendorAmount: number;
  releasedAt?: Date;
}

export interface IPaymentInfo {
  method: "esewa";
  transactionCode?: string;
  transactionUuid: string;
  verifiedAt?: Date;
}

export interface IOrder extends Document {
  orderId: string;
  customerId: mongoose.Types.ObjectId;
  contact: string;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  shippingMethod: "standard" | "express";
  shippingCost: number;
  subtotal: number;
  totalAmount: number;
  status: OrderStatus;
  payment: IPaymentInfo;
  escrow: IEscrow;
  statusHistory: { status: OrderStatus; changedAt: Date; note?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true },

    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    contact: { type: String, required: true },

    items: [
      {
        bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
        title: { type: String, required: true },
        author: { type: String, required: true },
        image: { type: String },
        price: { type: Number, required: true },
        bookType: {
          type: String,
          enum: ["free", "physical", "second-hand"],
          required: true,
        },
        vendorId: {
          type: Schema.Types.ObjectId,
          ref: "Vendor",
          required: true,
        },
      },
    ],

    shippingAddress: {
      firstName: { type: String },
      lastName: { type: String },
      address: { type: String },
      city: { type: String },
      postalCode: { type: String },
      province: { type: String },
      country: { type: String },
      shippingNote: { type: String },
    },

    shippingMethod: {
      type: String,
      enum: ["standard", "express"],
      default: "standard",
    },
    shippingCost: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    totalAmount: { type: Number, required: true },

    status: {
      type: String,
      enum: [
        "pending_payment",
        "payment_received",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending_payment",
    },

    payment: {
      method: { type: String, enum: ["esewa"], required: true },
      transactionCode: { type: String },
      transactionUuid: { type: String, required: true },
      verifiedAt: { type: Date },
    },

    escrow: {
      status: {
        type: String,
        enum: ["holding", "released", "refunded"],
        default: "holding",
      },
      grossAmount: { type: Number },
      commissionRate: { type: Number },
      commissionAmount: { type: Number },
      vendorAmount: { type: Number },
      releasedAt: { type: Date },
    },

    statusHistory: [
      {
        status: { type: String },
        changedAt: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
  },
  { timestamps: true },
);

OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ "items.vendorId": 1, createdAt: -1 });

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
