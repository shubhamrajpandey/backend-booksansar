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
const ReadingSessionSchema = new mongoose_1.Schema({
    bookId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Book", required: true },
    startPage: { type: Number, required: true },
    endPage: { type: Number, required: true },
    pagesRead: { type: Number, required: true },
    durationMinutes: { type: Number, required: true },
    sessionDate: { type: Date, default: Date.now },
}, { _id: true });
const CurrentlyReadingSchema = new mongoose_1.Schema({
    bookId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Book", required: true },
    currentPage: { type: Number, default: 0 },
    totalPages: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    lastRead: { type: Date, default: Date.now },
    progressPercent: { type: Number, default: 0 },
}, { _id: false });
const ReadingStatsSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    booksRead: { type: Number, default: 0 },
    pagesRead: { type: Number, default: 0 },
    totalReadingTime: { type: Number, default: 0 },
    booksThisMonth: { type: Number, default: 0 },
    monthlyGoal: { type: Number, default: 10 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastReadDate: { type: Date, default: null },
    streakFreezeUsed: { type: Boolean, default: false },
    streakFreezeCount: { type: Number, default: 0 },
    favoriteGenre: { type: String, default: "" },
    genreCount: { type: Map, of: Number, default: {} },
    readBooks: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Book" }],
    currentlyReading: [CurrentlyReadingSchema],
    readingSessions: [ReadingSessionSchema],
}, { timestamps: true });
// ── Index for fast streak/session queries ──────────────────
ReadingStatsSchema.index({ userId: 1 });
ReadingStatsSchema.index({ "readingSessions.sessionDate": -1 });
const ReadingStats = mongoose_1.default.model("ReadingStats", ReadingStatsSchema);
exports.default = ReadingStats;
