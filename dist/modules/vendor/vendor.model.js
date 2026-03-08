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
const vendorSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    storeName: { type: String, required: true },
    businessType: { type: String, required: true },
    address: { type: String, required: true },
    province: { type: String, required: true },
    district: { type: String, required: true },
    approved: { type: Boolean, default: false },
    businessCertUrl: { type: String, required: true },
    governmentIdUrl: { type: String, required: true },
    panVatNumber: { type: String, required: true },
    storeLogoUrl: { type: String },
    esewaId: { type: String, required: true },
    paymentType: {
        type: String,
        required: true,
        enum: ["escrow"],
        default: "escrow",
    },
    status: {
        type: String,
        default: "pending",
        enum: ["pending", "approved", "rejected"],
    },
}, { timestamps: true });
const Vendor = mongoose_1.default.model("Vendor", vendorSchema);
exports.default = Vendor;
