"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { slugify, normalizePhone } from "@/lib/format";
import { rateLimit } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  // Disimpan ternormalisasi (62xxx) agar login & lacak-pesanan selalu cocok
  phone: z.preprocess(
    (v) => (typeof v === "string" ? normalizePhone(v) : v),
    z.string().min(9, "Nomor HP tidak valid").max(16),
  ),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
});

export async function registerBuyer(input: unknown) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message };
  }
  const { name, phone, email, password } = parsed.data;

  if (!rateLimit(`register:${phone}`, 5, 60 * 60 * 1000)) {
    return { ok: false as const, error: "Terlalu banyak percobaan. Coba lagi nanti." };
  }

  const existing = await db.user.findFirst({
    where: { OR: [{ phone }, ...(email ? [{ email: email.toLowerCase() }] : [])] },
  });
  if (existing) return { ok: false as const, error: "Nomor HP / email sudah terdaftar" };

  await db.user.create({
    data: {
      name,
      phone,
      email: email ? email.toLowerCase() : null,
      passwordHash: await bcrypt.hash(password, 10),
      role: "BUYER",
    },
  });
  return { ok: true as const };
}

const registerVendorSchema = registerSchema.extend({
  villageId: z.string().min(1, "Pilih lokasi usaha"),
  storeName: z.string().min(3, "Nama usaha minimal 3 karakter"),
  storeDescription: z.string().min(10, "Deskripsi usaha minimal 10 karakter"),
  whatsapp: z.string().min(9, "Nomor WhatsApp tidak valid"),
  address: z.string().min(10, "Alamat minimal 10 karakter"),
});

export async function registerVendor(input: unknown) {
  const parsed = registerVendorSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message };
  }
  const { name, phone, email, password, villageId, storeName, storeDescription, whatsapp, address } =
    parsed.data;

  if (!rateLimit(`register:${phone}`, 5, 60 * 60 * 1000)) {
    return { ok: false as const, error: "Terlalu banyak percobaan. Coba lagi nanti." };
  }

  // Wilayah nonaktif tidak boleh menerima pendaftaran baru
  const village = await db.village.findFirst({ where: { id: villageId, isActive: true } });
  if (!village) return { ok: false as const, error: "Lokasi usaha tidak ditemukan" };

  const existing = await db.user.findFirst({
    where: { OR: [{ phone }, ...(email ? [{ email: email.toLowerCase() }] : [])] },
  });
  if (existing) return { ok: false as const, error: "Nomor HP / email sudah terdaftar" };

  const baseSlug = slugify(storeName);
  let slug = baseSlug;
  let i = 1;
  while (await db.vendor.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++i}`;
  }

  await db.user.create({
    data: {
      name,
      phone,
      email: email ? email.toLowerCase() : null,
      passwordHash: await bcrypt.hash(password, 10),
      role: "VENDOR",
      vendor: {
        create: {
          name: storeName,
          slug,
          description: storeDescription,
          villageId,
          whatsapp,
          phone: whatsapp,
          address,
          isVerified: false, // menunggu verifikasi admin
        },
      },
    },
  });

  return { ok: true as const };
}
