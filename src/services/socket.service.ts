import { Server, Socket } from "socket.io";
import jwt, { JwtPayload } from "jsonwebtoken";
import Message from "../models/message.model";
import Conversation from "../models/conversation.model";
import { SendMessagePayload } from "../types/chat";

export const initSocket = (server: any) => {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token as string;

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string,
      ) as JwtPayload & { id: string };

      socket.data.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    console.log("User connected:", socket.data.userId);
    socket.join(socket.data.userId);

    socket.on("join-conversation", (conversationId: string) => {
      socket.join(conversationId);
      console.log(`User ${socket.data.userId} joined conversation ${conversationId}`);
    });

    socket.on("leave-conversation", (conversationId: string) => {
      socket.leave(conversationId);
      console.log(`User ${socket.data.userId} left conversation ${conversationId}`);
    });

    socket.on("send-message", async (data: SendMessagePayload) => {
      try {
        const conversation = await Conversation.findById(data.conversationId);

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

        const message = await Message.create({
          conversationId: data.conversationId,
          senderId: socket.data.userId,
          receiverId: data.receiverId,
          text: data.text,
        });

        const populatedMessage = await Message.findById(message._id)
          .populate("senderId", "name email avatar")
          .populate("receiverId", "name email avatar");

        await Conversation.findByIdAndUpdate(data.conversationId, {
          lastMessage: data.text,
          updatedAt: new Date(),
        });

        io.to(data.conversationId).emit("receive-message", populatedMessage);
        
        io.to(data.receiverId).emit("new-message-notification", {
          conversationId: data.conversationId,
          message: populatedMessage,
        });

        const updatedConversation = await Conversation.findById(data.conversationId)
          .populate("participants", "name email role avatar")
          .populate("bookId", "title type coverImage price");

        io.to(socket.data.userId).emit("conversation-updated", updatedConversation);
        io.to(data.receiverId).emit("conversation-updated", updatedConversation);

      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("message-error", { error: "Failed to send message" });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.data.userId);
    });
  });

  return io;
};