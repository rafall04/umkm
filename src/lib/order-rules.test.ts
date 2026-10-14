import { describe, it, expect } from "vitest";
import {
  effectiveExpiry,
  requiresPaidBeforeProgress,
  stockStillHeld,
  TRANSFER_PAYMENT_WINDOW_MS,
} from "@/lib/order-rules";

const base = {
  status: "PENDING",
  paymentMethod: "TRANSFER",
  expiredAt: null,
  createdAt: new Date("2026-01-10T10:00:00Z"),
};

describe("effectiveExpiry", () => {
  it("TRANSFER tanpa expiredAt → 24 jam setelah dibuat", () => {
    const exp = effectiveExpiry(base)!;
    expect(exp.getTime()).toBe(base.createdAt.getTime() + TRANSFER_PAYMENT_WINDOW_MS);
  });

  it("expiredAt dari gateway selalu dipakai", () => {
    const explicit = new Date("2026-01-10T12:00:00Z");
    expect(
      effectiveExpiry({ ...base, paymentMethod: "GATEWAY", expiredAt: explicit }),
    ).toBe(explicit);
  });

  it("COD tidak punya batas bayar", () => {
    expect(effectiveExpiry({ ...base, paymentMethod: "COD" })).toBeNull();
  });

  it("order lama TRANSFER (tanpa expiredAt) ikut kedaluwarsa", () => {
    const old = { ...base, createdAt: new Date("2020-01-01T00:00:00Z") };
    expect(effectiveExpiry(old)!.getTime()).toBeLessThan(Date.now());
  });
});

describe("requiresPaidBeforeProgress", () => {
  it("TRANSFER UNPAID ditahan", () => {
    expect(
      requiresPaidBeforeProgress(
        { paymentMethod: "TRANSFER", paymentStatus: "UNPAID" },
        "DIPROSES",
      ),
    ).toBe(true);
  });

  it("GATEWAY UNPAID ditahan — order online tidak boleh diproses sebelum lunas", () => {
    for (const s of ["DIPROSES", "DIKIRIM", "SELESAI"] as const) {
      expect(
        requiresPaidBeforeProgress(
          { paymentMethod: "GATEWAY", paymentStatus: "UNPAID" },
          s,
        ),
      ).toBe(true);
    }
  });

  it("TRANSFER/GATEWAY PAID boleh maju", () => {
    for (const m of ["TRANSFER", "GATEWAY"] as const) {
      expect(
        requiresPaidBeforeProgress({ paymentMethod: m, paymentStatus: "PAID" }, "DIPROSES"),
      ).toBe(false);
    }
  });

  it("COD UNPAID boleh diproses — dibayar saat serah terima", () => {
    expect(
      requiresPaidBeforeProgress({ paymentMethod: "COD", paymentStatus: "UNPAID" }, "DIPROSES"),
    ).toBe(false);
  });

  it("pembatalan item tidak pernah digate pembayaran", () => {
    expect(
      requiresPaidBeforeProgress(
        { paymentMethod: "GATEWAY", paymentStatus: "UNPAID" },
        "DIBATALKAN",
      ),
    ).toBe(false);
  });
});

describe("stockStillHeld", () => {
  it("UNPAID/PENDING masih menahan stok", () => {
    expect(stockStillHeld({ paymentStatus: "UNPAID" })).toBe(true);
    expect(stockStillHeld({ paymentStatus: "PENDING" })).toBe(true);
  });

  it("FAILED/EXPIRED/PAID/REFUNDED tidak menahan stok — restore sudah terjadi", () => {
    for (const s of ["FAILED", "EXPIRED", "PAID", "REFUNDED"] as const) {
      expect(stockStillHeld({ paymentStatus: s })).toBe(false);
    }
  });
});
