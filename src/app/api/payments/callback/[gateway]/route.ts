import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGatewayByName } from "@/lib/payments";
import { recordOrderStatus } from "@/lib/orders";
import { revalidatePath } from "next/cache";

const statusMap = {
  PAID: { paymentStatus: "PAID" as const, status: "PAID" as const },
  FAILED: { paymentStatus: "FAILED" as const, status: "PENDING" as const },
  EXPIRED: { paymentStatus: "EXPIRED" as const, status: "EXPIRED" as const },
  PENDING: { paymentStatus: "UNPAID" as const, status: "PENDING" as const },
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gateway: string }> },
) {
  const { gateway: name } = await params;
  const gateway = getGatewayByName(name);
  if (!gateway || gateway.name === "manual") {
    return NextResponse.json({ error: "Gateway tidak dikenal" }, { status: 404 });
  }

  let verified;
  try {
    verified = await gateway.verifyCallback(request);
  } catch (e) {
    console.error(`Callback ${name} gagal diverifikasi:`, e);
    return NextResponse.json({ error: "Signature tidak valid" }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { code: verified.reference } });
  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  const update = statusMap[verified.status];
  await db.$transaction(async (tx) => {
    const cur = await tx.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { paymentStatus: true, status: true },
    });
    // Status terminal (CANCELLED/EXPIRED) tidak boleh dihidupkan kembali
    // oleh callback; paymentStatus tetap dicatat apa adanya.
    const isTerminal = ["CANCELLED", "EXPIRED"].includes(cur.status);
    await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: update.paymentStatus,
        status: isTerminal ? cur.status : update.status,
        paidAt: verified.status === "PAID" ? new Date() : undefined,
      },
    });
    await tx.paymentLog.create({
      data: { orderId: order.id, gateway: name, event: "callback", payload: verified.raw as object },
    });
    // Riwayat status — order terminal tetap dicatat apa adanya
    await recordOrderStatus(tx, order.id, update.status, {
      note: `Callback ${name}: ${verified.status}`,
      actor: `gateway:${name}`,
    });
    // Kembalikan stok jika gagal/kedaluwarsa — hanya sekali. Idempotent
    // terhadap callback duplikat DAN pembatalan manual oleh pembeli.
    const alreadyRestored =
      ["FAILED", "EXPIRED"].includes(cur.paymentStatus) || isTerminal;
    if (
      (verified.status === "FAILED" || verified.status === "EXPIRED") &&
      !alreadyRestored
    ) {
      const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
      await Promise.all(
        items.map((i) =>
          i.variantId
            ? tx.productVariant.update({
                where: { id: i.variantId },
                data: { stock: { increment: i.qty } },
              })
            : tx.product.update({
                where: { id: i.productId },
                data: { stock: { increment: i.qty } },
              }),
        ),
      );
    }
  });

  revalidatePath(`/pesanan/${order.code}`);
  return NextResponse.json({ success: true });
}
