"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEscrow = exports.COMMISSION_RATE = void 0;
exports.COMMISSION_RATE = parseFloat(process.env.COMMISSION_RATE || "0.03");
// BookSansar also takes fixed Rs 15 from delivery charge
// Rider gets: deliveryCharge - 15
// Example: Rs 80 delivery → rider gets Rs 65, BookSansar gets Rs 15
const DELIVERY_COMMISSION = 15;
// ─────────────────────────────────────────────────────────────
// Example: Book Rs 500, Delivery Rs 80
//   bookCommission   = Rs 15   (3% of Rs 500)
//   deliveryCommission = Rs 15 (fixed from delivery)
//   vendorAmount     = Rs 485  (500 - 15)
//   riderAmount      = Rs 65   (80 - 15)
//   BookSansar keeps = Rs 30   (15 + 15)
// ─────────────────────────────────────────────────────────────
const calculateEscrow = (bookPrice, deliveryCost = 0) => {
    const bookCommission = parseFloat((bookPrice * exports.COMMISSION_RATE).toFixed(2));
    const vendorAmount = parseFloat((bookPrice - bookCommission).toFixed(2));
    // BookSansar takes Rs 15 from delivery, rider gets the rest
    const deliveryCommission = deliveryCost > 0 ? DELIVERY_COMMISSION : 0;
    const riderAmount = parseFloat(Math.max(0, deliveryCost - deliveryCommission).toFixed(2));
    // Total commission = book commission + delivery commission
    const commissionAmount = parseFloat((bookCommission + deliveryCommission).toFixed(2));
    const totalAmount = parseFloat((bookPrice + deliveryCost).toFixed(2));
    return {
        grossAmount: bookPrice,
        commissionRate: exports.COMMISSION_RATE,
        commissionAmount,
        vendorAmount,
        deliveryCharge: deliveryCost,
        riderAmount,
        totalAmount,
    };
};
exports.calculateEscrow = calculateEscrow;
