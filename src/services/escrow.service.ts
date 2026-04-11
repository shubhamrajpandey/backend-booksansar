export const COMMISSION_RATE = parseFloat(
  process.env.COMMISSION_RATE || "0.03",
);

export interface EscrowBreakdown {
  grossAmount: number;       // book price only (no delivery)
  commissionRate: number;    // 0.03
  commissionAmount: number;  // 3% of book price → BookSansar keeps
  vendorAmount: number;      // book price - commission → vendor gets
  deliveryCharge: number;    // delivery cost → goes entirely to rider
  riderAmount: number;       // same as deliveryCharge (100% to rider)
  totalAmount: number;       // grossAmount + deliveryCharge
}

// ─────────────────────────────────────────────────────────────
// calculateEscrow
//
// BEFORE (wrong): calculateEscrow(totalAmount)
//   → took 3% commission from delivery charge too
//
// AFTER (correct): calculateEscrow(bookPrice, deliveryCost)
//   → commission only on book price
//   → rider gets full delivery charge
//
// Example: Book Rs 500, Delivery Rs 80
//   commissionAmount = Rs 15   (3% of 500 only)
//   vendorAmount     = Rs 485  (500 - 15)
//   riderAmount      = Rs 80   (full delivery)
//   BookSansar keeps = Rs 15
// ─────────────────────────────────────────────────────────────
export const calculateEscrow = (
  bookPrice: number,
  deliveryCost: number = 0,
): EscrowBreakdown => {
  const commissionAmount = parseFloat(
    (bookPrice * COMMISSION_RATE).toFixed(2),
  );
  const vendorAmount = parseFloat(
    (bookPrice - commissionAmount).toFixed(2),
  );
  const riderAmount = parseFloat(deliveryCost.toFixed(2));
  const totalAmount = parseFloat((bookPrice + deliveryCost).toFixed(2));

  return {
    grossAmount: bookPrice,
    commissionRate: COMMISSION_RATE,
    commissionAmount,
    vendorAmount,
    deliveryCharge: riderAmount,
    riderAmount,
    totalAmount,
  };
};