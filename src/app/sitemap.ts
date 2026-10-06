import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [villages, vendors, products, categories] = await Promise.all([
    db.village.findMany({ where: { isActive: true } }),
    db.vendor.findMany({
      where: { isActive: true, isVerified: true, village: { isActive: true } },
      include: { village: true },
    }),
    db.product.findMany({
      where: {
        isActive: true,
        village: { isActive: true },
        vendor: { isActive: true, isVerified: true },
      },
      include: { village: true },
    }),
    db.category.findMany(),
  ]);

  const statics: MetadataRoute.Sitemap = ["", "/produk", "/pesanan", "/daftar-umkm"].map(
    (p) => ({ url: `${base}${p}`, changeFrequency: "daily", priority: p === "" ? 1 : 0.7 }),
  );

  const villagePages: MetadataRoute.Sitemap = villages.flatMap((v) => [
    { url: `${base}/${v.slug}`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${base}/${v.slug}/produk`, changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${base}/${v.slug}/umkm`, changeFrequency: "weekly" as const, priority: 0.7 },
  ]);

  const categoryPages: MetadataRoute.Sitemap = villages.flatMap((v) =>
    categories.map((c) => ({
      url: `${base}/${v.slug}/kategori/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  );

  const vendorPages: MetadataRoute.Sitemap = vendors.map((v) => ({
    url: `${base}/${v.village.slug}/umkm/${v.slug}`,
    lastModified: v.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/${p.village.slug}/produk/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...statics, ...villagePages, ...categoryPages, ...vendorPages, ...productPages];
}
