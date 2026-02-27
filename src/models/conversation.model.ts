import { Schema, model, Types } from "mongoose";

const conversationSchema = new Schema(
  {
    participants: [
      {
        type: Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    bookId: {
      type: Types.ObjectId,
      ref: "Book",
      required: false,
    },
    lastMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, bookId: 1 });

export default model("Conversation", conversationSchema);
