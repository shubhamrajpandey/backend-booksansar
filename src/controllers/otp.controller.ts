import OTP from "../models/otp.model";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import sendEmail from "../services/mail.service";
import { StatusCodes } from "http-status-codes";

export const sendOtp = async (req: Request, res: Response) => {
    try {
        const {email} = req.body;

    const findEmail = await OTP.findOne({email});

    if(!findEmail){
        return  res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Please enter register email.", 
          })
    }

    const otpGenerate = Math.floor(100000 + Math.random() * 900000);

    const hashOtp = await bcrypt.hash(otpGenerate.toString(),10);

    const otpRecord = await OTP.create({
        email,
        otp: hashOtp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        used: false,
    })

    await sendEmail(
        email,
        "BookSansar- OTP Verification",
        `Your OTP is: ${otpGenerate}`,
        `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border:1px solid #e0e0e0; border-radius:10px; overflow:hidden;">
      <div style="background-color:#28a745; color:white; text-align:center; padding:20px;">
        <h1>BookSansar</h1>
      </div>
      <div style="padding:30px; text-align:center;">
        <h2 style="color:#333;">Email Verification</h2>
      
        <p>Your One-Time Password (OTP) for verification is:</p>
        <div style="display:inline-block; border:2px dashed #28a745; border-radius:10px; padding:15px 30px; margin:20px 0;">
          <span style="font-size:32px; font-weight:bold; color:#28a745;">${otpGenerate}</span>
        </div>
        <p>This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p>If you didn’t request this, please ignore this email.</p>
      </div>
      <div style="background-color:#f5f5f5; text-align:center; padding:15px; font-size:12px; color:#888;">
        &copy; 2025 BookSansar
      </div>
    </div>
    `
    );

    console.log(`OTP sent to ${email}: ${otpGenerate}`);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "OTP sent successfully",
      otpRequestId: otpRecord._id, 
    });
    } catch (error: unknown) {
        console.error(" Error sending OTP:", error);
   

    if(error instanceof Error){
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message,
          });
    }else{
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to send OTP",
          });
    }
    }
} 

export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const{otpRequestId, otp} = req.body;

        const record = await OTP.findById({otpRequestId});

        if(!record){
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "No OTP request found for this email",
              });
        }

        if (expiresAt < new Date()) {
            return res.status(StatusCodes.BAD_REQUEST).json({
              success: false,
              message: "OTP has expired",
            });
          }

        const isMatching = await bcrypt.compare(otp.toString(),record.otp);

        if(!isMatching){
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid OTP",
              });
        }

        record.used = true;
        record.save;

        res.status(StatusCodes.OK).json({
            success: true,
            message: "OTP verified successfully",
          });
    } catch (error) {
        if (error instanceof Error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
              });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to send OTP",
              });
        }
    }
}