import { describe, it, expect } from "vitest";
import {
  effectiveExpiry,
  orderProgressSteps,
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

const prog = (over: Partial<Parameters<typeof orderProgressSteps>[0]>) =>
  orderProgressSteps({
    status: "PENDING",
    paymentMethod: "TRANSFER",
    paymentStatus: "UNPAID",
    deliveryMethod: "ANTAR_DESA",
    ...over,
  });

describe("orderProgressSteps", () => {
  it("order terminal → null (badge halaman yang bicara)", () => {
    expect(prog({ status: "CANCELLED" })).toBeNull();
    expect(prog({ status: "EXPIRED" })).toBeNull();
  });

  it("order baru TRANSFER: hanya langkah 'dibuat' yang selesai", () => {
    const steps = prog({})!;
    expect(steps.map((s) => s.done)).toEqual([true, false, false, false, false]);
    expect(steps[1].label).toBe("Transfer dikonfirmasi");
  });

  it("TRANSFER PAID: pembayaran selesai, proses belum", () => {
    const steps = prog({ paymentStatus: "PAID", status: "PAID" })!;
    expect(steps.map((s) => s.done)).toEqual([true, true, false, false, false]);
  });

  it("DELIVERED menandai proses+kirim selesai", () => {
    const steps = prog({ status: "DELIVERED", paymentStatus: "PAID" })!;
    expect(steps.map((s) => s.done)).toEqual([true, true, true, true, false]);
  });

  it("COMPLETED menandai semua langkah selesai", () => {
    const steps = prog({ status: "COMPLETED", paymentStatus: "PAID" })!;
    expect(steps.every((s) => s.done)).toBe(true);
  });

  it("COD: label bayar di tempat; lunas dianggap saat order selesai", () => {
    const cod = { paymentMethod: "COD", paymentStatus: "UNPAID" };
    expect(prog({ ...cod, status: "DELIVERED" })![1].done).toBe(false);
    const done = prog({ ...cod, status: "COMPLETED" })!;
    expect(done[1].label).toBe("Bayar di tempat");
    expect(done.every((s) => s.done)).toBe(true);
  });

  it("AMBIL_SENDIRI: langkah kirim berlabel 'Siap diambil'", () => {
    const steps = prog({ deliveryMethod: "AMBIL_SENDIRI" })!;
    expect(steps[3].label).toBe("Siap diambil");
  });
});
