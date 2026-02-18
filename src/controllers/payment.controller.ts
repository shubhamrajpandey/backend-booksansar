// backend-booksansar/src/controllers/payment.controller.ts
import { Request, Response } from "express";
import crypto from "crypto";
import axios from "axios";

const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";
const ESEWA_SUCCESS_URL = process.env.ESEWA_SUCCESS_URL || "http://localhost:3000/checkout/payment/success";
const ESEWA_FAILURE_URL = process.env.ESEWA_FAILURE_URL || "http://localhost:3000/checkout/payment/failure";

const generateSignature = (message: string, secretKey: string): string => {
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(message);
  return hmac.digest("base64");
};

export const initiateEsewaPayment = (req: Request, res: Response) => {
  const { amount, orderId } = req.body;

  const totalAmount = Number(amount);
  const transactionUuid = orderId || `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  const signatureMessage = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${ESEWA_PRODUCT_CODE}`;
  const signature = generateSignature(signatureMessage, ESEWA_SECRET_KEY);

  res.json({
    success: true,
    data: {
      amount: totalAmount,
      tax_amount: 0,
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: ESEWA_PRODUCT_CODE,
      product_service_charge: 0,
      product_delivery_charge: 0,
      success_url: ESEWA_SUCCESS_URL,
      failure_url: ESEWA_FAILURE_URL,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature,
    },
  });
};

export const verifyEsewaPayment = async (req: Request, res: Response) => {
  const { data } = req.query;

  if (!data) {
    return res.status(400).json({ success: false, message: "No data received" });
  }

  try {
    const decoded = JSON.parse(Buffer.from(data as string, "base64").toString("utf-8"));

    const {
      transaction_code,
      status,
      total_amount,
      transaction_uuid,
      product_code,
      signed_field_names,
      signature: receivedSignature,
    } = decoded;

    const signatureMessage = `transaction_code=${transaction_code},status=${status},total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code},signed_field_names=${signed_field_names}`;
    const expectedSignature = generateSignature(signatureMessage, ESEWA_SECRET_KEY);

    if (expectedSignature !== receivedSignature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const statusRes = await axios.get(
      `https://rc.esewa.com.np/api/epay/transaction/status/`,
      {
        params: {
          product_code: ESEWA_PRODUCT_CODE,
          total_amount,
          transaction_uuid,
        },
      }
    );

    if (statusRes.data.status !== "COMPLETE") {
      return res.status(400).json({ success: false, message: "Payment not complete" });
    }

    return res.json({
      success: true,
      message: "Payment verified successfully",
      transaction: statusRes.data,
    });
  } catch (err) {
    console.error("eSewa verification error:", err);
    return res.status(500).json({ success: false, message: "Verification failed" });
  }
};