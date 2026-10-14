import { db } from "@/lib/db";
import {
  expireOrderIfStale,
  autoCompleteOrderIfStale,
} from "@/lib/orders";
import { AUTO_COMPLETE_AFTER_MS, TRANSFER_PAYMENT_WINDOW_MS } from "@/lib/order-rules";

export const dynamic = "force-dynamic";

/**
 * Sweep berkala: kedaluwarsakan order PENDING yang lewat batas bayar dan
 * auto-complete order DELIVERED yang itemnya sudah >3 hari dikirim.
 * Dipanggil oleh cron/Task Scheduler — wajib header Authorization Bearer
 * dengan CRON_SECRET dari env. Tanpa secret → 404 (jangan bocorkan adanya).
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Not found", { status: 404 });
  }

  const now = new Date();
  // Kandidat kedaluwarsa: expiredAt eksplisit sudah lewat, atau TRANSFER
  // lama tanpa expiredAt (fallback createdAt+24h di effectiveExpiry).
  const stalePending = await db.order.findMany({
    where: {
      status: "PENDING",
      OR: [
        { expiredAt: { lt: now } },
        {
          expiredAt: null,
          paymentMethod: "TRANSFER",
          createdAt: { lt: new Date(now.getTime() - TRANSFER_PAYMENT_WINDOW_MS) },
        },
      ],
    },
    select: { id: true },
  });
  for (const o of stalePending) await expireOrderIfStale(o.id);

  // Kandidat auto-complete: order DELIVERED yang punya item DIKIRIM lama
  const staleDelivered = await db.order.findMany({
    where: {
      status: "DELIVERED",
      items: {
        some: {
          vendorStatus: "DIKIRIM",
          deliveredAt: { lt: new Date(now.getTime() - AUTO_COMPLETE_AFTER_MS) },
        },
      },
    },
    select: { id: true },
  });
  for (const o of staleDelivered) await autoCompleteOrderIfStale(o.id);

  return Response.json({
    ok: true,
    expiredChecked: stalePending.length,
    completedChecked: staleDelivered.length,
  });
}
