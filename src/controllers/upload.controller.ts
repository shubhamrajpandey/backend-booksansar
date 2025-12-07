import { Response, Request } from "express";
import { uploadBufferToCloudinary } from "../config/cloud";
import { StatusCodes } from "http-status-codes";

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "No file uploaded" });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, "booksansar_uploads");

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "File uploaded successfully",
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
    });
  } catch (error: any) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Upload failed",
    });
  }
};
