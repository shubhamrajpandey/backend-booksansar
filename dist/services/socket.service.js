"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const message_model_1 = __importDefault(require("../modules/chat/models/message.model"));
const conversation_model_1 = __importDefault(require("../modules/chat/models/conversation.model"));
const logger_1 = __importDefault(require("../utils/logger"));
const initSocket = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: { origin: "*" },
    });
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error("Unauthorized"));
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            socket.data.userId = decoded.id;
            next();
        }
        catch (err) {
            next(new Error("Unauthorized"));
        }
    });
    io.on("connection", (socket) => {
        logger_1.default.info("User connected:", socket.data.userId);
        socket.join(socket.data.userId);
        socket.on("join-conversation", (conversationId) => {
            socket.join(conversationId);
            logger_1.default.info(`User ${socket.data.userId} joined conversation ${conversationId}`);
        });
        socket.on("leave-conversation", (conversationId) => {
            socket.leave(conversationId);
            logger_1.default.info(`User ${socket.data.userId} left conversation ${conversationId}`);
        });
        socket.on("send-message", async (data) => {
            try {
                const conversation = await conversation_model_1.default.findById(data.conversationId);
                if (!conversation) {
                    return socket.emit("message-error", {
                        error: "Conversation not found",
                    });
                }
                if (!conversation.participants.includes(socket.data.userId)) {
                    return socket.emit("message-error", {
                        error: "You are not a participant in this conversation",
                    });
                }
                const message = await message_model_1.default.create({
                    conversationId: data.conversationId,
                    senderId: socket.data.userId,
                    receiverId: data.receiverId,
                    text: data.text,
                });
                const populatedMessage = await message_model_1.default.findById(message._id)
                    .populate("senderId", "name email avatar")
                    .populate("receiverId", "name email avatar");
                await conversation_model_1.default.findByIdAndUpdate(data.conversationId, {
                    lastMessage: data.text,
                    updatedAt: new Date(),
                });
                io.to(data.conversationId).emit("receive-message", populatedMessage);
                io.to(data.receiverId).emit("new-message-notification", {
                    conversationId: data.conversationId,
                    message: populatedMessage,
                });
                const updatedConversation = await conversation_model_1.default.findById(data.conversationId)
                    .populate("participants", "name email role avatar")
                    .populate("bookId", "title type coverImage price");
                io.to(socket.data.userId).emit("conversation-updated", updatedConversation);
                io.to(data.receiverId).emit("conversation-updated", updatedConversation);
            }
            catch (error) {
                logger_1.default.error("Send message error");
                socket.emit("message-error", { error: "Failed to send message" });
            }
        });
        socket.on("disconnect", () => {
            logger_1.default.info("User disconnected:", socket.data.userId);
        });
    });
    return io;
};
exports.initSocket = initSocket;
