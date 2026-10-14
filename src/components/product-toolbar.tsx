"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  basePath: string;
  villages: { slug: string; name: string }[];
};

const SORTS = [
  ["", "Terbaru"],
  ["murah", "Harga termurah"],
  ["mahal", "Harga tertinggi"],
  ["populer", "Paling dilihat"],
] as const;

/** Toolbar filter wilayah + urutan; membaca & menulis search params. */
export function ProductToolbar({ basePath, villages }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  function go(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${basePath}?${next.toString()}`);
  }

  const selectCls =
    "rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500";

  return (
    <div className="flex flex-wrap gap-2">
      <select
        aria-label="Filter wilayah"
        className={selectCls}
        value={sp.get("desa") ?? ""}
        onChange={(e) => go("desa", e.target.value)}
      >
        <option value="">Semua Wilayah</option>
        {villages.map((v) => (
          <option key={v.slug} value={v.slug}>
            {v.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Urutkan"
        className={selectCls}
        value={sp.get("urut") ?? ""}
        onChange={(e) => go("urut", e.target.value)}
      >
        {SORTS.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
