"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createVillageAdmin } from "@/app/actions/admin";
import { INPUT_CLS } from "@/lib/ui";

type VillageLite = { id: string; name: string; kecamatan: string; isActive: boolean };

export function AdminCreateForm({ villages }: { villages: VillageLite[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", villageId: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const kecamatanList = [...new Set(villages.map((v) => v.kecamatan))].sort();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await createVillageAdmin({
      ...form,
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Gagal membuat akun");
      return;
    }
    setForm({ name: "", email: "", phone: "", password: "", villageId: "" });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        + Buat Admin Wilayah
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-stone-200 bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Admin Wilayah Baru</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-stone-400 hover:text-stone-600"
        >
          Tutup ✕
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          required
          className={INPUT_CLS}
          placeholder="Nama lengkap"
          aria-label="Nama lengkap admin"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          type="email"
          className={INPUT_CLS}
          placeholder="Email (opsional)"
          aria-label="Email admin"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          required
          type="tel"
          className={INPUT_CLS}
          placeholder="No. HP / WhatsApp (08xx)"
          aria-label="Nomor HP admin"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          required
          type="text"
          minLength={8}
          className={INPUT_CLS}
          placeholder="Kata sandi (min. 8 karakter)"
          aria-label="Kata sandi admin"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <select
          required
          className={`${INPUT_CLS} sm:col-span-2`}
          aria-label="Wilayah admin"
          value={form.villageId}
          onChange={(e) => setForm({ ...form, villageId: e.target.value })}
        >
          <option value="">— Pilih wilayah yang dikelola —</option>
          {kecamatanList.map((kec) => (
            <optgroup key={kec} label={`Kec. ${kec}`}>
              {villages
                .filter((v) => v.kecamatan === kec)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.isActive ? "" : " (belum aktif)"}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>
      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button
        disabled={loading}
        className="mt-4 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Menyimpan..." : "Buat Akun Admin"}
      </button>
    </form>
  );
}
