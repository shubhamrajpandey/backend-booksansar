import { Request, Response } from "express";
import Conversation from "./models/conversation.model";
import Message from "./models/message.model";
import Book from "../book/book.model";
import User from "../user/user.model";
import Vendor from "../vendor/vendor.model"; // ← added
import { StatusCodes } from "http-status-codes";
import logger from "../../utils/logger";

export const createOrGetConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { bookId, receiverId } = req.body;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "User not authenticated",
      });
    }

    if (bookId) {
      const book = await Book.findById(bookId);

      if (!book) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "Book not found",
        });
      }

      if (!["second-hand", "physical"].includes(book.type)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Chat is only available for second-hand and physical books",
        });
      }

      // ── FIX: vendorId is a Vendor doc ID, not a User ID ──────
      // We need to resolve it to a User ID first
      let sellerId: any = null;

      if (book.vendorId) {
        // Book uploaded by a vendor — find the vendor's userId
        const vendor = await Vendor.findById(book.vendorId).lean();
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
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Book has no associated seller",
        });
      }

      if (sellerId.toString() === userId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "You cannot chat with yourself",
        });
      }

      const seller = await User.findById(sellerId);
      if (!seller) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "Seller not found",
        });
      }

      let conversation = await Conversation.findOne({
        participants: { $all: [userId, sellerId] },
        bookId: bookId,
      })
        .populate("participants", "name email role avatar")
        .populate("bookId", "title type coverImage price");

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [userId, sellerId],
          bookId: bookId,
        });

        conversation = (await Conversation.findById(conversation._id)
          .populate("participants", "name email role avatar")
          .populate("bookId", "title type coverImage price")) as any;
      }

      return res.status(StatusCodes.OK).json(conversation);
    }

    if (receiverId) {
      if (receiverId.toString() === userId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "You cannot chat with yourself",
        });
      }

      const receiver = await User.findById(receiverId);
      if (!receiver) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "User not found",
        });
      }

      let conversation = await Conversation.findOne({
        participants: { $all: [userId, receiverId] },
        bookId: { $exists: false },
      }).populate("participants", "name email role avatar");

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [userId, receiverId],
        });

        conversation = (await Conversation.findById(conversation._id).populate(
          "participants",
          "name email role avatar",
        )) as any;
      }

      return res.status(StatusCodes.OK).json(conversation);
    }

    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Either bookId or receiverId is required",
    });
  } catch (error) {
    logger.error("Create conversation error");
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to create conversation",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getUserConversations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "User not authenticated",
      });
    }

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "name email role avatar")
      .populate("bookId", "title type coverImage price")
      .sort({ updatedAt: -1 });

    res.status(StatusCodes.OK).json(conversations);
  } catch (error) {
    logger.error("Get conversations error");
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to get conversations",
    });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "User not authenticated",
      });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Conversation not found",
      });
    }

    if (!conversation.participants.includes(userId as any)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: "You are not a participant in this conversation",
      });
    }

    const messages = await Message.find({ conversationId })
      .populate("senderId", "name email avatar")
      .populate("receiverId", "name email avatar")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { conversationId, receiverId: userId, isRead: false },
      { isRead: true },
    );

    res.status(StatusCodes.OK).json(messages);
  } catch (error) {
    logger.error("Get messages error");
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to get messages",
    });
  }
};

export const deleteConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "User not authenticated",
      });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Conversation not found",
      });
    }

    if (!conversation.participants.includes(userId as any)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: "You are not a participant in this conversation",
      });
    }

    await Message.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);

    res.status(StatusCodes.OK).json({
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    logger.error("Delete conversation error");
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to delete conversation",
    });
  }
};