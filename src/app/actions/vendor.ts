"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, getMyVendor } from "@/lib/session";
import { slugify } from "@/lib/format";
import { revalidatePath } from "next/cache";

// URL gambar boleh absolut (https://...) atau path lokal (/uploads/..., /images/...)
const imageUrl = z
  .string()
  .min(1)
  .refine((s) => s.startsWith("/") || /^https?:\/\//.test(s), "URL gambar tidak valid");

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Nama produk minimal 3 karakter"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  price: z.number().int().positive("Harga harus lebih dari 0"),
  stock: z.number().int().min(0),
  unit: z.string().min(1),
  categoryId: z.string().min(1, "Pilih kategori"),
  images: z.array(imageUrl).max(5),
  isActive: z.boolean(),
});

export async function saveProduct(input: unknown) {
  const user = await requireRole("VENDOR", "ADMIN_DESA", "SUPERADMIN");
  const vendor = await getMyVendor(user.id);
  if (!vendor) return { ok: false as const, error: "Anda tidak memiliki toko" };

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;

  if (data.id) {
    const existing = await db.product.findFirst({
      where: { id: data.id, vendorId: vendor.id },
    });
    if (!existing) return { ok: false as const, error: "Produk tidak ditemukan" };
    await db.product.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        stock: data.stock,
        unit: data.unit,
        categoryId: data.categoryId,
        images: data.images,
        isActive: data.isActive,
      },
    });
  } else {
    const baseSlug = slugify(data.name);
    let slug = `${baseSlug}-${vendor.slug}`;
    let i = 1;
    while (await db.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${vendor.slug}-${++i}`;
    }
    await db.product.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        price: data.price,
        stock: data.stock,
        unit: data.unit,
        categoryId: data.categoryId,
        images: data.images,
        isActive: data.isActive,
        vendorId: vendor.id,
        villageId: vendor.villageId,
      },
    });
  }

  revalidatePath("/dashboard/produk");
  revalidatePath(`/${vendor.village.slug}/produk`);
  return { ok: true as const };
}

export async function deleteProduct(productId: string) {
  const user = await requireRole("VENDOR", "ADMIN_DESA", "SUPERADMIN");
  const vendor = await getMyVendor(user.id);
  if (!vendor) return { ok: false as const, error: "Anda tidak memiliki toko" };

  // Soft-delete agar riwayat order tidak rusak
  await db.product.updateMany({
    where: { id: productId, vendorId: vendor.id },
    data: { isActive: false },
  });
  revalidatePath("/dashboard/produk");
  return { ok: true as const };
}

const storeSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  whatsapp: z.string().min(9),
  phone: z.string().optional(),
  address: z.string().min(10),
  logo: imageUrl.optional().or(z.literal("")),
  qrisImage: imageUrl.optional().or(z.literal("")),
});

export async function updateStore(input: unknown) {
  const user = await requireRole("VENDOR", "ADMIN_DESA", "SUPERADMIN");
  const vendor = await getMyVendor(user.id);
  if (!vendor) return { ok: false as const, error: "Anda tidak memiliki toko" };

  const parsed = storeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message };
  }

  await db.vendor.update({
    where: { id: vendor.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      whatsapp: parsed.data.whatsapp,
      phone: parsed.data.phone || null,
      address: parsed.data.address,
      logo: parsed.data.logo || null,
      qrisImage: parsed.data.qrisImage || null,
    },
  });
  revalidatePath("/dashboard/toko");
  return { ok: true as const };
}

// Transisi maju yang diizinkan per status item
const NEXT_STATUS: Record<string, string[]> = {
  MENUNGGU: ["DIPROSES", "DIBATALKAN"],
  DIPROSES: ["DIKIRIM", "DIBATALKAN"],
  DIKIRIM: ["SELESAI"],
  SELESAI: [],
  DIBATALKAN: [],
};

export async function updateOrderItemStatus(itemId: string, status: string) {
  const user = await requireRole("VENDOR", "ADMIN_DESA", "SUPERADMIN");
  const vendor = await getMyVendor(user.id);

  const isAdmin = user.role === "ADMIN_DESA" || user.role === "SUPERADMIN";
  if (!isAdmin && !vendor) return { ok: false as const, error: "Tidak berwenang" };

  const item = await db.orderItem.findUnique({
    where: { id: itemId },
    include: {
      vendor: { select: { villageId: true } },
      order: { select: { paymentMethod: true, paymentStatus: true } },
    },
  });
  if (!item) return { ok: false as const, error: "Item tidak ditemukan" };

  // Otorisasi: vendor hanya item miliknya; ADMIN_DESA hanya item di wilayahnya
  if (vendor && item.vendorId !== vendor.id) {
    return { ok: false as const, error: "Tidak berwenang" };
  }
  if (user.role === "ADMIN_DESA" && item.vendor.villageId !== user.villageId) {
    return { ok: false as const, error: "Item di luar wilayah Anda" };
  }
  if (!vendor && !isAdmin) return { ok: false as const, error: "Tidak berwenang" };

  if (!(NEXT_STATUS[item.vendorStatus] ?? []).includes(status)) {
    return { ok: false as const, error: "Transisi status tidak valid" };
  }

  // Order QRIS/transfer: item baru boleh diproses setelah pembayaran dikonfirmasi
  if (
    item.order.paymentMethod === "TRANSFER" &&
    item.order.paymentStatus !== "PAID" &&
    status !== "DIBATALKAN"
  ) {
    return {
      ok: false as const,
      error: "Pembayaran belum dikonfirmasi — konfirmasi bukti bayar dulu",
    };
  }

  await db.$transaction(async (tx) => {
    await tx.orderItem.update({
      where: { id: itemId },
      data: { vendorStatus: status as "DIPROSES" | "DIKIRIM" | "SELESAI" | "DIBATALKAN" },
    });

    // Item dibatalkan → kembalikan stok produknya
    if (status === "DIBATALKAN") {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.qty } },
      });
    }

    // Sinkronkan status order induk dari seluruh item
    const siblings = await tx.orderItem.findMany({ where: { orderId: item.orderId } });
    const statuses = siblings.map((s) => s.vendorStatus);
    let orderStatus:
      | "PROCESSING"
      | "DELIVERED"
      | "COMPLETED"
      | "CANCELLED"
      | undefined;
    if (statuses.every((s) => s === "DIBATALKAN")) orderStatus = "CANCELLED";
    else if (statuses.every((s) => s === "SELESAI" || s === "DIBATALKAN")) orderStatus = "COMPLETED";
    else if (statuses.some((s) => s === "DIKIRIM")) orderStatus = "DELIVERED";
    else if (statuses.some((s) => s === "DIPROSES")) orderStatus = "PROCESSING";
    if (orderStatus) {
      await tx.order.update({ where: { id: item.orderId }, data: { status: orderStatus } });
    }
  });

  revalidatePath("/dashboard/pesanan");
  return { ok: true as const };
}
