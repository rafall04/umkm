import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getProductsByVillage } from "@/lib/queries";
import { AddToCart } from "@/components/add-to-cart";
import { ProductCard } from "@/components/product-card";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ desa: string; slug: string }> };

async function getProduct(desa: string, slug: string) {
  return db.product.findFirst({
    where: {
      slug,
      isActive: true,
      village: { slug: desa },
      vendor: { isActive: true, isVerified: true },
    },
    include: { vendor: { include: { village: true } }, category: true, village: true },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa, slug } = await params;
  const product = await getProduct(desa, slug);
  if (!product) return {};
  return {
    title: `${product.name} — ${product.vendor.name}, ${product.village.name}`,
    description: product.description.slice(0, 160),
    openGraph: { images: product.images[0] ? [product.images[0]] : [] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { desa, slug } = await params;
  const product = await getProduct(desa, slug);
  if (!product) notFound();

  await db.product.update({
    where: { id: product.id },
    data: { views: { increment: 1 } },
  });

  const related = (await getProductsByVillage(product.villageId, { limit: 5 })).filter(
    (p) => p.id !== product.id,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images[0],
    category: product.category.name,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "IDR",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
    brand: { "@type": "Brand", name: product.vendor.name },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-stone-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-600">Beranda</Link>
        <span className="mx-2">/</span>
        <Link href={`/${product.village.slug}`} className="hover:text-brand-600">
          {product.village.name}
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/${product.village.slug}/produk`} className="hover:text-brand-600">Produk</Link>
        <span className="mx-2">/</span>
        <span className="text-stone-800">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* Galeri */}
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-stone-100">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-7xl text-stone-300">
              🧺
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <Link
            href={`/${product.village.slug}/kategori/${product.category.slug}`}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            {product.category.icon} {product.category.name}
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
          <p className="mt-3 text-3xl font-extrabold text-brand-700">
            {rupiah(product.price)}
            <span className="text-base font-normal text-stone-500"> /{product.unit}</span>
          </p>

          <div className="mt-6">
            <AddToCart
              productId={product.id}
              slug={product.slug}
              name={product.name}
              price={product.price}
              image={product.images[0]}
              unit={product.unit}
              stock={product.stock}
              vendorId={product.vendorId}
              vendorName={product.vendor.name}
              villageSlug={product.village.slug}
              whatsapp={product.vendor.whatsapp}
            />
          </div>

          <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">Deskripsi Produk</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-600">
              {product.description}
            </p>
          </div>

          {/* Info toko */}
          <Link
            href={`/${product.village.slug}/umkm/${product.vendor.slug}`}
            className="mt-4 flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 transition hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-xl">
              🏪
            </div>
            <div className="flex-1">
              <p className="font-semibold">{product.vendor.name}</p>
              <p className="text-sm text-stone-500">{product.village.name} · ✓ Terverifikasi</p>
            </div>
            <span className="text-sm font-semibold text-brand-600">Lihat toko →</span>
          </Link>
        </div>
      </div>

      {/* Produk terkait */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold">Produk Lain dari {product.village.name}</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.slice(0, 4).map((p) => (
              <ProductCard
                key={p.id}
                slug={p.slug}
                name={p.name}
                price={p.price}
                unit={p.unit}
                image={p.images[0]}
                vendorName={p.vendor.name}
                villageSlug={product.village.slug}
                villageName={product.village.name}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
