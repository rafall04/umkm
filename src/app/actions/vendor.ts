"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, getMyVendor } from "@/lib/session";
import { recordOrderStatus } from "@/lib/orders";
import { requiresPaidBeforeProgress } from "@/lib/order-rules";
import { slugify } from "@/lib/format";
import { revalidatePath } from "next/cache";

// URL gambar boleh absolut (https://...) atau path lokal (/uploads/..., /images/...)
const imageUrl = z
  .string()
  .min(1)
  .refine((s) => s.startsWith("/") || /^https?:\/\//.test(s), "URL gambar tidak valid");

const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama varian wajib diisi").max(50),
  price: z.number().int().positive().nullable(), // null = ikut harga produk
  stock: z.number().int().min(0).max(999_999),
  isActive: z.boolean(),
});

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Nama produk minimal 3 karakter"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  price: z.number().int().positive("Harga harus lebih dari 0"),
  compareAtPrice: z.number().int().positive().nullable(),
  stock: z.number().int().min(0),
  unit: z.string().min(1),
  categoryId: z.string().min(1, "Pilih kategori"),
  images: z.array(imageUrl).max(5),
  isActive: z.boolean(),
  variants: z.array(variantSchema).max(20),
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

  // Harga coret harus di atas harga jual — kalau tidak, malah menyesatkan
  if (data.compareAtPrice && data.compareAtPrice <= data.price) {
    return { ok: false as const, error: "Harga coret harus lebih besar dari harga jual" };
  }

  if (data.id) {
    const existing = await db.product.findFirst({
      where: { id: data.id, vendorId: vendor.id },
      include: { variants: true },
    });
    if (!existing) return { ok: false as const, error: "Produk tidak ditemukan" };
    await db.product.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        stock: data.stock,
        unit: data.unit,
        categoryId: data.categoryId,
        images: data.images,
        isActive: data.isActive,
      },
    });
    await syncVariants(data.id, existing.variants, data.variants);
  } else {
    const baseSlug = slugify(data.name);
    let slug = `${baseSlug}-${vendor.slug}`;
    let i = 1;
    while (await db.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${vendor.slug}-${++i}`;
    }
    const created = await db.product.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        stock: data.stock,
        unit: data.unit,
        categoryId: data.categoryId,
        images: data.images,
        isActive: data.isActive,
        vendorId: vendor.id,
        villageId: vendor.villageId,
      },
    });
    await syncVariants(created.id, [], data.variants);
  }

  revalidatePath("/dashboard/produk");
  revalidatePath(`/${vendor.village.slug}/produk`);
  return { ok: true as const };
}

/** Edit stok cepat dari daftar produk — tanpa masuk form penuh. */
export async function updateProductStock(productId: string, stock: number) {
  const user = await requireRole("VENDOR", "ADMIN_DESA", "SUPERADMIN");
  const vendor = await getMyVendor(user.id);
  if (!vendor) return { ok: false as const, error: "Anda tidak memiliki toko" };

  const parsed = z.number().int().min(0).max(999_999).safeParse(stock);
  if (!parsed.success) return { ok: false as const, error: "Stok tidak valid" };

  const res = await db.product.updateMany({
    where: { id: productId, vendorId: vendor.id },
    data: { stock: parsed.data },
  });
  if (res.count === 0) return { ok: false as const, error: "Produk tidak ditemukan" };

  revalidatePath("/dashboard/produk");
  revalidatePath(`/${vendor.village.slug}/produk`);
  return { ok: true as const };
}

/**
 * Sinkronkan varian: yang ada di payload tapi tidak di DB → create; yang ada
 * di keduanya → update; yang hilang dari payload → soft-delete (isActive
 * false) supaya order lama dengan variantId tetap valid untuk restore stok.
 */
async function syncVariants(
  productId: string,
  existing: { id: string }[],
  incoming: { id?: string; name: string; price: number | null; stock: number; isActive: boolean }[],
) {
  const keepIds = new Set(incoming.map((v) => v.id).filter(Boolean));
  for (const v of existing) {
    if (!keepIds.has(v.id)) {
      await db.productVariant.update({
        where: { id: v.id },
        data: { isActive: false },
      });
    }
  }
  for (const v of incoming) {
    if (v.id && existing.some((e) => e.id === v.id)) {
      await db.productVariant.update({
        where: { id: v.id },
        data: { name: v.name, price: v.price, stock: v.stock, isActive: v.isActive },
      });
    } else {
      await db.productVariant.create({
        data: { productId, name: v.name, price: v.price, stock: v.stock, isActive: v.isActive },
      });
    }
  }
}

/**
 * Tandai order COD sudah dibayar tunai — untuk kasus ambil sendiri /
 * serah terima sebelum item ditandai selesai. Idempotent via guard UNPAID.
 */
export async function markCodPaid(orderId: string) {
  const user = await requireRole("VENDOR", "ADMIN_DESA", "SUPERADMIN");
  const vendor = await getMyVendor(user.id);
  const isAdmin = user.role === "ADMIN_DESA" || user.role === "SUPERADMIN";
  if (!vendor && !isAdmin) return { ok: false as const, error: "Tidak berwenang" };

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      items: { select: { vendorId: true, vendor: { select: { villageId: true } } } },
    },
  });
  if (!order || order.paymentMethod !== "COD") {
    return { ok: false as const, error: "Hanya order COD yang bisa ditandai lunas" };
  }
  if (["CANCELLED", "EXPIRED"].includes(order.status)) {
    return { ok: false as const, error: "Pesanan sudah batal/kedaluwarsa" };
  }
  if (vendor && !order.items.some((i) => i.vendorId === vendor.id)) {
    return { ok: false as const, error: "Bukan pesanan toko Anda" };
  }
  if (user.role === "ADMIN_DESA") {
    const inVillage = order.items.some((i) => i.vendor.villageId === user.villageId);
    if (!inVillage) return { ok: false as const, error: "Pesanan di luar wilayah Anda" };
  }

  await db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: order.id, paymentStatus: "UNPAID" },
      data: { paymentStatus: "PAID", paidAt: new Date() },
    });
    if (res.count > 0) {
      await recordOrderStatus(tx, order.id, order.status, {
        note: "Pembayaran COD ditandai lunas",
        actor: vendor ? `vendor:${vendor.id}` : `admin:${user.id}`,
      });
    }
  });

  revalidatePath("/dashboard/pesanan");
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
      order: { select: { status: true, paymentMethod: true, paymentStatus: true } },
    },
  });
  if (!item) return { ok: false as const, error: "Item tidak ditemukan" };

  // Order terminal tidak boleh diubah — item pada order CANCELLED/EXPIRED
  // sudah dikembalikan stoknya; membatalkan lagi = restore ganda.
  if (["CANCELLED", "EXPIRED"].includes(item.order.status)) {
    return { ok: false as const, error: "Pesanan sudah dibatalkan/kedaluwarsa" };
  }

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

  // Order QRIS/transfer/online: item baru boleh diproses setelah pembayaran
  // dikonfirmasi (COD dikecualikan — dibayar saat serah terima).
  if (
    requiresPaidBeforeProgress(
      { paymentMethod: item.order.paymentMethod, paymentStatus: item.order.paymentStatus },
      status,
    )
  ) {
    return {
      ok: false as const,
      error: "Pembayaran belum dikonfirmasi — konfirmasi pembayaran dulu",
    };
  }

  try {
    await db.$transaction(async (tx) => {
      // Transisi dikunci pada status saat ini — klik ganda/permintaan
      // konkuren tidak mengubah status atau mengembalikan stok dua kali.
      const res = await tx.orderItem.updateMany({
        where: { id: itemId, vendorStatus: item.vendorStatus },
        data: {
          vendorStatus: status as "DIPROSES" | "DIKIRIM" | "SELESAI" | "DIBATALKAN",
          // Tanda waktu kirim untuk auto-complete 3 hari
          ...(status === "DIKIRIM" ? { deliveredAt: new Date() } : {}),
        },
      });
      if (res.count === 0) {
        throw new Error("Status item sudah berubah — muat ulang halaman");
      }

      // COD: item SELESAI berarti serah terima & tunai diterima → lunas
      if (
        status === "SELESAI" &&
        item.order.paymentMethod === "COD" &&
        item.order.paymentStatus === "UNPAID"
      ) {
        const paid = await tx.order.updateMany({
          where: { id: item.orderId, paymentStatus: "UNPAID" },
          data: { paymentStatus: "PAID", paidAt: new Date() },
        });
        if (paid.count > 0) {
          await recordOrderStatus(tx, item.orderId, item.order.status, {
            note: "Pembayaran COD diterima (serah terima selesai)",
            actor: vendor ? `vendor:${vendor.id}` : `admin:${user.id}`,
          });
        }
      }

      // Item dibatalkan → kembalikan stok (varian bila ada)
      if (status === "DIBATALKAN") {
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
        // Guard: order terminal (CANCELLED/EXPIRED) tidak boleh bangkit lagi
        // — status dicek ulang di dalam tx, bukan hanya di atas.
        const synced = await tx.order.updateMany({
          where: {
            id: item.orderId,
            status: { notIn: ["CANCELLED", "EXPIRED", "COMPLETED"] },
          },
          data: { status: orderStatus },
        });
        if (synced.count > 0) {
          await recordOrderStatus(tx, item.orderId, orderStatus, {
            actor: vendor ? `vendor:${vendor.id}` : `admin:${user.id}`,
          });
        }
      }
    });
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Gagal mengubah status",
    };
  }

  revalidatePath("/dashboard/pesanan");
  return { ok: true as const };
}
