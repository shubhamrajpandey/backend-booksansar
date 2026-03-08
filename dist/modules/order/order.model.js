"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const OrderSchema = new mongoose_1.Schema({
    orderId: { type: String, required: true, unique: true },
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    contact: { type: String, required: true },
    items: [
        {
            bookId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Book", required: true },
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
                type: mongoose_1.Schema.Types.ObjectId,
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
}, { timestamps: true });
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ "items.vendorId": 1, createdAt: -1 });
exports.Order = mongoose_1.default.model("Order", OrderSchema);
