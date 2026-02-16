import { StatusCodes } from "http-status-codes";
import { Response, Request } from "express";
import learner from "../models/learner.model";

export const getlearner = async (req: Request, res: Response) => {
  try {
    const info = await learner.find();
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Top info get successfully",
      data: info,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const addLearner = async (req: Request, res: Response) => {
  try {
    const { topinfo, requestBook, email, phoneNumber, des, rate, uploadFile } = req.body;
    const info = await learner.create({
        topinfo, requestBook, email, phoneNumber, des, rate, uploadFile
    });
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Successfully send",
      data: info,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const UpdateTopinfo = async (req: Request, res: Response) => {
  try {
    const info = await learner.findById(req.params.id);
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Top info update successfully",
      data: info,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const 