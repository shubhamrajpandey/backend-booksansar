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

        await Conversation.findByIdAndUpdate(data.conversationId, {
          lastMessage: data.text,
          updatedAt: new Date(),
        });

        io.to(data.receiverId).emit("receive-message", message);
        socket.emit("receive-message", message);
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