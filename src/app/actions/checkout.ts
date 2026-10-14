"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { orderCode, normalizePhone } from "@/lib/format";
import { getGateway } from "@/lib/payments";
import { rateLimit } from "@/lib/rate-limit";
import { expireOrderIfStale } from "@/lib/orders";
import { getFreshSessionUser } from "@/lib/session";
import { FLAT_SHIPPING_FEE } from "@/lib/config";
import { redirect } from "next/navigation";

const checkoutSchema = z
  .object({
    buyerName: z.string().min(3, "Nama minimal 3 karakter"),
    // Disimpan dalam bentuk ternormalisasi (62xxx) agar lacak-pesanan
    // cocok walau pembeli menulis 08xx / +62 / spasi.
    buyerPhone: z.preprocess(
      (v) => (typeof v === "string" ? normalizePhone(v) : v),
      z.string().min(9, "Nomor HP tidak valid").max(16),
    ),
    deliveryMethod: z.enum(["COD", "ANTAR_DESA", "AMBIL_SENDIRI"]),
    addressText: z.string().optional().default(""),
    note: z.string().optional(),
    paymentMethod: z.enum(["GATEWAY", "TRANSFER", "COD"]),
    items: z
      .array(z.object({ productId: z.string(), qty: z.number().int().positive() }))
      .min(1, "Keranjang kosong"),
  })
  .superRefine((d, ctx) => {
    if (d.deliveryMethod !== "AMBIL_SENDIRI" && d.addressText.trim().length < 10) {
      ctx.addIssue({
        code: "custom",
        path: ["addressText"],
        message: "Alamat lengkap minimal 10 karakter",
      });
    }
  });

export type CheckoutResult =
  | { ok: true; orderCode: string; paymentUrl: string | null }
  | { ok: false; error: string };

export async function placeOrder(input: unknown): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const data = parsed.data;

  const session = await auth();

  if (!rateLimit(`order:${data.buyerPhone}`, 10, 10 * 60 * 1000)) {
    return { ok: false, error: "Terlalu banyak percobaan. Coba lagi beberapa menit." };
  }

  // Pembayaran online hanya jika gateway sungguhan dikonfigurasi
  if (data.paymentMethod === "GATEWAY" && getGateway().name === "manual") {
    return {
      ok: false,
      error: "Pembayaran online belum tersedia. Pilih COD atau Transfer.",
    };
  }

  // Ambil produk asli dari DB — jangan percaya harga dari client
  const productIds = data.items.map((i) => i.productId);
  const products = await db.product.findMany({
    where: {
      id: { in: productIds },
      isActive: true,
      village: { isActive: true },
      vendor: { isActive: true, isVerified: true },
    },
    include: { vendor: true },
  });
  if (products.length !== productIds.length) {
    return { ok: false, error: "Ada produk yang sudah tidak tersedia. Periksa keranjang Anda." };
  }

  // Keranjang maksimal 1 toko — pembayaran langsung ke masing-masing penjual
  if (new Set(products.map((p) => p.vendorId)).size > 1) {
    return {
      ok: false,
      error: "Keranjang hanya boleh berisi produk dari 1 toko per pesanan.",
    };
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  for (const item of data.items) {
    const p = byId.get(item.productId)!;
    if (item.qty > p.stock) {
      return { ok: false, error: `Stok "${p.name}" tersisa ${p.stock}.` };
    }
  }

  const subtotal = data.items.reduce(
    (sum, i) => sum + i.qty * byId.get(i.productId)!.price,
    0,
  );
  const shippingFee = data.deliveryMethod === "ANTAR_DESA" ? FLAT_SHIPPING_FEE : 0;
  const total = subtotal + shippingFee;

  // Buat order + items + kurangi stok dalam satu transaksi.
  // Retry dengan kode baru bila tabrakan unique (sangat jarang).
  const createOrder = (code: string) =>
    db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          code,
          buyerId: session?.user?.id ?? null,
          buyerName: data.buyerName,
          buyerPhone: data.buyerPhone,
          deliveryMethod: data.deliveryMethod,
          addressText: data.deliveryMethod === "AMBIL_SENDIRI" ? "-" : data.addressText,
          note: data.note,
          paymentMethod: data.paymentMethod,
          paymentStatus: "UNPAID",
          // COD langsung diproses vendor (bayar saat terima); TRANSFER/GATEWAY menunggu pembayaran
          status: data.paymentMethod === "COD" ? "PROCESSING" : "PENDING",
          // TRANSFER kedaluwarsa 24 jam — stok tidak tersangkut selamanya
          expiredAt:
            data.paymentMethod === "TRANSFER"
              ? new Date(Date.now() + 24 * 3600 * 1000)
              : null,
          subtotal,
          shippingFee,
          total,
          items: {
            create: data.items.map((i) => {
              const p = byId.get(i.productId)!;
              return {
                vendorId: p.vendorId,
                productId: p.id,
                productName: p.name,
                productImage: p.images[0] ?? null,
                price: p.price,
                qty: i.qty,
                subtotal: i.qty * p.price,
              };
            }),
          },
        },
        include: { items: true },
      });

      // Kurangi stok secara atomik — updateMany dengan guard stock >= qty
      for (const i of data.items) {
        const res = await tx.product.updateMany({
          where: { id: i.productId, stock: { gte: i.qty } },
          data: { stock: { decrement: i.qty } },
        });
        if (res.count === 0) {
          throw new Error(
            `Stok "${byId.get(i.productId)!.name}" tidak mencukupi.`,
          );
        }
      }

      return created;
    });

  let order: Awaited<ReturnType<typeof createOrder>> | undefined;
  let code = orderCode();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      order = await createOrder(code);
      break;
    } catch (e) {
      if ((e as { code?: string }).code === "P2002" && attempt < 2) {
        code = orderCode();
        continue;
      }
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Gagal membuat pesanan.",
      };
    }
  }
  if (!order) return { ok: false, error: "Gagal membuat pesanan." };

  // COD / transfer manual → langsung tampil halaman pesanan
  if (data.paymentMethod !== "GATEWAY") {
    return { ok: true, orderCode: code, paymentUrl: null };
  }

  // Payment gateway
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const gateway = getGateway();
  try {
    const result = await gateway.createTransaction({
      orderCode: code,
      amount: total,
      customerName: data.buyerName,
      customerPhone: data.buyerPhone,
      customerEmail: session?.user?.email ?? undefined,
      items: data.items.map((i) => {
        const p = byId.get(i.productId)!;
        return { name: p.name, price: p.price, qty: i.qty };
      }),
      callbackUrl: `${appUrl}/api/payments/callback/${gateway.name}`,
      returnUrl: `${appUrl}/pesanan/${code}?hp=${encodeURIComponent(data.buyerPhone)}`,
    });

    await db.order.update({
      where: { id: order.id },
      data: {
        paymentRef: result.reference,
        paymentUrl: result.paymentUrl,
        paymentChannel: result.channel,
        expiredAt: result.expiredAt,
      },
    });
    await db.paymentLog.create({
      data: { orderId: order.id, gateway: gateway.name, event: "created", payload: (result.raw ?? {}) as object },
    });

    return { ok: true, orderCode: code, paymentUrl: result.paymentUrl };
  } catch (e) {
    // Gagal membuat transaksi gateway → order tetap ada, user bisa bayar manual
    await db.paymentLog.create({
      data: {
        orderId: order.id,
        gateway: gateway.name,
        event: "created",
        payload: { error: e instanceof Error ? e.message : String(e) },
      },
    });
    return { ok: true, orderCode: code, paymentUrl: null };
  }
}

export async function trackOrder(code: string, phone: string) {
  const normalizedCode = code.trim().toUpperCase();
  if (!rateLimit(`track:${normalizedCode}`, 30, 10 * 60 * 1000)) return null;

  const order = await db.order.findUnique({
    where: { code: normalizedCode },
    include: {
      items: {
        include: {
          vendor: {
            select: { name: true, village: true, whatsapp: true, qrisImage: true },
          },
        },
      },
      buyer: { select: { id: true } },
    },
  });
  if (!order) return null;

  // Hanya pemilik no HP atau user pemilik order yang boleh lihat.
  // Kedua sisi dinormalisasi — cocok juga untuk order lama (08xx).
  // Admin dibatasi scope-nya: ADMIN_DESA hanya order wilayahnya
  // (fail-closed bila villageId kosong), SUPERADMIN bebas.
  const user = await getFreshSessionUser();
  const isAdmin =
    user?.role === "SUPERADMIN" ||
    (user?.role === "ADMIN_DESA" &&
      !!user.villageId &&
      order.items.some((i) => i.vendor.village.id === user.villageId));
  const allowed =
    normalizePhone(order.buyerPhone) === normalizePhone(phone) ||
    (user?.id && user.id === order.buyerId) ||
    isAdmin;
  if (!allowed) return null;

  // Tandai kedaluwarsa bila batas bayar sudah lewat (lazy sweep)
  await expireOrderIfStale(order.id);

  return db.order.findUnique({
    where: { id: order.id },
    include: {
      items: {
        include: {
          vendor: {
            select: { name: true, village: true, whatsapp: true, qrisImage: true },
          },
        },
      },
      buyer: { select: { id: true } },
    },
  });
}

// Struk: akses sama dengan trackOrder (pembeli via HP/session, admin ber-scope),
// ditambah vendor pemilik order — vendor butuh mencetak struk dari dashboard.
export async function getReceiptOrder(code: string, phone: string) {
  const order = await trackOrder(code, phone);
  if (order) return order;
  const user = await getFreshSessionUser();
  if (user?.role !== "VENDOR") return null;
  const own = await db.order.findUnique({
    where: { code: code.trim().toUpperCase() },
    select: { id: true, items: { select: { vendor: { select: { ownerId: true } } } } },
  });
  if (!own || !own.items.some((i) => i.vendor.ownerId === user.id)) return null;
  await expireOrderIfStale(own.id);
  return db.order.findUnique({
    where: { id: own.id },
    include: {
      items: {
        include: {
          vendor: {
            select: { name: true, village: true, whatsapp: true, qrisImage: true },
          },
        },
      },
      buyer: { select: { id: true } },
    },
  });
}

export async function cancelOrder(code: string, phone: string) {
  const order = await trackOrder(code, phone);
  if (
    order &&
    ["PENDING", "PROCESSING"].includes(order.status) &&
    order.paymentStatus !== "PAID"
  ) {
    await db.$transaction(async (tx) => {
      // Guard status di dalam transaksi — pembatalan konkuren hanya
      // mengembalikan stok sekali (updateMany count = 0 pada yang kalah).
      const res = await tx.order.updateMany({
        where: {
          id: order.id,
          status: { in: ["PENDING", "PROCESSING"] },
          paymentStatus: { not: "PAID" },
        },
        data: { status: "CANCELLED" },
      });
      if (res.count === 0) return;
      await Promise.all(
        order.items.map((i) =>
          tx.product.update({
            where: { id: i.productId },
            data: { stock: { increment: i.qty } },
          }),
        ),
      );
    });
  }
  redirect(`/pesanan/${code}?hp=${encodeURIComponent(phone)}`);
}
