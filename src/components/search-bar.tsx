"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar({ basePath, placeholder }: { basePath: string; placeholder?: string }) {
  const [q, setQ] = useState("");
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `${basePath}?q=${encodeURIComponent(q.trim())}` : basePath);
      }}
      className="flex w-full max-w-lg gap-2"
    >
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder ?? "Cari produk..."}
        aria-label={placeholder ?? "Cari produk"}
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      <button
        type="submit"
        className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Cari
      </button>
    </form>
  );
}
