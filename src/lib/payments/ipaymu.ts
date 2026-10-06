import crypto from "crypto";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentGateway,
  VerifiedCallback,
} from "./types";

const isSandbox = process.env.IPAYMU_SANDBOX !== "false";
const BASE = isSandbox ? "https://sandbox.ipaymu.com" : "https://my.ipaymu.com";

function config() {
  const va = process.env.IPAYMU_VA;
  const apiKey = process.env.IPAYMU_API_KEY;
  if (!va || !apiKey) {
    throw new Error("Konfigurasi iPaymu belum lengkap (VA / API key)");
  }
  return { va, apiKey };
}

function sign(method: string, va: string, body: string, apiKey: string) {
  const md5Body = crypto.createHash("md5").update(body).digest("hex");
  const stringToSign = `${method.toUpperCase()}:${va}:${md5Body}:${apiKey}`;
  return crypto.createHmac("sha256", apiKey).update(stringToSign).digest("hex");
}

export const ipaymu: PaymentGateway = {
  name: "ipaymu",

  async createTransaction(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const { va, apiKey } = config();

    const payload = {
      product: input.items.map((i) => `${i.name} x${i.qty}`),
      qty: input.items.map(() => 1),
      price: input.items.map((i) => i.price * i.qty),
      amount: input.amount,
      returnUrl: input.returnUrl,
      callbackUrl: input.callbackUrl,
      cancelUrl: input.returnUrl,
      referenceId: input.orderCode,
      buyerName: input.customerName,
      buyerPhone: input.customerPhone,
      buyerEmail: input.customerEmail ?? "pembeli@umkm.local",
      paymentMethod: "qris",
    };
    const body = JSON.stringify(payload);

    const res = await fetch(`${BASE}/api/v2/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        va,
        signature: sign("POST", va, body, apiKey),
        timestamp: new Date().toISOString(),
      },
      body,
    });

    const json = await res.json();
    if (json.Status !== 200) {
      throw new Error(`iPaymu: ${json.Keterangan ?? "gagal membuat transaksi"}`);
    }

    return {
      reference: input.orderCode,
      paymentUrl: json.Data?.Url ?? null,
      channel: "qris",
      expiredAt: json.Data?.Expired ? new Date(json.Data.Expired) : undefined,
      raw: json.Data,
    };
  },

  async verifyCallback(request: Request): Promise<VerifiedCallback> {
    // iPaymu mengirim callback sebagai form-urlencoded
    const text = await request.text();
    const params = new URLSearchParams(text);
    const body = Object.fromEntries(params.entries());

    // Verifikasi dengan mengecek status transaksi langsung ke API iPaymu
    const { va, apiKey } = config();
    const checkPayload = JSON.stringify({ transactionId: Number(body.trx_id) });
    const res = await fetch(`${BASE}/api/v2/transaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        va,
        signature: sign("POST", va, checkPayload, apiKey),
        timestamp: new Date().toISOString(),
      },
      body: checkPayload,
    });
    const json = await res.json();

    const statusCode = json?.Data?.StatusCode ?? body.status_code;
    const map: Record<string, VerifiedCallback["status"]> = {
      "1": "PAID",
      "0": "PENDING",
      "-1": "PENDING",
      "-2": "EXPIRED",
      "6": "PENDING",
    };

    return {
      reference: body.reference_id ?? body.referenceId,
      status: map[String(statusCode)] ?? "PENDING",
      raw: { callback: body, check: json?.Data },
    };
  },
};
