import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILearner extends Document {
  topinfo: string;
  requestBook: string;
  email: string;
  phoneNumber: number;
  des: string;
  rate: string;
  uploadFile: string;
}

const learnerSchema = new Schema({
  topinfo: {
    type: String,
  },
  requestBook: {
    type: String,
  },
  email: {
    type: String,
  },
  phoneNumber: {
    type: Number,
  },
  des: {
    type: String,
  },
  rate: {
    type: String,
  },
  uploadFile: {
    type: String,
  },
});

const learner: Model<ILearner> = mongoose.model<ILearner>(
  "Learner",
  learnerSchema,
);
export default learner;
