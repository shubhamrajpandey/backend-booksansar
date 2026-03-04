import mongoose from "mongoose";

export interface IGenre extends mongoose.Document {
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}


const genreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Genre = mongoose.model("Genre", genreSchema);

export default Genre;