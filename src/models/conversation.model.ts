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
  },
  { timestamps: true },
);

export default model("Conversation", conversationSchema);
