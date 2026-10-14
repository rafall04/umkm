import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCategories } from "@/lib/queries";
import { ProductCard } from "@/components/product-card";
import { SearchBar } from "@/components/search-bar";
import { ProductToolbar } from "@/components/product-toolbar";
import { getVillages } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Semua Produk UMKM Bojonegoro",
  description:
    "Jelajahi seluruh produk UMKM dari pelaku usaha lokal se-Kabupaten Bojonegoro.",
};

type Props = {
  searchParams: Promise<{ q?: string; kategori?: string; desa?: string; urut?: string }>;
};

export default async function AllProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const [categories, villages] = await Promise.all([getCategories(), getVillages()]);
  const activeCategory = sp.kategori
    ? categories.find((c) => c.slug === sp.kategori)
    : undefined;

  const products = await db.product.findMany({
    where: {
      isActive: true,
      vendor: { isActive: true, isVerified: true },
      village: { isActive: true, ...(sp.desa ? { slug: sp.desa } : {}) },
      ...(activeCategory ? { categoryId: activeCategory.id } : {}),
      ...(sp.q
        ? {
            OR: [
              { name: { contains: sp.q, mode: "insensitive" } },
              { description: { contains: sp.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { vendor: true, village: true },
    orderBy:
      sp.urut === "murah"
        ? { price: "asc" }
        : sp.urut === "mahal"
          ? { price: "desc" }
          : sp.urut === "populer"
            ? { views: "desc" }
            : { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Semua Produk UMKM</h1>
          <p className="mt-1 text-stone-600">
            {products.length} produk dari seluruh Bojonegoro
          </p>
        </div>
        <SearchBar basePath="/produk" placeholder="Cari di semua wilayah..." />
      </div>

      <div className="mt-4">
        <Suspense>
          <ProductToolbar basePath="/produk" villages={villages} />
        </Suspense>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        <Link
          href="/produk"
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${!activeCategory ? "bg-brand-600 text-white" : "border border-stone-300 hover:border-brand-500"}`}
        >
          Semua Kategori
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/produk?kategori=${c.slug}`}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${activeCategory?.slug === c.slug ? "bg-brand-600 text-white" : "border border-stone-300 hover:border-brand-500"}`}
          >
            {c.icon} {c.name}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            slug={p.slug}
            name={p.name}
            price={p.price}
            unit={p.unit}
            image={p.images[0]}
            vendorName={p.vendor.name}
            villageSlug={p.village.slug}
            villageName={p.village.name}
            showVillage
          />
        ))}
      </div>
      {products.length === 0 && (
        <p className="mt-8 rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
          Tidak ada produk yang cocok.
        </p>
      )}
    </div>
  );
}
