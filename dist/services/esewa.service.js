"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEsewaPayment = exports.buildEsewaFormData = exports.ESEWA_PAYMENT_URL = void 0;
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY;
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE;
const ESEWA_BASE_URL = process.env.ESEWA_BASE_URL;
const ESEWA_STATUS_URL = process.env.ESEWA_STATUS_URL;
const ESEWA_SUCCESS_URL = process.env.ESEWA_SUCCESS_URL;
const ESEWA_FAILURE_URL = process.env.ESEWA_FAILURE_URL;
exports.ESEWA_PAYMENT_URL = `${ESEWA_BASE_URL}/api/epay/main/v2/form`;
const generateSignature = (message) => {
    const hmac = crypto_1.default.createHmac("sha256", ESEWA_SECRET_KEY);
    hmac.update(message);
    return hmac.digest("base64");
};
const buildEsewaFormData = (payload) => {
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
exports.buildEsewaFormData = buildEsewaFormData;
const verifyEsewaPayment = async (encodedData) => {
    const decoded = JSON.parse(Buffer.from(encodedData, "base64").toString("utf-8"));
    const { transaction_code, status, total_amount, transaction_uuid, product_code, signed_field_names, signature: receivedSignature, } = decoded;
    const signatureMessage = `transaction_code=${transaction_code},status=${status},total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code},signed_field_names=${signed_field_names}`;
    const expectedSignature = generateSignature(signatureMessage);
    if (expectedSignature !== receivedSignature) {
        return { verified: false };
    }
    const statusRes = await axios_1.default.get(ESEWA_STATUS_URL, {
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
exports.verifyEsewaPayment = verifyEsewaPayment;
