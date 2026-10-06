"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveVillage } from "@/app/actions/admin";
import { slugify } from "@/lib/format";
import { INPUT_CLS } from "@/lib/ui";

export function VillageForm() {
  const [form, setForm] = useState({
    slug: "",
    name: "",
    kecamatan: "",
    kabupaten: "Bojonegoro",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const inputCls = INPUT_CLS;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await saveVillage(form);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Gagal menyimpan");
      return;
    }
    setForm({ slug: "", name: "", kecamatan: "", kabupaten: "Bojonegoro", description: "" });
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-lg space-y-3 rounded-2xl border border-stone-200 bg-white p-5"
    >
      <input required placeholder="Nama wilayah (cth: Sumberagung)" aria-label="Nama wilayah" className={inputCls}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value.replace(/desa\s*/i, "")) })} />
      <input required placeholder="Slug URL (cth: sumberagung)" aria-label="Slug URL" className={inputCls}
        value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <input required placeholder="Kecamatan" aria-label="Kecamatan" className={inputCls}
          value={form.kecamatan} onChange={(e) => setForm({ ...form, kecamatan: e.target.value })} />
        <input required placeholder="Kabupaten" aria-label="Kabupaten" className={inputCls}
          value={form.kabupaten} onChange={(e) => setForm({ ...form, kabupaten: e.target.value })} />
      </div>
      <textarea required rows={3} placeholder="Deskripsi wilayah untuk SEO" aria-label="Deskripsi wilayah" className={inputCls}
        value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button
        disabled={loading}
        className="rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Menyimpan..." : "Tambah Wilayah"}
      </button>
    </form>
  );
}
