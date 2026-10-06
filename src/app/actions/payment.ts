"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { requireRole, getMyVendor, adminVillageFilter } from "@/lib/session";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

const MAX_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

type Result = { ok: true } | { ok: false; error: string };

/**
 * Pembeli mengunggah foto bukti bayar (QRIS/transfer ke toko).
 * Akses tanpa login — diverifikasi lewat kode order + no HP (sama seperti lacak).
 */
export async function submitPaymentProof(
  code: string,
  phone: string,
  formData: FormData,
): Promise<Result> {
  const order = await db.order.findUnique({
    where: { code: code.trim().toUpperCase() },
    select: {
      id: true,
      code: true,
      buyerId: true,
      buyerPhone: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
    },
  });
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan" };

  const session = await auth();
  const allowed =
    order.buyerPhone === phone.trim() ||
    (session?.user?.id && session.user.id === order.buyerId) ||
    session?.user?.role === "ADMIN_DESA" ||
    session?.user?.role === "SUPERADMIN";
  if (!allowed) return { ok: false, error: "Nomor HP tidak cocok dengan pesanan" };

  if (order.paymentMethod !== "TRANSFER") {
    return { ok: false, error: "Metode pembayaran pesanan ini bukan transfer/QRIS" };
  }
  if (["CANCELLED", "EXPIRED"].includes(order.status)) {
    return { ok: false, error: "Pesanan sudah dibatalkan" };
  }
  if (order.paymentStatus === "PAID") {
    return { ok: false, error: "Pesanan sudah lunas" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pilih foto bukti pembayaran" };
  }
  const ext = ALLOWED[file.type];
  if (!ext) return { ok: false, error: "Format harus JPG/PNG/WebP" };
  if (file.size > MAX_SIZE) return { ok: false, error: "Ukuran maksimal 3MB" };

  const filename = `${nanoid(12)}.${ext}`;
  const uploadDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(
    path.join(uploadDir, filename),
    Buffer.from(await file.arrayBuffer()),
  );

  await db.order.update({
    where: { id: order.id },
    data: {
      paymentProof: `/uploads/${filename}`,
      // UNPAID → PENDING (menunggu konfirmasi penjual); re-upload saat PENDING tetap PENDING
      paymentStatus: "PENDING",
    },
  });
  revalidatePath(`/pesanan/${order.code}`);
  return { ok: true };
}

/**
 * Penjual (atau admin) mengonfirmasi / menolak bukti pembayaran.
 * approve → lunas (PAID), order PENDING → PAID.
 * reject  → bukti dihapus, kembali UNPAID agar pembeli upload ulang.
 */
export async function reviewPaymentProof(
  orderId: string,
  decision: "approve" | "reject",
): Promise<Result> {
  const user = await requireRole("VENDOR", "ADMIN_DESA", "SUPERADMIN");
  const isAdmin = user.role === "ADMIN_DESA" || user.role === "SUPERADMIN";
  const vendor = await getMyVendor(user.id);
  if (!isAdmin && !vendor) return { ok: false, error: "Tidak berwenang" };

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { vendor: { select: { villageId: true } } } } },
  });
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan" };

  // Otorisasi: vendor hanya order yang berisi item miliknya;
  // ADMIN_DESA hanya order di wilayahnya
  if (vendor && !order.items.some((i) => i.vendorId === vendor.id)) {
    return { ok: false, error: "Tidak berwenang" };
  }
  const filter = adminVillageFilter(user);
  if (
    filter.villageId &&
    !order.items.some((i) => i.vendor.villageId === filter.villageId)
  ) {
    return { ok: false, error: "Pesanan di luar wilayah Anda" };
  }

  if (order.paymentMethod !== "TRANSFER") {
    return { ok: false, error: "Bukan pembayaran transfer/QRIS" };
  }
  if (["CANCELLED", "EXPIRED"].includes(order.status)) {
    return { ok: false, error: "Pesanan sudah dibatalkan" };
  }
  if (order.paymentStatus !== "PENDING" || !order.paymentProof) {
    return { ok: false, error: "Belum ada bukti pembayaran untuk ditinjau" };
  }

  if (decision === "approve") {
    await db.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        // Hanya naikkan PENDING → PAID; jangan mundurkan status lanjutan
        ...(order.status === "PENDING" ? { status: "PAID" as const } : {}),
      },
    });
  } else {
    await db.order.update({
      where: { id: order.id },
      data: { paymentStatus: "UNPAID", paymentProof: null },
    });
  }

  await db.paymentLog.create({
    data: {
      orderId: order.id,
      gateway: "manual",
      event: `proof_${decision === "approve" ? "approved" : "rejected"}`,
      payload: { by: user.id, role: user.role, proof: order.paymentProof },
    },
  });

  revalidatePath("/dashboard/pesanan");
  revalidatePath("/admin/pesanan");
  revalidatePath(`/pesanan/${order.code}`);
  return { ok: true };
}
