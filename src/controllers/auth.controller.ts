import { Request, Response } from "express";
import User from "../models/user.model";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const learnerRegister = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "All fields are required.",
      });
      return;
    }

    const findUser = await User.findOne({ email });

    if (findUser) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Email already exists. Please log in instead.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPass = await bcrypt.hash(password, salt);

    const register = await User.create({
      name,
      email,
      password: hashPass,
      role: "learner",
    });
    
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Successfully Created",
      data: register,
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
