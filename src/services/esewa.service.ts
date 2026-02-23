import crypto from "crypto";
import axios from "axios";

const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY!;
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE!;
const ESEWA_BASE_URL = process.env.ESEWA_BASE_URL!;
const ESEWA_STATUS_URL = process.env.ESEWA_STATUS_URL!;
const ESEWA_SUCCESS_URL = process.env.ESEWA_SUCCESS_URL!;
const ESEWA_FAILURE_URL = process.env.ESEWA_FAILURE_URL!;

export const ESEWA_PAYMENT_URL = `${ESEWA_BASE_URL}/api/epay/main/v2/form`;

export interface EsewaInitPayload {
  amount: number;
  transactionUuid: string;
}

export interface EsewaFormData {
  amount: number;
  tax_amount: number;
  total_amount: number;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: number;
  product_delivery_charge: number;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
}

export interface EsewaVerifyResult {
  verified: boolean;
  transactionCode?: string;
  transactionUuid?: string;
  totalAmount?: number;
  status?: string;
  raw?: any;
}

const generateSignature = (message: string): string => {
  const hmac = crypto.createHmac("sha256", ESEWA_SECRET_KEY);
  hmac.update(message);
  return hmac.digest("base64");
};

export const buildEsewaFormData = (
  payload: EsewaInitPayload,
): EsewaFormData => {
  const { amount, transactionUuid } = payload;

  const signatureMessage = `total_amount=${amount},transaction_uuid=${transactionUuid},product_code=${ESEWA_PRODUCT_CODE}`;
  const signature = generateSignature(signatureMessage);

  return {
    amount,
    tax_amount: 0,
    total_amount: amount,
    transaction_uuid: transactionUuid,
    product_code: ESEWA_PRODUCT_CODE,
    product_service_charge: 0,
    product_delivery_charge: 0,
    success_url: ESEWA_SUCCESS_URL,
    failure_url: ESEWA_FAILURE_URL,
    signed_field_names: "total_amount,transaction_uuid,product_code",
    signature,
  };
};

export const verifyEsewaPayment = async (
  encodedData: string,
): Promise<EsewaVerifyResult> => {
  const decoded = JSON.parse(
    Buffer.from(encodedData, "base64").toString("utf-8"),
  );

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
  const expectedSignature = generateSignature(signatureMessage);

  if (expectedSignature !== receivedSignature) {
    return { verified: false };
  }

  const statusRes = await axios.get(ESEWA_STATUS_URL, {
    params: {
      product_code: ESEWA_PRODUCT_CODE,
      total_amount,
      transaction_uuid,
    },
  });

  if (statusRes.data.status !== "COMPLETE") {
    return { verified: false, status: statusRes.data.status };
  }

  return {
    verified: true,
    transactionCode: transaction_code,
    transactionUuid: transaction_uuid,
    totalAmount: Number(total_amount),
    status: statusRes.data.status,
    raw: statusRes.data,
  };
};
