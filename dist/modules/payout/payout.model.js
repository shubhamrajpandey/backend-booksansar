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
exports.Payout = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PayoutSchema = new mongoose_1.Schema({
    payoutId: { type: String, required: true, unique: true },
    vendorId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Vendor", required: true },
    requestedAmount: { type: Number, required: true },
    commissionDeducted: { type: Number, required: true },
    netAmount: { type: Number, required: true },
    esewaId: { type: String, required: true },
    status: {
        type: String,
        enum: ["pending", "processing", "paid", "rejected"],
        default: "pending",
    },
    note: { type: String },
    adminNote: { type: String },
    processedAt: { type: Date },
}, { timestamps: true });
PayoutSchema.index({ vendorId: 1, createdAt: -1 });
PayoutSchema.index({ status: 1 });
exports.Payout = mongoose_1.default.model("Payout", PayoutSchema);
