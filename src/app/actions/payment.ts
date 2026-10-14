"use server";

import { db } from "@/lib/db";
import {
  requireRole,
  getMyVendor,
  getFreshSessionUser,
  adminVillageFilter,
} from "@/lib/session";
import { normalizePhone } from "@/lib/format";
import { rateLimit } from "@/lib/rate-limit";
import { expireOrderIfStale, recordOrderStatus } from "@/lib/orders";
import { writeFile, mkdir, unlink } from "fs/promises";
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

/** Hapus file upload dari disk berdasarkan path publiknya (/uploads/xxx). */
async function removeUpload(publicPath: string | null): Promise<void> {
  if (!publicPath?.startsWith("/uploads/")) return;
  const filename = path.basename(publicPath); // cegah path traversal
  await unlink(path.join(process.cwd(), "uploads", filename)).catch(() => {});
}

/**
 * Pembeli mengunggah foto bukti bayar (QRIS/transfer ke toko).
 * Akses tanpa login — diverifikasi lewat kode order + no HP (sama seperti lacak).
 */
export async function submitPaymentProof(
  code: string,
  phone: string,
  formData: FormData,
): Promise<Result> {
  const normalizedCode = code.trim().toUpperCase();
  if (!rateLimit(`proof:${normalizedCode}`, 10, 10 * 60 * 1000)) {
    return { ok: false, error: "Terlalu banyak percobaan. Coba lagi nanti." };
  }

  // Tandai kedaluwarsa dulu — bukti bayar tidak boleh masuk ke order mati
  await expireOrderIfStale(
    (await db.order.findUnique({
      where: { code: normalizedCode },
      select: { id: true },
    }))?.id ?? "",
  );

  const order = await db.order.findUnique({
    where: { code: normalizedCode },
    select: {
      id: true,
      code: true,
      buyerId: true,
      buyerPhone: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      paymentProof: true,
      items: { select: { vendor: { select: { villageId: true } } } },
    },
  });
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan" };

  // Admin dibatasi scope-nya: ADMIN_DESA hanya order wilayahnya
  // (fail-closed bila villageId kosong), SUPERADMIN bebas.
  const user = await getFreshSessionUser();
  const isAdmin =
    user?.role === "SUPERADMIN" ||
    (user?.role === "ADMIN_DESA" &&
      !!user.villageId &&
      order.items.some((i) => i.vendor.villageId === user.villageId));
  const allowed =
    normalizePhone(order.buyerPhone) === normalizePhone(phone) ||
    (user?.id && user.id === order.buyerId) ||
    isAdmin;
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

  // Guard: order mungkin berubah status antara pengecekan dan penulisan file
  const res = await db.order.updateMany({
    where: {
      id: order.id,
      status: { notIn: ["CANCELLED", "EXPIRED"] },
      paymentStatus: { in: ["UNPAID", "PENDING"] },
    },
    data: {
      paymentProof: `/uploads/${filename}`,
      // UNPAID → PENDING (menunggu konfirmasi penjual); re-upload saat PENDING tetap PENDING
      paymentStatus: "PENDING",
    },
  });
  if (res.count === 0) {
    await removeUpload(`/uploads/${filename}`);
    return { ok: false, error: "Pesanan tidak dapat menerima bukti bayar" };
  }

  // Bukti lama yang digantikan tidak dipakai lagi — bersihkan dari disk
  if (order.paymentProof && order.paymentProof !== `/uploads/${filename}`) {
    await removeUpload(order.paymentProof);
  }

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

  // Order lewat batas bayar tidak boleh lagi di-approve
  await expireOrderIfStale(orderId);

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
    // Guard PENDING — dua peninjau tidak bisa approve bersamaan
    try {
      await db.$transaction(async (tx) => {
        const res = await tx.order.updateMany({
          where: { id: order.id, paymentStatus: "PENDING", status: "PENDING" },
          data: { paymentStatus: "PAID", paidAt: new Date(), status: "PAID" },
        });
        if (res.count === 0) throw new Error("race");
        await recordOrderStatus(tx, order.id, "PAID", {
          note: "Bukti transfer disetujui",
          actor: vendor ? `vendor:${vendor.id}` : `admin:${user.id}`,
        });
      });
    } catch {
      return { ok: false, error: "Status pesanan sudah berubah — muat ulang" };
    }
  } else {
    const res = await db.order.updateMany({
      where: { id: order.id, paymentStatus: "PENDING" },
      data: { paymentStatus: "UNPAID", paymentProof: null },
    });
    if (res.count === 0) {
      return { ok: false, error: "Status pesanan sudah berubah — muat ulang" };
    }
    // File bukti yang ditolak tidak dipakai — bersihkan dari disk
    await removeUpload(order.paymentProof);
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
