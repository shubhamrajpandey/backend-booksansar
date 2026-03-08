"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEsewaPaymentCallback = exports.initiateEsewaPayment = void 0;
const esewa_service_1 = require("../../services/esewa.service");
const escrow_service_1 = require("../../services/escrow.service");
const order_model_1 = require("../order/order.model");
const book_model_1 = __importDefault(require("../book/book.model"));
const logger_1 = __importDefault(require("../../utils/logger"));
const initiateEsewaPayment = async (req, res) => {
    try {
        const customerId = req.user?.id;
        if (!customerId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const { items, contact, shippingAddress, shippingMethod, shippingCost, subtotal, totalAmount, } = req.body;
        if (!items?.length) {
            return res
                .status(400)
                .json({ success: false, message: "No items in order" });
        }
        const bookIds = items.map((i) => i.bookId);
        const books = await book_model_1.default.find({ _id: { $in: bookIds } }).lean();
        const bookMap = new Map(books.map((b) => [String(b._id), b]));
        const resolvedItems = items.map((item) => {
            const book = bookMap.get(String(item.bookId));
            if (!book)
                throw new Error(`Book ${item.bookId} not found`);
            if (!book.vendorId) {
                throw new Error(`Book "${book.title}" has no vendor assigned. Cannot process order.`);
            }
            return {
                bookId: book._id,
                title: book.title,
                author: book.author,
                image: book.coverImage || "",
                price: book.price ?? 0,
                bookType: book.type,
                vendorId: book.vendorId,
            };
        });
        const verifiedSubtotal = resolvedItems.reduce((sum, i) => sum + i.price, 0);
        const verifiedShipping = shippingMethod === "express" ? 150 : 0;
        const verifiedTotal = verifiedSubtotal + verifiedShipping;
        const transactionUuid = `BS-${Date.now()}`;
        const escrow = (0, escrow_service_1.calculateEscrow)(verifiedTotal);
        const order = new order_model_1.Order({
            orderId: transactionUuid,
            customerId,
            contact,
            items: resolvedItems,
            shippingAddress,
            shippingMethod: shippingMethod || "standard",
            shippingCost: verifiedShipping,
            subtotal: verifiedSubtotal,
            totalAmount: verifiedTotal,
            status: "pending_payment",
            payment: {
                method: "esewa",
                transactionUuid,
            },
            escrow: {
                status: "holding",
                ...escrow,
            },
            statusHistory: [{ status: "pending_payment", changedAt: new Date() }],
        });
        await order.save();
        const formData = (0, esewa_service_1.buildEsewaFormData)({
            amount: verifiedTotal,
            transactionUuid,
        });
        return res.status(201).json({
            success: true,
            data: {
                formData,
                paymentUrl: esewa_service_1.ESEWA_PAYMENT_URL,
                orderId: transactionUuid,
            },
        });
    }
    catch (err) {
        logger_1.default.error("eSewa initiate error");
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to initiate payment",
        });
    }
};
exports.initiateEsewaPayment = initiateEsewaPayment;
const verifyEsewaPaymentCallback = async (req, res) => {
    const { data } = req.query;
    if (!data) {
        return res
            .status(400)
            .json({ success: false, message: "No payment data received" });
    }
    try {
        const result = await (0, esewa_service_1.verifyEsewaPayment)(data);
        if (!result.verified) {
            return res
                .status(400)
                .json({ success: false, message: "Payment verification failed" });
        }
        const order = await order_model_1.Order.findOneAndUpdate({
            orderId: result.transactionUuid,
            status: "pending_payment",
        }, {
            status: "payment_received",
            "payment.transactionCode": result.transactionCode,
            "payment.verifiedAt": new Date(),
            $push: {
                statusHistory: {
                    status: "payment_received",
                    changedAt: new Date(),
                    note: `eSewa transaction ${result.transactionCode}`,
                },
            },
        }, { new: true });
        if (!order) {
            return res
                .status(200)
                .json({ success: true, message: "Already processed" });
        }
        return res.json({
            success: true,
            message: "Payment verified. Order placed successfully.",
            data: {
                orderId: order.orderId,
                totalAmount: order.totalAmount,
                escrow: order.escrow,
            },
        });
    }
    catch (err) {
        logger_1.default.error("eSewa verification error");
        return res
            .status(500)
            .json({ success: false, message: "Verification failed" });
    }
};
exports.verifyEsewaPaymentCallback = verifyEsewaPaymentCallback;
