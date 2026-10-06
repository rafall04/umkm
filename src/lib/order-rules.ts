/**
 * Aturan bisnis order — murni (tanpa DB) supaya mudah diuji.
 */

type StaleOrder = {
  status: string;
  paymentMethod: string;
  expiredAt: Date | null;
  createdAt: Date;
};

/** Batas bayar order TRANSFER bila tidak ada expiredAt dari gateway. */
export const TRANSFER_PAYMENT_WINDOW_MS = 24 * 3600 * 1000;

/**
 * Batas bayar efektif sebuah order.
 * GATEWAY → expiredAt dari penyedia. TRANSFER → 24 jam setelah dibuat
 * (fallback `createdAt + 24h` juga menutupi order lama tanpa expiredAt).
 * COD → tidak ada kedaluwarsa (dibayar saat serah terima).
 */
export function effectiveExpiry(order: StaleOrder): Date | null {
  if (order.expiredAt) return order.expiredAt;
  if (order.paymentMethod === "TRANSFER") {
    return new Date(order.createdAt.getTime() + TRANSFER_PAYMENT_WINDOW_MS);
  }
  return null;
}
