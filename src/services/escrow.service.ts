export const COMMISSION_RATE = parseFloat(
  process.env.COMMISSION_RATE || "0.03",
);

export interface EscrowBreakdown {
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  vendorAmount: number;
}

export const calculateEscrow = (grossAmount: number): EscrowBreakdown => {
  const commissionAmount = parseFloat(
    (grossAmount * COMMISSION_RATE).toFixed(2),
  );
  const vendorAmount = parseFloat((grossAmount - commissionAmount).toFixed(2));

  return {
    grossAmount,
    commissionRate: COMMISSION_RATE,
    commissionAmount,
    vendorAmount,
  };
};
