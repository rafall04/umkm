"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { orderCode } from "@/lib/format";
import { getGateway } from "@/lib/payments";
import { redirect } from "next/navigation";

const checkoutSchema = z
  .object({
    buyerName: z.string().min(3, "Nama minimal 3 karakter"),
    buyerPhone: z.string().min(9, "Nomor HP tidak valid").max(16),
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
  const shippingFee =
    data.deliveryMethod === "ANTAR_DESA"
      ? Number(process.env.NEXT_PUBLIC_FLAT_SHIPPING_FEE ?? 5000)
      : 0;
  const total = subtotal + shippingFee;

  // Buat order + items + kurangi stok dalam satu transaksi
  const code = orderCode();
  let order;
  try {
    order = await db.$transaction(async (tx) => {
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
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal membuat pesanan.",
    };
  }

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
  const order = await db.order.findUnique({
    where: { code: code.trim().toUpperCase() },
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

  // Hanya pemilik no HP atau user pemilik order yang boleh lihat
  const session = await auth();
  const allowed =
    order.buyerPhone === phone.trim() ||
    (session?.user?.id && session.user.id === order.buyerId) ||
    (session?.user?.role === "ADMIN_DESA" || session?.user?.role === "SUPERADMIN");
  if (!allowed) return null;

  return order;
}

export async function cancelOrder(code: string, phone: string) {
  const order = await trackOrder(code, phone);
  if (
    order &&
    ["PENDING", "PROCESSING"].includes(order.status) &&
    order.paymentStatus !== "PAID"
  ) {
    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
      // kembalikan stok
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
