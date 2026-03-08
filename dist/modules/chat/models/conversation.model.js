"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const conversationSchema = new mongoose_1.Schema({
    participants: [
        {
            type: mongoose_1.Types.ObjectId,
            ref: "User",
            required: true,
        },
    ],
    bookId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Book",
        required: false,
    },
    lastMessage: {
        type: String,
        default: "",
    },
}, { timestamps: true });
conversationSchema.index({ participants: 1, bookId: 1 });
exports.default = (0, mongoose_1.model)("Conversation", conversationSchema);
