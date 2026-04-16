import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Comment } from "./comment.model";

export const getComments = async (req: Request, res: Response) => {
    try {
        const { bookId } = req.params;
        const { page } = req.query;

        const filter: any = { bookId };
        if (page) filter.page = Number(page);

        const comments = await Comment.find(filter)
            .populate("userId", "name avatar")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return res.status(StatusCodes.OK).json({ success: true, data: comments });
    } catch (error: any) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message,
        });
    }
};

export const addComment = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { bookId, content, page } = req.body;

        if (!content?.trim()) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Comment cannot be empty.",
            });
        }

        if (content.length > 500) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Comment must be under 500 characters.",
            });
        }

        const comment = await Comment.create({
            bookId,
            userId,
            content: content.trim(),
            page: page || null,
        });

        const populated = await Comment.findById(comment._id)
            .populate("userId", "name avatar")
            .lean();

        return res.status(StatusCodes.CREATED).json({
            success: true,
            data: populated,
        });
    } catch (error: any) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message,
        });
    }
};

export const deleteComment = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { commentId } = req.params;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Comment not found.",
            });
        }

        if (String(comment.userId) !== String(userId)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                success: false,
                message: "You can only delete your own comments.",
            });
        }

        await Comment.findByIdAndDelete(commentId);

        return res.status(StatusCodes.OK).json({
            success: true,
            message: "Comment deleted.",
        });
    } catch (error: any) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message,
        });
    }
};