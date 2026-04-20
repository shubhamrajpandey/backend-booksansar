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
const RiderApplicationSchema = new mongoose_1.Schema({
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    age: { type: Number, required: true, min: 18, max: 60 },
    address: { type: String, required: true },
    district: { type: String, required: true },
    esewaId: { type: String, required: true },
    vehicleType: {
        type: String,
        enum: ["motorcycle", "scooter", "bicycle", "electric_bike"],
        required: true,
    },
    licenseNumber: { type: String, required: true },
    experience: {
        type: String,
        enum: ["none", "less_1", "1_2", "2_plus"],
        required: true,
    },
    availability: {
        type: String,
        enum: ["Full Time", "Part Time", "Weekdays Only", "Weekends Only"],
        required: true,
    },
    message: { type: String, default: "" },
    licenseUrl: { type: String, required: true },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    rejectionReason: { type: String, default: "" },
    riderId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });
RiderApplicationSchema.index({ email: 1 });
RiderApplicationSchema.index({ status: 1, createdAt: -1 });
const RiderApplication = mongoose_1.default.model("RiderApplication", RiderApplicationSchema);
exports.default = RiderApplication;
