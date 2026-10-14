import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getProductsByVillage, getRatingMap } from "@/lib/queries";
import { AddToCart } from "@/components/add-to-cart";
import { ProductCard } from "@/components/product-card";
import { rupiah, safeJsonLd } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ desa: string; slug: string }> };

async function getProduct(desa: string, slug: string) {
  return db.product.findFirst({
    where: {
      slug,
      isActive: true,
      village: { slug: desa, isActive: true },
      vendor: { isActive: true, isVerified: true },
    },
    include: {
      vendor: { include: { village: true } },
      category: true,
      village: true,
      variants: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, price: true, stock: true },
      },
    },
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

  const host = (await headers()).get("host");
  const productUrl = `${host?.includes("localhost") ? "http" : "https"}://${host}/${desa}/produk/${slug}`;
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(`${product.name} — ${rupiah(product.price)}/${product.unit}\n${productUrl}`)}`;

  await db.product.update({
    where: { id: product.id },
    data: { views: { increment: 1 } },
  });

  const related = (await getProductsByVillage(product.villageId, { limit: 5 })).filter(
    (p) => p.id !== product.id,
  );

  const [reviews, ratingAgg] = await Promise.all([
    db.review.findMany({
      where: { productId: product.id, isPublished: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, rating: true, comment: true, buyerName: true, createdAt: true },
    }),
    db.review.aggregate({
      where: { productId: product.id, isPublished: true },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);
  const ratingAvg = ratingAgg._avg.rating;
  const ratingCount = ratingAgg._count._all;
  const relatedRatings = await getRatingMap(related.map((p) => p.id));

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
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
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
          {ratingCount > 0 && (
            <p className="mt-1 text-sm text-amber-600" aria-label={`Rating ${ratingAvg?.toFixed(1)} dari 5`}>
              {"★".repeat(Math.round(ratingAvg ?? 0))}
              <span className="text-stone-300">{"★".repeat(5 - Math.round(ratingAvg ?? 0))}</span>
              <span className="ml-1 text-stone-500">
                {ratingAvg?.toFixed(1)} ({ratingCount} ulasan)
              </span>
            </p>
          )}
          <p className="mt-3 text-3xl font-extrabold text-brand-700">
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="mr-2 align-middle text-lg font-normal text-stone-400 line-through">
                {rupiah(product.compareAtPrice)}
              </span>
            )}
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
              variants={product.variants}
            />
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-green-700"
            >
              ↗ Bagikan via WhatsApp
            </a>
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

      {/* Ulasan pembeli */}
      {reviews.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold">
            Ulasan Pembeli <span className="text-sm font-normal text-stone-500">({ratingCount})</span>
          </h2>
          <div className="mt-5 space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{r.buyerName}</p>
                  <p className="text-amber-500">
                    {"★".repeat(r.rating)}
                    <span className="text-stone-300">{"★".repeat(5 - r.rating)}</span>
                  </p>
                </div>
                <p className="mt-1 text-sm text-stone-600">{r.comment}</p>
                <p className="mt-1 text-xs text-stone-400">
                  {new Date(r.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

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
                compareAtPrice={p.compareAtPrice}
                unit={p.unit}
                image={p.images[0]}
                vendorName={p.vendor.name}
                villageSlug={product.village.slug}
                villageName={product.village.name}
                ratingAvg={relatedRatings.get(p.id)?.avg}
                ratingCount={relatedRatings.get(p.id)?.count}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
