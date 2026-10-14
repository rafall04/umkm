import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getVillageBySlug, getProductsByVillage, getCategories, getRatingMap } from "@/lib/queries";
import { ProductCard } from "@/components/product-card";
import { SearchBar } from "@/components/search-bar";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ desa: string }>;
  searchParams: Promise<{ q?: string; kategori?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params;
  const village = await getVillageBySlug(desa);
  if (!village) return {};
  return {
    title: `Produk UMKM ${village.name}, ${village.kabupaten}`,
    description: `Belanja produk UMKM asli ${village.name}: makanan, kerajinan, hasil pertanian, dan lainnya langsung dari pelaku usaha lokal.`,
  };
}

export default async function DesaProductsPage({ params, searchParams }: Props) {
  const [{ desa }, sp] = await Promise.all([params, searchParams]);
  const village = await getVillageBySlug(desa);
  if (!village) notFound();

  const categories = await getCategories();
  const activeCategory = sp.kategori
    ? categories.find((c) => c.slug === sp.kategori)
    : undefined;
  const products = await getProductsByVillage(village.id, {
    q: sp.q,
    categoryId: activeCategory?.id,
  });
  const ratings = await getRatingMap(products.map((p) => p.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="text-sm text-stone-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-600">Beranda</Link>
        <span className="mx-2">/</span>
        <Link href={`/${village.slug}`} className="hover:text-brand-600">{village.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-stone-800">Produk</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Produk {village.name}
            {activeCategory && ` — ${activeCategory.name}`}
          </h1>
          <p className="mt-1 text-stone-600">{products.length} produk ditemukan</p>
        </div>
        <SearchBar basePath={`/${village.slug}/produk`} />
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        <Link
          href={`/${village.slug}/produk`}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${!activeCategory ? "bg-brand-600 text-white" : "border border-stone-300 hover:border-brand-500"}`}
        >
          Semua
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/${village.slug}/kategori/${c.slug}`}
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
          Tidak ada produk yang cocok{sp.q && ` dengan pencarian "${sp.q}"`}.
        </p>
      )}
    </div>
  );
}
