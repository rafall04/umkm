import { describe, it, expect } from "vitest";
import { effectiveExpiry, TRANSFER_PAYMENT_WINDOW_MS } from "@/lib/order-rules";

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
