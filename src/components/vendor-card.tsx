import Link from "next/link";
import Image from "next/image";

type VendorCardProps = {
  slug: string;
  name: string;
  description: string;
  logo?: string | null;
  villageSlug: string;
  productCount: number;
};

export function VendorCard({
  slug,
  name,
  description,
  logo,
  villageSlug,
  productCount,
}: VendorCardProps) {
  return (
    <Link
      href={`/${villageSlug}/umkm/${slug}`}
      className="group flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100">
        {logo ? (
          <Image src={logo} alt={name} fill sizes="64px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl">🏪</div>
        )}
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-semibold">
          {name}
          <span className="text-brand-600" title="Terverifikasi">✓</span>
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm text-stone-500">{description}</p>
        <p className="mt-1 text-xs font-medium text-brand-600">
          {productCount} produk
        </p>
      </div>
    </Link>
  );
}
