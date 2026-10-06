import Link from "next/link";
import Image from "next/image";
import { rupiah } from "@/lib/format";

type ProductCardProps = {
  slug: string;
  name: string;
  price: number;
  unit: string;
  image?: string;
  vendorName: string;
  villageSlug: string;
  villageName: string;
  showVillage?: boolean;
};

export function ProductCard({
  slug,
  name,
  price,
  unit,
  image,
  vendorName,
  villageSlug,
  villageName,
  showVillage = false,
}: ProductCardProps) {
  return (
    <Link
      href={`/${villageSlug}/produk/${slug}`}
      className="group overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-square bg-stone-100">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-stone-300">
            🧺
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{name}</p>
        <p className="mt-1 font-bold text-brand-700">
          {rupiah(price)}
          <span className="text-xs font-normal text-stone-500"> /{unit}</span>
        </p>
        <p className="mt-1 truncate text-xs text-stone-500">
          {vendorName}
          {showVillage && ` · ${villageName}`}
        </p>
      </div>
    </Link>
  );
}
