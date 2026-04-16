import mongoose, { Schema, Document } from "mongoose";

export interface IComment extends Document {
    bookId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    content: string;
    page?: number;
    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
    {
        bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, required: true, maxlength: 500 },
        page: { type: Number, default: null },
    },
    { timestamps: true },
);

CommentSchema.index({ bookId: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>("Comment", CommentSchema);