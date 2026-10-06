import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentGateway,
  VerifiedCallback,
} from "./types";

/**
 * Pembayaran manual (QRIS / transfer langsung ke penjual / COD).
 * Tidak ada gateway — bukti bayar dikonfirmasi oleh penjual.
 */
export const manual: PaymentGateway = {
  name: "manual",

  async createTransaction(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return {
      reference: input.orderCode,
      paymentUrl: null,
      instructions:
        "Scan QRIS milik penjual atau transfer ke rekeningnya, lalu upload bukti bayar di halaman pesanan.",
    };
  },

  async verifyCallback(): Promise<VerifiedCallback> {
    throw new Error("Gateway manual tidak memiliki callback");
  },
};
