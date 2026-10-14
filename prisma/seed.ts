import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { slugify } from "../src/lib/format";
import { RESERVED_SLUGS } from "../src/lib/slugs";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

async function main() {
  console.log("Seeding wilayah, kategori, user, dan contoh UMKM...");

  // ─── Desa ──────────────────────────────────────────────────────────────
  const dander = await db.village.upsert({
    where: { slug: "dander" },
    update: {},
    create: {
      slug: "dander",
      name: "Dander",
      kecamatan: "Dander",
      kabupaten: "Bojonegoro",
      provinsi: "Jawa Timur",
      description:
        "Dander, Kecamatan Dander, Kabupaten Bojonegoro — pusat UMKM lokal dengan produk olahan pangan, kerajinan, dan hasil pertanian khas.",
      heroImage: "/images/desa-dander.svg",
    },
  });

  const tanjungharjo = await db.village.upsert({
    where: { slug: "tanjungharjo" },
    update: {},
    create: {
      slug: "tanjungharjo",
      name: "Tanjungharjo",
      kecamatan: "Kapas",
      kabupaten: "Bojonegoro",
      provinsi: "Jawa Timur",
      description:
        "Tanjungharjo, Kecamatan Kapas, Kabupaten Bojonegoro — rumah bagi pelaku UMKM produktif dengan produk unggulan makanan, kerajinan, dan hasil bumi.",
      heroImage: "/images/desa-tanjungharjo.svg",
    },
  });

  // ─── Master wilayah Bojonegoro (data Kemendagri) ───────────────────────
  // Semua desa/kelurahan di-seed nonaktif — SUPERADMIN mengaktifkan lewat
  // /admin/desa saat ada UMKM pertama di wilayah itu. Slug "dander" dan
  // "tanjungharjo" sudah di-upsert di atas sehingga tidak tertimpa.
  type MasterVillage = { id: string; name: string; kecamatan: string };
  const master = JSON.parse(
    readFileSync(join(__dirname, "data", "bojonegoro-villages.json"), "utf8"),
  ) as MasterVillage[];
  const titleCase = (s: string) =>
    s.toLowerCase().replace(/(^|\s|-)(\w)/g, (_, p, c) => p + c.toUpperCase());
  // Hindari duplikat desa yang sudah dikurasi dengan ejaan berbeda
  // (master menulis "TANJUNG HARJO" vs slug "tanjungharjo") — bandingkan
  // slug tanpa tanda hubung.
  const existing = await db.village.findMany({ select: { slug: true } });
  const existingFlat = new Set(existing.map((v) => v.slug.replace(/-/g, "")));
  const takenSlugs = new Set(existing.map((v) => v.slug));
  for (const v of master) {
    const name = titleCase(v.name);
    const kecamatan = titleCase(v.kecamatan);
    const flat = slugify(name).replace(/-/g, "");
    if (existingFlat.has(flat)) continue;
    let slug = slugify(name);
    if (RESERVED_SLUGS.has(slug) || takenSlugs.has(slug)) {
      slug = `${slug}-${slugify(kecamatan)}`;
    }
    takenSlugs.add(slug);
    await db.village.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name,
        kecamatan,
        kabupaten: "Bojonegoro",
        provinsi: "Jawa Timur",
        description: `${name}, Kecamatan ${kecamatan}, Kabupaten Bojonegoro.`,
        isActive: false,
      },
    });
  }

  // ─── Kategori ─────────────────────────────────────────────────────────
  const catDefs = [
    { slug: "makanan-minuman", name: "Makanan & Minuman", icon: "🍜" },
    { slug: "kerajinan", name: "Kerajinan", icon: "🧺" },
    { slug: "pertanian", name: "Hasil Pertanian", icon: "🌾" },
    { slug: "fashion", name: "Fashion", icon: "👕" },
    { slug: "jasa", name: "Jasa", icon: "🛠️" },
  ];
  const cats = Object.fromEntries(
    await Promise.all(
      catDefs.map(async (c) => [
        c.slug,
        await db.category.upsert({
          where: { slug: c.slug },
          update: {},
          create: c,
        }),
      ]),
    ),
  );

  // ─── User ─────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await db.user.upsert({
    where: { email: "admin@umkm.local" },
    update: {},
    create: {
      email: "admin@umkm.local",
      name: "Super Admin",
      passwordHash: hash,
      role: "SUPERADMIN",
    },
  });

  const adminDander = await db.user.upsert({
    where: { email: "admin.dander@umkm.local" },
    update: {},
    create: {
      email: "admin.dander@umkm.local",
      name: "Admin Dander",
      passwordHash: hash,
      role: "ADMIN_DESA",
      villageId: dander.id,
    },
  });
  await db.user.upsert({
    where: { email: "admin.tanjungharjo@umkm.local" },
    update: {},
    create: {
      email: "admin.tanjungharjo@umkm.local",
      name: "Admin Tanjungharjo",
      passwordHash: hash,
      role: "ADMIN_DESA",
      villageId: tanjungharjo.id,
    },
  });
  void adminDander;

  // ─── Contoh vendor + produk ────────────────────────────────────────────
  async function seedVendor(opts: {
    slug: string;
    name: string;
    ownerEmail: string;
    villageId: string;
    description: string;
    whatsapp: string;
    products: { name: string; slug: string; price: number; unit: string; categorySlug: string; description: string; image: string }[];
  }) {
    const owner = await db.user.upsert({
      where: { email: opts.ownerEmail },
      update: {},
      create: {
        email: opts.ownerEmail,
        name: `Pemilik ${opts.name}`,
        passwordHash: hash,
        role: "VENDOR",
      },
    });

    const vendor = await db.vendor.upsert({
      where: { slug: opts.slug },
      update: {},
      create: {
        slug: opts.slug,
        name: opts.name,
        description: opts.description,
        ownerId: owner.id,
        villageId: opts.villageId,
        whatsapp: opts.whatsapp,
        phone: opts.whatsapp,
        address: `Jl. Raya, RT 01 RW 01`,
        isVerified: true,
      },
    });

    for (const p of opts.products) {
      await db.product.upsert({
        where: { slug: p.slug },
        update: {},
        create: {
          slug: p.slug,
          name: p.name,
          description: p.description,
          price: p.price,
          stock: 50,
          unit: p.unit,
          images: [p.image],
          vendorId: vendor.id,
          villageId: opts.villageId,
          categoryId: cats[p.categorySlug].id,
        },
      });
    }
    return vendor;
  }

  await seedVendor({
    slug: "keripik-mak-iis",
    name: "Keripik Mak Iis",
    ownerEmail: "makiis@umkm.local",
    villageId: dander.id,
    description: "Produsen keripik singkong dan pisang rumahan dari Dander.",
    whatsapp: "6281234567890",
    products: [
      {
        name: "Keripik Singkong Pedas",
        slug: "keripik-singkong-pedas-mak-iis",
        price: 10000,
        unit: "bungkus",
        categorySlug: "makanan-minuman",
        description: "Keripik singkong renyah dengan bumbu pedas khas. Kemasan 250 gram.",
        image: "/images/produk/keripik-singkong.svg",
      },
      {
        name: "Keripik Pisang Manis",
        slug: "keripik-pisang-manis-mak-iis",
        price: 12000,
        unit: "bungkus",
        categorySlug: "makanan-minuman",
        description: "Keripik pisang goreng kering dengan taburan gula. Cocok untuk oleh-oleh.",
        image: "/images/produk/keripik-pisang.svg",
      },
    ],
  });

  await seedVendor({
    slug: "anyaman-bambu-lestari",
    name: "Anyaman Bambu Lestari",
    ownerEmail: "anyaman@umkm.local",
    villageId: tanjungharjo.id,
    description: "Kerajinan anyaman bambu tradisional dari Tanjungharjo.",
    whatsapp: "6281234567891",
    products: [
      {
        name: "Besek Bambu Anyam",
        slug: "besek-bambu-anyam-lestari",
        price: 15000,
        unit: "pcs",
        categorySlug: "kerajinan",
        description: "Besek bambu anyaman tangan, ukuran sedang. Cocok untuk hampers dan kemasan.",
        image: "/images/produk/besek-bambu.svg",
      },
      {
        name: "Tudung Saji Anyam",
        slug: "tudung-saji-anyam-lestari",
        price: 35000,
        unit: "pcs",
        categorySlug: "kerajinan",
        description: "Tudung saji anyaman bambu berkualitas, awet dan rapi.",
        image: "/images/produk/tudung-saji.svg",
      },
    ],
  });

  console.log("Seeding selesai.");
  console.log(`Login superadmin: admin@umkm.local / ${ADMIN_PASSWORD}`);
  console.log(`Login admin wilayah: admin.dander@umkm.local / admin.tanjungharjo@umkm.local`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
