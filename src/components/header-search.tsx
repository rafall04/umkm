"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Pencarian global di header — selalu mengarah ke /produk?q=... */
export function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        router.push(term ? `/produk?q=${encodeURIComponent(term)}` : "/produk");
      }}
      className="relative w-full lg:w-64"
    >
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari produk..."
        aria-label="Cari produk"
        className="w-full rounded-full border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
      />
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
        🔍
      </span>
    </form>
  );
}
