import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getVillageBySlug, getVendorsByVillage, getProductsByVillage, getCategories } from "@/lib/queries";
import { safeJsonLd } from "@/lib/format";
import { ProductCard } from "@/components/product-card";
import { VendorCard } from "@/components/vendor-card";
import { SearchBar } from "@/components/search-bar";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ desa: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params;
  const village = await getVillageBySlug(desa);
  if (!village) return {};
  return {
    title: `UMKM ${village.name} — Produk Asli ${village.kecamatan}, ${village.kabupaten}`,
    description: village.description.slice(0, 160),
    alternates: { canonical: `/${village.slug}` },
  };
}

export default async function DesaPage({ params }: Props) {
  const { desa } = await params;
  const village = await getVillageBySlug(desa);
  if (!village) notFound();

  const [vendors, products, categories] = await Promise.all([
    getVendorsByVillage(village.id),
    getProductsByVillage(village.id, { limit: 8 }),
    getCategories(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: village.name,
    address: {
      "@type": "PostalAddress",
      addressLocality: village.kecamatan,
      addressRegion: village.provinsi,
      addressCountry: "ID",
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Hero desa */}
      <section className="border-b border-stone-200 bg-brand-50">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 lg:grid-cols-[1fr_360px]">
          <div>
            <nav className="text-sm text-stone-500" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-brand-600">Beranda</Link>
              <span className="mx-2">/</span>
              <span className="text-stone-800">{village.name}</span>
            </nav>
            <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              UMKM {village.name}
            </h1>
            <p className="mt-2 max-w-2xl text-stone-600">{village.description}</p>
            <p className="mt-3 text-sm font-medium text-brand-700">
              {village._count.vendors} UMKM terdaftar · {village._count.products} produk
            </p>
            <div className="mt-6">
              <SearchBar
                basePath={`/${village.slug}/produk`}
                placeholder={`Cari produk di ${village.name}...`}
              />
            </div>
          </div>
          {village.heroImage && (
            <div className="relative hidden aspect-[3/2] overflow-hidden rounded-3xl border border-brand-100 bg-white lg:block">
              <Image
                src={village.heroImage}
                alt={village.name}
                fill
                sizes="360px"
                className="object-cover"
                priority
              />
            </div>
          )}
        </div>
      </section>

      {/* Kategori per desa */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Link
            href={`/${village.slug}/produk`}
            className="shrink-0 rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:border-brand-500 hover:text-brand-700"
          >
            Semua
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/${village.slug}/kategori/${c.slug}`}
              className="shrink-0 rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:border-brand-500 hover:text-brand-700"
            >
              {c.icon} {c.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Produk terbaru desa */}
      <section className="mx-auto max-w-7xl px-4 pb-8">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-bold">Produk dari {village.name}</h2>
          <Link
            href={`/${village.slug}/produk`}
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            Semua produk →
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              slug={p.slug}
              name={p.name}
              price={p.price}
              unit={p.unit}
              image={p.images[0]}
              vendorName={p.vendor.name}
              villageSlug={village.slug}
              villageName={village.name}
            />
          ))}
        </div>
        {products.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
            Belum ada produk dari wilayah ini.
          </p>
        )}
      </section>

      {/* Direktori UMKM */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-bold">Pelaku UMKM {village.name}</h2>
          <Link
            href={`/${village.slug}/umkm`}
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            Semua UMKM →
          </Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.slice(0, 6).map((v) => (
            <VendorCard
              key={v.id}
              slug={v.slug}
              name={v.name}
              description={v.description}
              logo={v.logo}
              villageSlug={village.slug}
              productCount={v._count.products}
            />
          ))}
        </div>
        {vendors.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
            Belum ada UMKM terdaftar di wilayah ini.
          </p>
        )}
      </section>
    </div>
  );
}
