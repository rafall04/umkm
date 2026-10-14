import Link from "next/link";
import type { Metadata } from "next";
import { getVillages } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Semua Wilayah",
  description:
    "Daftar wilayah pasar UMKM Kabupaten Bojonegoro — pilih wilayah Anda untuk melihat produk dan pelaku usaha setempat.",
};

export default async function VillagesDirectoryPage() {
  const villages = await getVillages();

  const byKecamatan = new Map<string, typeof villages>();
  for (const v of villages) {
    const list = byKecamatan.get(v.kecamatan) ?? [];
    list.push(v);
    byKecamatan.set(v.kecamatan, list);
  }
  const groups = [...byKecamatan.entries()].sort(([a], [b]) =>
    a.localeCompare(b, "id"),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-2xl font-bold sm:text-3xl">Jelajahi Wilayah</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-500">
        Pilih wilayah untuk melihat produk dan pelaku usaha setempat.
        Wilayah dibuka bertahap — pendaftaran UMKM pertama di sebuah wilayah
        membuka halamannya.
      </p>

      {villages.length === 0 && (
        <p className="mt-8 rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
          Belum ada wilayah yang dibuka.
        </p>
      )}

      <div className="mt-8 space-y-10">
        {groups.map(([kecamatan, list]) => (
          <section key={kecamatan}>
            <h2 className="text-lg font-bold text-stone-700">
              Kecamatan {kecamatan}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((v) => (
                <Link
                  key={v.slug}
                  href={`/${v.slug}`}
                  className="group rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm"
                >
                  <p className="font-semibold group-hover:text-brand-700">
                    {v.name}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    {v._count.vendors} UMKM · {v._count.products} produk
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-3xl bg-brand-50 p-8 text-center">
        <h2 className="text-xl font-bold">Wilayah Anda belum ada?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
          Daftarkan usaha Anda — pendaftaran pertama dari sebuah wilayah membuka
          halaman pasar untuk seluruh warga wilayah itu.
        </p>
        <Link
          href="/daftar-umkm"
          className="mt-5 inline-block rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700"
        >
          Daftarkan UMKM
        </Link>
      </div>
    </div>
  );
}
