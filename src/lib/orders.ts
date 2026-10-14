import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  effectiveExpiry,
  stockStillHeld,
  AUTO_COMPLETE_AFTER_MS,
} from "@/lib/order-rules";
import type { OrderStatus } from "@/generated/prisma/enums";

export { effectiveExpiry } from "@/lib/order-rules";

type Tx = Prisma.TransactionClient;

/** Catat satu entri riwayat status order — selalu di dalam transaksi. */
export async function recordOrderStatus(
  tx: Tx,
  orderId: string,
  status: OrderStatus,
  opts: { note?: string; actor?: string } = {},
) {
  await tx.orderStatusHistory.create({
    data: {
      orderId,
      status,
      note: opts.note ?? null,
      actor: opts.actor ?? "system",
    },
  });
}

/**
 * Tandai order kedaluwarsa + kembalikan stok bila batas bayar sudah lewat.
 * Idempotent: update dikunci pada status PENDING di dalam transaksi, jadi
 * pemanggilan konkuren/berulang hanya restore stok sekali.
 * Dipanggil lazy dari jalur baca (trackOrder) & aksi pembayaran.
 */
export async function expireOrderIfStale(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      expiredAt: true,
      createdAt: true,
    },
  });
  if (!order || order.status !== "PENDING") return;

  const expiry = effectiveExpiry(order);
  if (!expiry || expiry > new Date()) return;

  await db.$transaction(async (tx) => {
    // 1) Klaim transisi status — hanya satu pemenang (callback/lacak konkuren).
    const res = await tx.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    if (res.count === 0) return;

    // 2) Stok hanya dikembalikan bila masih ditahan order — dibaca di dalam
    // tx SEBELUM paymentStatus ditimpa. Order yang callback-nya sudah
    // FAILED/EXPIRED sudah direstore oleh jalur callback — jangan dobel.
    const cur = await tx.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { paymentStatus: true },
    });
    const held = stockStillHeld(cur);
    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: "EXPIRED" },
    });
    await recordOrderStatus(tx, order.id, "EXPIRED", {
      note: "Batas waktu pembayaran terlewati",
    });
    if (!held) return;

    const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
    for (const i of items) {
      await restoreStock(tx, i);
    }
  });
}

/** Kembalikan stok satu item — ke varian bila ada, kalau tidak ke produk. */
async function restoreStock(
  tx: Tx,
  item: { productId: string; variantId: string | null; qty: number },
) {
  if (item.variantId) {
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.qty } },
    });
  } else {
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.qty } },
    });
  }
}

/**
 * Auto-complete: item DIKIRIM > 3 hari dianggap selesai. Bila semua item
 * selesai/batal → order jadi COMPLETED. Idempotent lewat guard status di
 * updateMany. Dipanggil lazy dari jalur baca seperti expireOrderIfStale.
 */
export async function autoCompleteOrderIfStale(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });
  if (!order || order.status !== "DELIVERED") return;

  const cutoff = new Date(Date.now() - AUTO_COMPLETE_AFTER_MS);

  await db.$transaction(async (tx) => {
    // Kunci order pada status DELIVERED — sweep konkuren hanya menang sekali.
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: "DELIVERED" },
      data: {},
    });
    if (claimed.count === 0) return;

    const stale = await tx.orderItem.updateMany({
      where: {
        orderId,
        vendorStatus: "DIKIRIM",
        deliveredAt: { lt: cutoff },
      },
      data: { vendorStatus: "SELESAI" },
    });
    if (stale.count === 0) return;

    const siblings = await tx.orderItem.findMany({ where: { orderId } });
    if (siblings.every((s) => s.vendorStatus === "SELESAI" || s.vendorStatus === "DIBATALKAN")) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "COMPLETED" },
      });
      await recordOrderStatus(tx, orderId, "COMPLETED", {
        note: "Otomatis selesai — barang diterima pembeli",
      });
    }
  });
}
