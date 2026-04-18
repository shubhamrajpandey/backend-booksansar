import { OAuth2Client } from "google-auth-library";
import { Request, Response } from "express";
import User from "../user/user.model";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Vendor from "../vendor/vendor.model";
import OTP from "../otp/otp.model";
import sendEmail from "../../services/mail.service";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

//Google Login
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Google access token is required.",
      });
    }

    // Fetch user info from Google using the access token
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Invalid Google token.",
      });
    }

    const payload = await userInfoRes.json();
    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (user) {

      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }

      if (user.accountStatus === "suspended") {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: "Your account has been suspended.",
        });
      }

      if (user.role === "vendor") {
        const vendorProfile = await Vendor.findOne({ userId: user._id });
        if (!vendorProfile || vendorProfile.status !== "approved") {
          return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "Vendor profile not approved yet.",
          });
        }
      }
    } else {

      user = await User.create({
        name: name || email.split("@")[0],
        email,
        password: "",
        googleId,
        role: "learner",
        isVerified: true,
        accountStatus: "active",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isFirstLogin: user.isFirstLogin,
    };

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Successfully logged in with Google.",
      token,
      user: safeUser,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};

// Register
export const userRegister = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&*!]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.",
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (!name || !email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const findUser = await User.findOne({ email });

    if (findUser) {

      if (!findUser.isVerified) {

        await OTP.deleteMany({ user: findUser._id });

        const otpGenerate = Math.floor(100000 + Math.random() * 900000);
        const hashOtp = await bcrypt.hash(otpGenerate.toString(), 10);

        const otpRecord = await OTP.create({
          user: findUser._id,
          otp: hashOtp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          used: false,
        });

        await sendEmail(
          email,
          "BookSansar - Verify Your Email",
          `Your OTP is: ${otpGenerate}`,
          getOtpEmailHtml(name, otpGenerate),
        );

        return res.status(StatusCodes.OK).json({
          success: true,
          message: "OTP resent. Please verify your email.",
          otpRequestId: otpRecord._id,
          userId: findUser._id,
        });
      }

      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Email already exists. Please log in instead.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPass = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      password: hashPass,
      role: "learner",
      isVerified: false,
    });


    const otpGenerate = Math.floor(100000 + Math.random() * 900000);
    const hashOtp = await bcrypt.hash(otpGenerate.toString(), 10);

    const otpRecord = await OTP.create({
      user: newUser._id,
      otp: hashOtp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      used: false,
    });


    await sendEmail(
      email,
      "BookSansar - Verify Your Email",
      `Your OTP is: ${otpGenerate}`,
      getOtpEmailHtml(name, otpGenerate),
    );

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Registration successful! Please check your email for the OTP to verify your account.",
      otpRequestId: otpRecord._id,
      userId: newUser._id,
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

//Verify Email
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { otpRequestId, otp, userId } = req.body;

    if (!otpRequestId || !otp || !userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "OTP, request ID, and user ID are required.",
      });
    }

    const record = await OTP.findById(otpRequestId);
    if (!record) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid OTP request.",
      });
    }

    if (record.used) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "OTP already used.",
      });
    }

    if (record.expiresAt < new Date()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "OTP has expired. Please register again.",
      });
    }

    const isMatching = await bcrypt.compare(otp.toString(), record.otp);
    if (!isMatching) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }


    await User.findByIdAndUpdate(
      userId,
      { $set: { isVerified: true } },
      { new: true }
    );

    record.used = true;
    await record.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Email verified successfully! You can now log in.",
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};

//Login
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

    // Block unverified users — only for learners
    // Vendors and riders are verified through admin approval
    if (user.role === "learner" && !user.isVerified) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Please verify your email before logging in.",
        isVerified: false,
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

    if (user.role === "rider") {
      if (user.accountStatus !== "active") {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: "Rider account is not active.",
        });
      }
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" },
    );

    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isFirstLogin: user.isFirstLogin,
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
      isVerified: true, // vendors verified through admin KYC
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

//Change Password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user?.id;

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(userId, {
      password: hashed,
      isFirstLogin: false,
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }
};

//OTP Email HTML Template
const getOtpEmailHtml = (name: string, otp: number): string => `
  <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: auto; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
    <div style="background-color:#321874; color:#ffffff; text-align:center; padding:24px 0;">
      <h1 style="margin:0; font-size:28px; letter-spacing:1px;">
        <span style="color:#ffffff;">Book</span><span style="color:#E68A00;">Sansar</span>
      </h1>
      <p style="margin:6px 0 0; font-size:14px; color:#e0e0e0;">Your digital reading companion</p>
    </div>
    <div style="padding:32px 24px; text-align:center; color:#1f2937;">
      <h2 style="margin-bottom:12px; color:#321874;">Verify Your Email</h2>
      <p style="margin:0 0 8px; font-size:15px; color:#4b5563;">Hi ${name},</p>
      <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#4b5563;">
        Use the following OTP to verify your email and complete registration:
      </p>
      <div style="display:inline-block; background:#fdfaf6; border:2px solid #E68A00; border-radius:10px; padding:16px 40px; margin:20px 0;">
        <span style="font-size:36px; font-weight:700; color:#E68A00; letter-spacing:4px;">${otp}</span>
      </div>
      <p style="margin:16px 0 0; font-size:14px; color:#6b7280;">
        This OTP is valid for <strong style="color:#E68A00;">10 minutes</strong>. Do not share it with anyone.
      </p>
    </div>
    <div style="background-color:#f9fafb; text-align:center; padding:16px; font-size:13px; color:#9ca3af;">
      &copy; ${new Date().getFullYear()} <span style="color:#321874; font-weight:600;">BookSansar</span>. All rights reserved.
    </div>
  </div>
`;