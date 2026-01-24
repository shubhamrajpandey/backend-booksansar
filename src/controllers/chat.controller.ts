import { Request, Response } from "express";
import Conversation from "../models/conversation.model";
import Message from "../models/message.model";
import { StatusCodes } from "http-status-codes";

export const createOrGetConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { receiverId } = req.body;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "User not authenticated",
      });
    }

    if (!receiverId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "receiverId is required",
      });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, receiverId] },
    }).populate("participants", "name email role");

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, receiverId],
      });

      conversation = (await Conversation.findById(conversation._id).populate(
        "participants",
        "name email role",
      )) as any;
    }

    res.status(StatusCodes.OK).json(conversation);
  } catch (error) {
    console.error("Create conversation error:", error);
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
      .populate("participants", "name email role")
      .sort({ updatedAt: -1 });

    res.status(StatusCodes.OK).json(conversations);
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to get conversations",
    });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({ conversationId }).sort({
      createdAt: 1,
    });

    res.status(StatusCodes.OK).json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to get messages",
    });
  }
};
