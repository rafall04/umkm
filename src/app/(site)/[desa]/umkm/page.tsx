import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getVillageBySlug, getVendorsByVillage } from "@/lib/queries";
import { VendorCard } from "@/components/vendor-card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ desa: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params;
  const village = await getVillageBySlug(desa);
  if (!village) return {};
  return {
    title: `Direktori UMKM ${village.name}, ${village.kabupaten}`,
    description: `Daftar lengkap pelaku UMKM terverifikasi di ${village.name}, Kecamatan ${village.kecamatan}, Kabupaten ${village.kabupaten}.`,
  };
}

export default async function UmkmDirectoryPage({ params }: Props) {
  const { desa } = await params;
  const village = await getVillageBySlug(desa);
  if (!village) notFound();

  const vendors = await getVendorsByVillage(village.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="text-sm text-stone-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-600">Beranda</Link>
        <span className="mx-2">/</span>
        <Link href={`/${village.slug}`} className="hover:text-brand-600">{village.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-stone-800">UMKM</span>
      </nav>

      <h1 className="mt-3 text-3xl font-bold">Direktori UMKM {village.name}</h1>
      <p className="mt-2 text-stone-600">
        {vendors.length} pelaku usaha terverifikasi tim kami.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vendors.map((v) => (
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
        <p className="mt-8 rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
          Belum ada UMKM terdaftar.
        </p>
      )}
    </div>
  );
}
