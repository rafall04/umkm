import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getRatingMap } from "@/lib/queries";
import { ProductCard } from "@/components/product-card";
import { waLink, safeJsonLd } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ desa: string; slug: string }> };

async function getVendor(desa: string, slug: string) {
  return db.vendor.findFirst({
    where: { slug, village: { slug: desa, isActive: true }, isActive: true, isVerified: true },
    include: {
      village: true,
      products: {
        where: { isActive: true },
        include: { category: true },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { products: true } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa, slug } = await params;
  const vendor = await getVendor(desa, slug);
  if (!vendor) return {};
  return {
    title: `${vendor.name} — UMKM ${vendor.village.name}`,
    description: vendor.description.slice(0, 160),
  };
}

export default async function VendorPage({ params }: Props) {
  const { desa, slug } = await params;
  const vendor = await getVendor(desa, slug);
  if (!vendor) notFound();
  const ratings = await getRatingMap(vendor.products.map((p) => p.id));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: vendor.name,
    description: vendor.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: vendor.address,
      addressLocality: `${vendor.village.name}, Kecamatan ${vendor.village.kecamatan}`,
      addressRegion: vendor.village.provinsi,
      addressCountry: "ID",
    },
    telephone: vendor.phone ?? undefined,
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
        <Link href={`/${vendor.village.slug}`} className="hover:text-brand-600">
          {vendor.village.name}
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/${vendor.village.slug}/umkm`} className="hover:text-brand-600">UMKM</Link>
        <span className="mx-2">/</span>
        <span className="text-stone-800">{vendor.name}</span>
      </nav>

      {/* Profil toko */}
      <div className="mt-6 flex flex-col gap-6 rounded-3xl border border-stone-200 bg-white p-6 sm:flex-row sm:items-start">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-stone-100">
          {vendor.logo ? (
            <Image src={vendor.logo} alt={vendor.name} fill sizes="96px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl">🏪</div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            {vendor.name}
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
              ✓ Terverifikasi
            </span>
          </h1>
          <p className="mt-2 max-w-2xl text-stone-600">{vendor.description}</p>
          <p className="mt-3 text-sm text-stone-500">📍 {vendor.address}</p>
          <div className="mt-4 flex gap-3">
            {vendor.whatsapp && (
              <a
                href={waLink(vendor.whatsapp, `Halo ${vendor.name}, saya lihat toko Anda di Pasar UMKM.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
              >
                Chat WhatsApp
              </a>
            )}
            <p className="self-center text-sm font-medium text-stone-500">
              {vendor._count.products} produk
            </p>
          </div>
        </div>
      </div>

      {/* Produk toko */}
      <h2 className="mt-10 text-xl font-bold">Produk {vendor.name}</h2>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {vendor.products.map((p) => (
          <ProductCard
            key={p.id}
            slug={p.slug}
            name={p.name}
            price={p.price}
            compareAtPrice={p.compareAtPrice}
            unit={p.unit}
            image={p.images[0]}
            vendorName={vendor.name}
            villageSlug={vendor.village.slug}
            villageName={vendor.village.name}
            ratingAvg={ratings.get(p.id)?.avg}
            ratingCount={ratings.get(p.id)?.count}
          />
        ))}
      </div>
      {vendor.products.length === 0 && (
        <p className="mt-5 rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
          Toko ini belum menambahkan produk.
        </p>
      )}
    </div>
  );
}
