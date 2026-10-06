"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateStore } from "@/app/actions/vendor";

type Store = {
  name: string;
  description: string;
  whatsapp: string | null;
  phone: string | null;
  address: string;
  logo: string | null;
  qrisImage: string | null;
  isVerified: boolean;
  village: { name: string };
};

export function StoreForm({ vendor }: { vendor: Store }) {
  const [form, setForm] = useState({
    name: vendor.name,
    description: vendor.description,
    whatsapp: vendor.whatsapp ?? "",
    phone: vendor.phone ?? "",
    address: vendor.address,
    logo: vendor.logo ?? "",
    qrisImage: vendor.qrisImage ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const inputCls =
    "w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  async function uploadQris(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    setUploading(false);
    if (json.url) setForm((f) => ({ ...f, qrisImage: json.url }));
    else setError(json.error ?? "Upload QRIS gagal");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await updateStore(form);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Gagal menyimpan");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="mb-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
          📍 {vendor.village.name} ·{" "}
          {vendor.isVerified ? "✓ Terverifikasi" : "⏳ Menunggu verifikasi"}
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nama Toko</label>
            <input required className={inputCls} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Deskripsi</label>
            <textarea required rows={4} className={inputCls} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">WhatsApp</label>
              <input required className={inputCls} value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Telepon (opsional)</label>
              <input className={inputCls} value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Alamat</label>
            <textarea required rows={2} className={inputCls} value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">URL Logo (opsional)</label>
            <input className={inputCls} value={form.logo} placeholder="https://..."
              onChange={(e) => setForm({ ...form, logo: e.target.value })} />
          </div>
        </div>
      </div>

      {/* QRIS toko */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">QRIS Toko</h2>
        <p className="mt-1 text-sm text-stone-500">
          Unggah gambar QRIS statis milik toko. Pembeli akan memindai kode ini saat
          memilih pembayaran QRIS/transfer — dana masuk langsung ke rekening Anda.
        </p>
        <div className="mt-4 flex items-start gap-4">
          {form.qrisImage ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.qrisImage}
                alt="QRIS toko"
                className="h-36 w-36 rounded-xl border border-stone-200 bg-white object-contain p-1"
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, qrisImage: "" })}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white"
                aria-label="Hapus QRIS"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="flex h-36 w-36 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 text-xs text-stone-400 hover:border-brand-400">
              {uploading ? "Mengunggah..." : "+ Upload QRIS"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadQris(e.target.files[0])}
              />
            </label>
          )}
          <div className="flex-1">
            <input
              className={`${inputCls} text-xs`}
              value={form.qrisImage}
              placeholder="atau tempel URL gambar QRIS..."
              onChange={(e) => setForm({ ...form, qrisImage: e.target.value })}
            />
            <p className="mt-1.5 text-xs text-stone-400">
              Format JPG/PNG/WebP, maks. 3MB.
            </p>
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {saved && (
        <p className="rounded-xl bg-green-50 p-3 text-sm font-medium text-green-700">
          ✓ Tersimpan
        </p>
      )}

      <button
        disabled={loading}
        className="rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Menyimpan..." : "Simpan Perubahan"}
      </button>
    </form>
  );
}
