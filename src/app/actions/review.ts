"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { getFreshSessionUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";

const reviewSchema = z.object({
  orderCode: z.string().min(5),
  phone: z.string().min(9),
  orderItemId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5, "Ulasan minimal 5 karakter").max(500),
});

type Result = { ok: true } | { ok: false; error: string };

/**
 * Pembeli memberi ulasan untuk item yang sudah SELESAI.
 * Akses diverifikasi seperti lacak pesanan: kode order + no HP cocok,
 * atau sesi pemilik order. Satu ulasan per item (unique orderItemId).
 */
export async function submitReview(input: unknown): Promise<Result> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const { orderCode, phone, orderItemId, rating, comment } = parsed.data;
  const code = orderCode.trim().toUpperCase();

  if (!rateLimit(`review:${code}`, 10, 10 * 60 * 1000)) {
    return { ok: false, error: "Terlalu banyak percobaan. Coba lagi nanti." };
  }

  const order = await db.order.findUnique({
    where: { code },
    select: {
      id: true,
      buyerId: true,
      buyerPhone: true,
      buyerName: true,
      items: { select: { id: true, vendorStatus: true, productId: true, vendorId: true } },
    },
  });
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan" };

  const user = await getFreshSessionUser();
  const allowed =
    normalizePhone(order.buyerPhone) === normalizePhone(phone) ||
    (user?.id && user.id === order.buyerId);
  if (!allowed) return { ok: false, error: "Nomor HP tidak cocok dengan pesanan" };

  const item = order.items.find((i) => i.id === orderItemId);
  if (!item) return { ok: false, error: "Item tidak ditemukan di pesanan ini" };
  if (item.vendorStatus !== "SELESAI") {
    return { ok: false, error: "Ulasan hanya untuk pesanan yang sudah selesai" };
  }

  // Unique constraint orderItemId menolak ulasan ganda — tangkap ramah
  try {
    await db.review.create({
      data: {
        orderItemId,
        productId: item.productId,
        vendorId: item.vendorId,
        rating,
        comment,
        buyerName: order.buyerName,
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return { ok: false, error: "Item ini sudah diulas" };
    }
    throw e;
  }

  revalidatePath(`/pesanan/${code}`);
  return { ok: true };
}
