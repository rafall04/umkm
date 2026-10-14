import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getVillageBySlug, getProductsByVillage, getRatingMap } from "@/lib/queries";
import { safeJsonLd } from "@/lib/format";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ desa: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa, slug } = await params;
  const [village, category] = await Promise.all([
    getVillageBySlug(desa),
    db.category.findUnique({ where: { slug } }),
  ]);
  if (!village || !category) return {};
  return {
    title: `${category.name} ${village.name} — Produk UMKM`,
    description: `Belanja ${category.name.toLowerCase()} dari pelaku UMKM ${village.name}, Kecamatan ${village.kecamatan}, ${village.kabupaten}.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { desa, slug } = await params;
  const [village, category] = await Promise.all([
    getVillageBySlug(desa),
    db.category.findUnique({ where: { slug } }),
  ]);
  if (!village) notFound();
  if (!category) redirect(`/${village.slug}/produk`);

  const products = await getProductsByVillage(village.id, { categoryId: category.id });
  const ratings = await getRatingMap(products.map((p) => p.id));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category.name} ${village.name}`,
    numberOfItems: products.length,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <nav className="text-sm text-stone-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-600">Beranda</Link>
        <span className="mx-2">/</span>
        <Link href={`/${village.slug}`} className="hover:text-brand-600">{village.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-stone-800">{category.name}</span>
      </nav>

      <h1 className="mt-3 text-3xl font-bold">
        {category.icon} {category.name} — {village.name}
      </h1>
      <p className="mt-1 text-stone-600">{products.length} produk</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            slug={p.slug}
            name={p.name}
            price={p.price}
            compareAtPrice={p.compareAtPrice}
            unit={p.unit}
            image={p.images[0]}
            vendorName={p.vendor.name}
            villageSlug={village.slug}
            villageName={village.name}
            ratingAvg={ratings.get(p.id)?.avg}
            ratingCount={ratings.get(p.id)?.count}
          />
        ))}
      </div>
      {products.length === 0 && (
        <p className="mt-8 rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
          Belum ada produk {category.name.toLowerCase()} di wilayah ini.
        </p>
      )}
    </div>
  );
}
