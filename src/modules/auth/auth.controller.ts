import { Request, Response } from "express";
import User from "../user/user.model";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Vendor from "../vendor/vendor.model";

//user registration
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
      message: "User Successfully Created",
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

//user login
export const userLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

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

    if (user.role === "vendor") {
      const vendorProfile = await Vendor.findOne({ userId: user._id });
      if (!vendorProfile) {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: "Vendor profile not found.",
        });
      }

      if (vendorProfile.status !== "approved") {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: "Vendor profile not approved yet.",
        });
      }
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "12h" },
    );

    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Successfully Logged In.",
      token,
      user: safeUser,
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

//Vendor Registration
export const vendorRegistration = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      storeName,
      businessType,
      address,
      province,
      district,
      businessCertUrl,
      governmentIdUrl,
      panVatNumber,
      storeLogoUrl,
      esewaId,
    } = req.body;

    const existingUser = await User.findOne({ email });

    if (
      !email ||
      !password ||
      !name ||
      !phoneNumber ||
      !storeName ||
      !businessType ||
      !address ||
      !province ||
      !district ||
      !businessCertUrl ||
      !governmentIdUrl ||
      !panVatNumber ||
      !esewaId
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "All required fields must be provided for vendor registration",
      });
    }

    if (existingUser) {
      if (existingUser.role === "vendor") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Vendor profile already exists for this email",
        });
      } else {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "An account with this email already exists",
        });
      }
    }

    if (!password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Password is required for new vendor",
      });
    }

    const genSalt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, genSalt);

    const newUser = await User.create({
      name,
      email,
      password: hashPassword,
      phoneNumber,
      role: "vendor",
    });

    const vendor = await Vendor.create({
      userId: newUser?._id,
      storeName,
      businessType,
      address,
      province,
      district,
      businessCertUrl,
      governmentIdUrl,
      panVatNumber,
      storeLogoUrl,
      esewaId,
      paymentType: "escrow",
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Vendor Successfully Created",
      newUser,
      vendor,
    });
  } catch (error: unknown) {
    console.error("Vendor registration error:", error);

    if (error instanceof Error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "An unexpected error occurred",
      });
    }
  }
};
