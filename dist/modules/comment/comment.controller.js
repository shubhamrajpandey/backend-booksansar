"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteComment = exports.addComment = exports.getComments = void 0;
const http_status_codes_1 = require("http-status-codes");
const comment_model_1 = require("./comment.model");
const getComments = async (req, res) => {
    try {
        const { bookId } = req.params;
        const { page } = req.query;
        const filter = { bookId };
        if (page)
            filter.page = Number(page);
        const comments = await comment_model_1.Comment.find(filter)
            .populate("userId", "name avatar")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        return res.status(http_status_codes_1.StatusCodes.OK).json({ success: true, data: comments });
    }
    catch (error) {
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getComments = getComments;
const addComment = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { bookId, content, page } = req.body;
        if (!content?.trim()) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Comment cannot be empty.",
            });
        }
        if (content.length > 500) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Comment must be under 500 characters.",
            });
        }
        const comment = await comment_model_1.Comment.create({
            bookId,
            userId,
            content: content.trim(),
            page: page || null,
        });
        const populated = await comment_model_1.Comment.findById(comment._id)
            .populate("userId", "name avatar")
            .lean();
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            data: populated,
        });
    }
    catch (error) {
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message,
        });
    }
};
exports.addComment = addComment;
const deleteComment = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { commentId } = req.params;
        const comment = await comment_model_1.Comment.findById(commentId);
        if (!comment) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Comment not found.",
            });
        }
        if (String(comment.userId) !== String(userId)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                success: false,
                message: "You can only delete your own comments.",
            });
        }
        await comment_model_1.Comment.findByIdAndDelete(commentId);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Comment deleted.",
        });
    }
    catch (error) {
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message,
        });
    }
};
exports.deleteComment = deleteComment;
