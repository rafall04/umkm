export type GatewayPaymentStatus = "PAID" | "PENDING" | "FAILED" | "EXPIRED";

export type CreatePaymentInput = {
  orderCode: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: { name: string; price: number; qty: number }[];
  callbackUrl: string;
  returnUrl: string;
};

export type CreatePaymentResult = {
  reference: string;
  paymentUrl: string | null;
  channel?: string;
  instructions?: string;
  expiredAt?: Date;
  raw?: unknown;
};

export type VerifiedCallback = {
  reference: string; // merchant_ref = order code kita
  status: GatewayPaymentStatus;
  raw: unknown;
};

export interface PaymentGateway {
  name: string;
  createTransaction(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /**
   * Verifikasi signature & parse callback dari gateway.
   * Lempar Error jika signature tidak valid.
   */
  verifyCallback(request: Request): Promise<VerifiedCallback>;
}
