import Link from "next/link";
import Image from "next/image";
import { getFeaturedProducts, getVillages, getCategories } from "@/lib/queries";
import { ProductCard } from "@/components/product-card";
import { InstallPrompt } from "@/components/install-prompt";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [villages, products, categories] = await Promise.all([
    getVillages(),
    getFeaturedProducts(8),
    getCategories(),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-200">
            Kabupaten Bojonegoro, Jawa Timur
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
            Produk Asli Lokal, Langsung dari Pembuatnya
          </h1>
          <p className="mt-4 max-w-xl text-lg text-brand-100">
            Belanja makanan, kerajinan, dan hasil bumi terbaik dari UMKM
            Dander dan Tanjungharjo. Setiap pembelian mendukung ekonomi
            warga.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {villages.map((v) => (
              <Link
                key={v.slug}
                href={`/${v.slug}`}
                className="rounded-xl bg-white px-6 py-3 font-semibold text-brand-800 transition hover:bg-brand-50"
              >
                Jelajahi {v.name} →
              </Link>
            ))}
            <Link
              href="/produk"
              className="rounded-xl border-2 border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Semua Produk
            </Link>
          </div>
        </div>
      </section>

      {/* Kategori */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/produk?kategori=${c.slug}`}
              className="rounded-2xl border border-stone-200 bg-white p-4 text-center transition hover:border-brand-300 hover:shadow-md"
            >
              <span className="text-3xl">{c.icon}</span>
              <p className="mt-2 text-sm font-medium">{c.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Desa cards */}
      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {villages.map((v) => (
            <Link
              key={v.slug}
              href={`/${v.slug}`}
              className="group relative flex min-h-[240px] flex-col justify-end overflow-hidden rounded-3xl bg-stone-800 p-8 text-white"
            >
              {v.heroImage && (
                <Image
                  src={v.heroImage}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/40 to-stone-900/10" />
              <div className="relative">
                <p className="text-sm text-stone-300">
                  Kecamatan {v.kecamatan}, {v.kabupaten}
                </p>
                <h2 className="mt-1 text-3xl font-bold">{v.name}</h2>
                <p className="mt-2 line-clamp-2 max-w-md text-sm text-stone-300">
                  {v.description}
                </p>
                <p className="mt-4 text-sm font-semibold text-brand-300">
                  {v._count.vendors} UMKM · {v._count.products} produk →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Produk unggulan */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Produk Terpopuler</h2>
          <Link href="/produk" className="text-sm font-semibold text-brand-600 hover:underline">
            Lihat semua →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
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
          <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
            Belum ada produk. UMKM dapat{" "}
            <Link href="/daftar-umkm" className="font-semibold text-brand-600">
              mendaftar di sini
            </Link>
            .
          </p>
        )}
      </section>

      {/* CTA UMKM */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="rounded-3xl bg-accent-500/10 p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold">Punya Usaha Rumahan?</h2>
          <p className="mx-auto mt-2 max-w-lg text-stone-600">
            Daftarkan UMKM Anda secara gratis. Tim kami akan memverifikasi
            dan produk Anda langsung bisa dilihat pembeli.
          </p>
          <Link
            href="/daftar-umkm"
            className="mt-6 inline-block rounded-xl bg-accent-500 px-8 py-3 font-bold text-stone-900 transition hover:bg-accent-400"
          >
            Daftarkan UMKM
          </Link>
        </div>
      </section>

      <InstallPrompt />
    </div>
  );
}
