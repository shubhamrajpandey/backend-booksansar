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
const mongoose_1 = __importStar(require("mongoose"));
const BookSchema = new mongoose_1.Schema({
    type: {
        type: String,
        required: true,
        enum: ["free", "physical", "second-hand", "free-notes"],
    },
    title: { type: String, required: true },
    author: { type: String, required: true },
    category: { type: String, required: true },
    genre: { type: String },
    description: { type: String },
    coverImage: { type: String, trim: true },
    additionalImages: [{ type: String, trim: true }],
    uploader: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Vendor",
    },
    deliveryInfo: {
        insideValley: { type: Number },
        outsideValley: { type: Number },
    },
    visibility: {
        type: String,
        enum: ["public", "pending", "rejected"],
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
}, {
    timestamps: true,
});
const Book = mongoose_1.default.model("Book", BookSchema);
exports.default = Book;
