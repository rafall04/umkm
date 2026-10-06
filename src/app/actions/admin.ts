"use server";

import { db } from "@/lib/db";
import { requireRole, adminVillageFilter } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function setVendorVerified(vendorId: string, verified: boolean) {
  const user = await requireRole("ADMIN_DESA", "SUPERADMIN");
  const filter = adminVillageFilter(user);
  const res = await db.vendor.updateMany({
    where: { id: vendorId, ...filter },
    data: { isVerified: verified },
  });
  if (res.count === 0) return { ok: false as const, error: "Tidak berwenang" };
  revalidatePath("/admin/umkm");
  return { ok: true as const };
}

export async function setVendorActive(vendorId: string, active: boolean) {
  const user = await requireRole("ADMIN_DESA", "SUPERADMIN");
  const filter = adminVillageFilter(user);
  const res = await db.vendor.updateMany({
    where: { id: vendorId, ...filter },
    data: { isActive: active },
  });
  if (res.count === 0) return { ok: false as const, error: "Tidak berwenang" };
  revalidatePath("/admin/umkm");
  return { ok: true as const };
}

export async function confirmManualPayment(orderId: string) {
  const user = await requireRole("ADMIN_DESA", "SUPERADMIN");
  const filter = adminVillageFilter(user);

  const order = await db.order.findFirst({
    where: {
      id: orderId,
      paymentMethod: { in: ["TRANSFER", "COD"] },
      ...(filter.villageId
        ? { items: { some: { vendor: { villageId: filter.villageId } } } }
        : {}),
    },
  });
  if (!order) return { ok: false as const, error: "Pesanan tidak ditemukan" };
  if (order.paymentStatus === "PAID") return { ok: true as const };
  if (["CANCELLED", "EXPIRED"].includes(order.status)) {
    return {
      ok: false as const,
      error: "Pesanan sudah dibatalkan/kedaluwarsa, tidak bisa dikonfirmasi",
    };
  }

  await db.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "PAID",
      paidAt: new Date(),
      // Hanya naikkan status PENDING → PAID; jangan mundurkan status lanjutan
      ...(order.status === "PENDING" ? { status: "PAID" as const } : {}),
    },
  });
  revalidatePath("/admin/pesanan");
  return { ok: true as const };
}

export async function setUserActive(userId: string, active: boolean) {
  await requireRole("SUPERADMIN");
  await db.user.update({ where: { id: userId }, data: { isActive: active } });
  revalidatePath("/admin/pengguna");
  return { ok: true as const };
}

const villageSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name: z.string().min(3),
  kecamatan: z.string().min(2),
  kabupaten: z.string().min(2),
  description: z.string().min(10),
});

export async function saveVillage(input: unknown) {
  await requireRole("SUPERADMIN");
  const parsed = villageSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  if (d.id) {
    await db.village.update({ where: { id: d.id }, data: d });
  } else {
    await db.village.create({ data: d });
  }
  revalidatePath("/admin/desa");
  return { ok: true as const };
}

export async function setVillageActive(villageId: string, active: boolean) {
  await requireRole("SUPERADMIN");
  await db.village.update({ where: { id: villageId }, data: { isActive: active } });
  revalidatePath("/admin/desa");
  return { ok: true as const };
}
