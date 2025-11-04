import { Request, Response } from "express";
import User from "../models/user.model";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const userRegister = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (!name || !email || !password) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "All fields are required.",
      });
      return;
    }

    const findUser = await User.findOne({ email });

    if (findUser) {
      return res.status(StatusCodes.BAD_REQUEST).json({
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

export const userLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User not found. Please login.",
      });
    }

    const isMatching = await bcrypt.compare(password, user.password);
    if (!isMatching) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Invalid credentials. Please try again.",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "12h" }
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Successfully Logged In.",
      token,
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
