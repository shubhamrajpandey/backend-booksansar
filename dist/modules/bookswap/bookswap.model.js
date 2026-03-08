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
const SwapProposalSchema = new mongoose_1.Schema({
    proposerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
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
}, { timestamps: true });
const BookSwapSchema = new mongoose_1.Schema({
    ownerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
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
    acceptedProposalId: { type: mongoose_1.Schema.Types.ObjectId },
}, { timestamps: true });
BookSwapSchema.index({ status: 1, createdAt: -1 });
BookSwapSchema.index({ ownerId: 1 });
BookSwapSchema.index({ bookCategory: 1 });
const BookSwap = mongoose_1.default.model("BookSwap", BookSwapSchema);
exports.default = BookSwap;
