"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProductStock } from "@/app/actions/vendor";

/** Edit stok inline — angka langsung, simpan saat blur/Enter bila berubah. */
export function StockEditor({ productId, stock }: { productId: string; stock: number }) {
  const [value, setValue] = useState(String(stock));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function save() {
    const next = parseInt(value, 10);
    if (Number.isNaN(next) || next === stock) {
      setValue(String(stock));
      setError(null);
      return;
    }
    setSaving(true);
    setError(null);
    const res = await updateProductStock(productId, next);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Gagal menyimpan");
      setValue(String(stock));
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-1" title="Klik untuk ubah stok">
      <input
        type="number"
        name="stock"
        min={0}
        value={value}
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        aria-label="Stok"
        className={`w-16 rounded-lg border px-2 py-0.5 text-center text-sm outline-none focus:ring-2 focus:ring-brand-100 ${
          error ? "border-red-400" : "border-stone-200 focus:border-brand-500"
        }`}
      />
      {saving && <span className="text-xs text-stone-400">…</span>}
    </span>
  );
}
