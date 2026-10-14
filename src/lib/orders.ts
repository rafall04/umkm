import { db } from "@/lib/db";
import { effectiveExpiry, stockStillHeld } from "@/lib/order-rules";

export { effectiveExpiry } from "@/lib/order-rules";

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
    if (!held) return;

    const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
    for (const i of items) {
      await tx.product.update({
        where: { id: i.productId },
        data: { stock: { increment: i.qty } },
      });
    }
  });
}
