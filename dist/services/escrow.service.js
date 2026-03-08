"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEscrow = exports.COMMISSION_RATE = void 0;
exports.COMMISSION_RATE = parseFloat(process.env.COMMISSION_RATE || "0.03");
const calculateEscrow = (grossAmount) => {
    const commissionAmount = parseFloat((grossAmount * exports.COMMISSION_RATE).toFixed(2));
    const vendorAmount = parseFloat((grossAmount - commissionAmount).toFixed(2));
    return {
        grossAmount,
        commissionRate: exports.COMMISSION_RATE,
        commissionAmount,
        vendorAmount,
    };
};
exports.calculateEscrow = calculateEscrow;
