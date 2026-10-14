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

type PayableOrder = { paymentMethod: string; paymentStatus: string };

/**
 * Item hanya boleh maju (DIPROSES/DIKIRIM/SELESAI) setelah pembayaran lunas.
 * COD dikecualikan — dibayar tunai saat serah terima.
 * TRANSFER wajib bukti disetujui; GATEWAY wajib callback PAID.
 * Tanpa gerbang ini order online bisa "selesai" tanpa pernah dibayar.
 */
export function requiresPaidBeforeProgress(
  order: PayableOrder,
  nextStatus: string,
): boolean {
  if (nextStatus === "DIBATALKAN") return false;
  return order.paymentMethod !== "COD" && order.paymentStatus !== "PAID";
}

/**
 * Stok masih ditahan oleh order hanya pada status bayar awal.
 * FAILED/EXPIRED/REFUNDED berarti stok sudah dikembalikan —
 * sweep kedaluwarsa tidak boleh restore dua kali.
 */
export function stockStillHeld(order: { paymentStatus: string }): boolean {
  return order.paymentStatus === "UNPAID" || order.paymentStatus === "PENDING";
}
