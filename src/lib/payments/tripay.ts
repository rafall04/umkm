import crypto from "crypto";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentGateway,
  VerifiedCallback,
} from "./types";

const isSandbox = process.env.TRIPAY_SANDBOX !== "false";
const BASE = isSandbox
  ? "https://tripay.co.id/api-sandbox"
  : "https://tripay.co.id/api";

function config() {
  const apiKey = process.env.TRIPAY_API_KEY;
  const privateKey = process.env.TRIPAY_PRIVATE_KEY;
  const merchantCode = process.env.TRIPAY_MERCHANT_CODE;
  if (!apiKey || !privateKey || !merchantCode) {
    throw new Error("Konfigurasi Tripay belum lengkap (API key / private key / merchant code)");
  }
  return { apiKey, privateKey, merchantCode };
}

export const tripay: PaymentGateway = {
  name: "tripay",

  async createTransaction(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const { apiKey, privateKey, merchantCode } = config();

    const signature = crypto
      .createHmac("sha256", privateKey)
      .update(merchantCode + input.orderCode + input.amount)
      .digest("hex");

    const res = await fetch(`${BASE}/transaction/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: "QRIS", // QRIS paling cocok untuk UMKM; channel lain bisa ditambah nanti
        merchant_ref: input.orderCode,
        amount: input.amount,
        customer_name: input.customerName,
        customer_email: input.customerEmail ?? "pembeli@umkm.local",
        customer_phone: input.customerPhone,
        order_items: input.items.map((i) => ({
          name: i.name,
          price: i.price,
          quantity: i.qty,
        })),
        callback_url: input.callbackUrl,
        return_url: input.returnUrl,
        expired_time: Math.floor(Date.now() / 1000) + 24 * 3600,
        signature,
      }),
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(`Tripay: ${json.message ?? "gagal membuat transaksi"}`);
    }

    return {
      reference: json.data.merchant_ref,
      paymentUrl: json.data.checkout_url,
      channel: json.data.payment_method,
      instructions: json.data.instructions?.[0]?.steps
        ? JSON.stringify(json.data.instructions)
        : undefined,
      expiredAt: json.data.expired_time
        ? new Date(json.data.expired_time * 1000)
        : undefined,
      raw: json.data,
    };
  },

  async verifyCallback(request: Request): Promise<VerifiedCallback> {
    const { privateKey } = config();
    const rawBody = await request.text();
    const signature = request.headers.get("X-Callback-Signature") ?? "";

    const expected = crypto
      .createHmac("sha256", privateKey)
      .update(rawBody)
      .digest("hex");

    if (
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      throw new Error("Signature callback Tripay tidak valid");
    }

    const body = JSON.parse(rawBody);
    const map: Record<string, VerifiedCallback["status"]> = {
      PAID: "PAID",
      EXPIRED: "EXPIRED",
      FAILED: "FAILED",
      UNPAID: "PENDING",
      REFUND: "FAILED",
    };

    return {
      reference: body.merchant_ref,
      status: map[body.status] ?? "PENDING",
      raw: body,
    };
  },
};
