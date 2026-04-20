"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteConversation = exports.getMessages = exports.getUserConversations = exports.createOrGetConversation = void 0;
const conversation_model_1 = __importDefault(require("./models/conversation.model"));
const message_model_1 = __importDefault(require("./models/message.model"));
const book_model_1 = __importDefault(require("../book/book.model"));
const user_model_1 = __importDefault(require("../user/user.model"));
const vendor_model_1 = __importDefault(require("../vendor/vendor.model")); // ← added
const http_status_codes_1 = require("http-status-codes");
const logger_1 = __importDefault(require("../../utils/logger"));
const createOrGetConversation = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { bookId, receiverId } = req.body;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                message: "User not authenticated",
            });
        }
        if (bookId) {
            const book = await book_model_1.default.findById(bookId);
            if (!book) {
                return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                    message: "Book not found",
                });
            }
            if (!["second-hand", "physical"].includes(book.type)) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    message: "Chat is only available for second-hand and physical books",
                });
            }
            // ── FIX: vendorId is a Vendor doc ID, not a User ID ──────
            // We need to resolve it to a User ID first
            let sellerId = null;
            if (book.vendorId) {
                // Book uploaded by a vendor — find the vendor's userId
                const vendor = await vendor_model_1.default.findById(book.vendorId).lean();
                if (vendor?.userId) {
                    sellerId = vendor.userId;
                }
            }
            // Fallback to uploader (for second-hand books uploaded by learners)
            if (!sellerId && book.uploader) {
                sellerId = book.uploader;
            }
            // ──────────────────────────────────────────────────────────
            if (!sellerId) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    message: "Book has no associated seller",
                });
            }
            if (sellerId.toString() === userId) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    message: "You cannot chat with yourself",
                });
            }
            const seller = await user_model_1.default.findById(sellerId);
            if (!seller) {
                return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                    message: "Seller not found",
                });
            }
            let conversation = await conversation_model_1.default.findOne({
                participants: { $all: [userId, sellerId] },
                bookId: bookId,
            })
                .populate("participants", "name email role avatar")
                .populate("bookId", "title type coverImage price");
            if (!conversation) {
                conversation = await conversation_model_1.default.create({
                    participants: [userId, sellerId],
                    bookId: bookId,
                });
                conversation = (await conversation_model_1.default.findById(conversation._id)
                    .populate("participants", "name email role avatar")
                    .populate("bookId", "title type coverImage price"));
            }
            return res.status(http_status_codes_1.StatusCodes.OK).json(conversation);
        }
        if (receiverId) {
            if (receiverId.toString() === userId) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    message: "You cannot chat with yourself",
                });
            }
            const receiver = await user_model_1.default.findById(receiverId);
            if (!receiver) {
                return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                    message: "User not found",
                });
            }
            let conversation = await conversation_model_1.default.findOne({
                participants: { $all: [userId, receiverId] },
                bookId: { $exists: false },
            }).populate("participants", "name email role avatar");
            if (!conversation) {
                conversation = await conversation_model_1.default.create({
                    participants: [userId, receiverId],
                });
                conversation = (await conversation_model_1.default.findById(conversation._id).populate("participants", "name email role avatar"));
            }
            return res.status(http_status_codes_1.StatusCodes.OK).json(conversation);
        }
        return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
            message: "Either bookId or receiverId is required",
        });
    }
    catch (error) {
        logger_1.default.error("Create conversation error");
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to create conversation",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.createOrGetConversation = createOrGetConversation;
const getUserConversations = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                message: "User not authenticated",
            });
        }
        const conversations = await conversation_model_1.default.find({
            participants: userId,
        })
            .populate("participants", "name email role avatar")
            .populate("bookId", "title type coverImage price")
            .sort({ updatedAt: -1 });
        res.status(http_status_codes_1.StatusCodes.OK).json(conversations);
    }
    catch (error) {
        logger_1.default.error("Get conversations error");
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to get conversations",
        });
    }
};
exports.getUserConversations = getUserConversations;
const getMessages = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { conversationId } = req.params;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                message: "User not authenticated",
            });
        }
        const conversation = await conversation_model_1.default.findById(conversationId);
        if (!conversation) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                message: "Conversation not found",
            });
        }
        if (!conversation.participants.includes(userId)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                message: "You are not a participant in this conversation",
            });
        }
        const messages = await message_model_1.default.find({ conversationId })
            .populate("senderId", "name email avatar")
            .populate("receiverId", "name email avatar")
            .sort({ createdAt: 1 });
        await message_model_1.default.updateMany({ conversationId, receiverId: userId, isRead: false }, { isRead: true });
        res.status(http_status_codes_1.StatusCodes.OK).json(messages);
    }
    catch (error) {
        logger_1.default.error("Get messages error");
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to get messages",
        });
    }
};
exports.getMessages = getMessages;
const deleteConversation = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { conversationId } = req.params;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                message: "User not authenticated",
            });
        }
        const conversation = await conversation_model_1.default.findById(conversationId);
        if (!conversation) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                message: "Conversation not found",
            });
        }
        if (!conversation.participants.includes(userId)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                message: "You are not a participant in this conversation",
            });
        }
        await message_model_1.default.deleteMany({ conversationId });
        await conversation_model_1.default.findByIdAndDelete(conversationId);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            message: "Conversation deleted successfully",
        });
    }
    catch (error) {
        logger_1.default.error("Delete conversation error");
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to delete conversation",
        });
    }
};
exports.deleteConversation = deleteConversation;
