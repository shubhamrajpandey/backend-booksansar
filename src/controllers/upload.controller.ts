import { Response, Request } from "express";
import { uploadBufferToCloudinary } from "../config/cloud";
import { StatusCodes } from "http-status-codes";

export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileBuffer = req.file.buffer;

    const result = await uploadBufferToCloudinary(fileBuffer, "my_app");

    return res.status(StatusCodes.OK).json({
      message: "Successfully Image Upload",
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "An unexpected error occurred",
      });
    }
  }
};
