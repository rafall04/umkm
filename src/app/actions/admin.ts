"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { requireRole, adminVillageFilter } from "@/lib/session";
import { recordOrderStatus } from "@/lib/orders";
import { RESERVED_SLUGS } from "@/lib/slugs";
import { normalizePhone } from "@/lib/format";
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

  // Guard di dalam update — antara findFirst dan write order bisa dibatalkan
  // pembeli; jangan pernah menulis PAID ke order terminal.
  const res = await db.$transaction(async (tx) => {
    const r = await tx.order.updateMany({
      where: {
        id: orderId,
        status: { notIn: ["CANCELLED", "EXPIRED"] },
        paymentStatus: { not: "PAID" },
      },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        // Hanya naikkan status PENDING → PAID; jangan mundurkan status lanjutan
        ...(order.status === "PENDING" ? { status: "PAID" as const } : {}),
      },
    });
    if (r.count > 0 && order.status === "PENDING") {
      await recordOrderStatus(tx, orderId, "PAID", {
        note: "Pembayaran dikonfirmasi admin",
        actor: `admin:${user.id}`,
      });
    }
    return r;
  });
  if (res.count === 0) {
    return { ok: false as const, error: "Status pesanan sudah berubah — muat ulang" };
  }
  revalidatePath("/admin/pesanan");
  return { ok: true as const };
}

export async function setUserActive(userId: string, active: boolean) {
  const me = await requireRole("SUPERADMIN");
  // Jangan bolehkan menonaktifkan diri sendiri atau sesama superadmin —
  // UI menyembunyikan tombolnya, tapi action tetap harus menjaga.
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!target || target.role === "SUPERADMIN" || userId === me.id) {
    return { ok: false as const, error: "Tidak dapat mengubah akun ini" };
  }
  await db.user.update({ where: { id: userId }, data: { isActive: active } });
  revalidatePath("/admin/pengguna");
  return { ok: true as const };
}

const villageSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/)
    .refine((s) => !RESERVED_SLUGS.has(s), "Slug ini dipakai sistem — pilih yang lain"),
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

  try {
    if (d.id) {
      await db.village.update({ where: { id: d.id }, data: d });
    } else {
      await db.village.create({ data: d });
    }
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return { ok: false as const, error: "Slug sudah dipakai wilayah lain" };
    }
    throw e;
  }
  revalidatePath("/admin/desa");
  return { ok: true as const };
}

export async function setVillageActive(villageId: string, active: boolean) {
  await requireRole("SUPERADMIN");
  await db.village.update({ where: { id: villageId }, data: { isActive: active } });
  revalidatePath("/admin/desa");
  revalidatePath("/admin/umkm");
  return { ok: true as const };
}

const villageAdminSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  phone: z.preprocess(
    (v) => (typeof v === "string" ? normalizePhone(v) : v),
    z.string().min(9, "Nomor HP tidak valid").max(16),
  ),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
  villageId: z.string().min(1, "Pilih wilayah"),
});

/** Buat akun ADMIN_DESA ber-scope satu wilayah — hanya SUPERADMIN. */
export async function createVillageAdmin(input: unknown) {
  await requireRole("SUPERADMIN");
  const parsed = villageAdminSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message };
  }
  const d = parsed.data;

  const village = await db.village.findUnique({ where: { id: d.villageId } });
  if (!village) return { ok: false as const, error: "Wilayah tidak ditemukan" };

  const existing = await db.user.findFirst({
    where: { OR: [{ phone: d.phone }, ...(d.email ? [{ email: d.email.toLowerCase() }] : [])] },
    select: { id: true },
  });
  if (existing) return { ok: false as const, error: "Nomor HP / email sudah terdaftar" };

  try {
    await db.user.create({
      data: {
        name: d.name,
        email: d.email ? d.email.toLowerCase() : null,
        phone: d.phone,
        passwordHash: await bcrypt.hash(d.password, 10),
        role: "ADMIN_DESA",
        villageId: d.villageId,
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return { ok: false as const, error: "Email atau nomor HP sudah terdaftar" };
    }
    throw e;
  }
  revalidatePath("/admin/pengguna");
  return { ok: true as const };
}

/** Sembunyikan/tampilkan ulasan — ADMIN_DESA hanya untuk wilayahnya. */
export async function setReviewPublished(reviewId: string, published: boolean) {
  const user = await requireRole("ADMIN_DESA", "SUPERADMIN");
  const filter = adminVillageFilter(user);
  const res = await db.review.updateMany({
    where: {
      id: reviewId,
      ...(filter.villageId ? { vendor: { villageId: filter.villageId } } : {}),
    },
    data: { isPublished: published },
  });
  if (res.count === 0) return { ok: false as const, error: "Ulasan tidak ditemukan" };
  revalidatePath("/admin/ulasan");
  return { ok: true as const };
}
