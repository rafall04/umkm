"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerVendor } from "@/app/actions/auth";
import { INPUT_CLS } from "@/lib/ui";

export function VendorRegisterForm({
  villages,
}: {
  villages: { id: string; name: string; kecamatan: string; isActive: boolean }[];
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    villageId: "",
    storeName: "",
    storeDescription: "",
    whatsapp: "",
    address: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const inputCls = INPUT_CLS;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await registerVendor(form);
    if (!res.ok) {
      setError(res.error ?? "Gagal mendaftar");
      setLoading(false);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <p className="text-5xl">🎉</p>
        <h1 className="mt-4 text-2xl font-bold">Pendaftaran Terkirim</h1>
        <p className="mt-2 text-sm text-stone-500">
          Toko <strong>{form.storeName}</strong> sedang menunggu verifikasi
          tim kami. Setelah disetujui, produk Anda akan tampil di katalog.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="mt-6 w-full rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700"
        >
          Masuk ke Dashboard
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-8 shadow-sm"
    >
      <h1 className="text-2xl font-bold">Daftarkan UMKM Anda</h1>
      <p className="mt-1 text-sm text-stone-500">
        Gratis. Tim kami akan memverifikasi usaha Anda.
      </p>

      <h2 className="mt-6 font-semibold">Data Pemilik</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input required placeholder="Nama pemilik" aria-label="Nama pemilik" className={inputCls}
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="tel" placeholder="No. HP" aria-label="Nomor HP" className={inputCls}
          value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input type="email" placeholder="Email (opsional)" aria-label="Email (opsional)" className={inputCls}
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input required type="password" placeholder="Kata sandi (min. 6)" aria-label="Kata sandi" className={inputCls}
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>

      <h2 className="mt-6 font-semibold">Data Usaha</h2>
      <div className="mt-3 space-y-3">
        <select
          required
          aria-label="Lokasi usaha"
          className={inputCls}
          value={form.villageId}
          onChange={(e) => setForm({ ...form, villageId: e.target.value })}
        >
          <option value="">— Pilih lokasi usaha —</option>
          <optgroup label="Wilayah sudah dibuka">
            {villages.filter((v) => v.isActive).map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} (Kec. {v.kecamatan})
              </option>
            ))}
          </optgroup>
          <optgroup label="Wilayah lain di Bojonegoro — dibuka setelah verifikasi admin">
            {villages.filter((v) => !v.isActive).map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} (Kec. {v.kecamatan})
              </option>
            ))}
          </optgroup>
        </select>
        <input required placeholder="Nama usaha / toko" aria-label="Nama usaha atau toko" className={inputCls}
          value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
        <textarea required rows={3} placeholder="Deskripsi usaha (produk apa yang dijual, sejak kapan, keunggulan)"
          aria-label="Deskripsi usaha" className={inputCls}
          value={form.storeDescription} onChange={(e) => setForm({ ...form, storeDescription: e.target.value })} />
        <input required type="tel" placeholder="No. WhatsApp usaha (08xx)" aria-label="Nomor WhatsApp usaha" className={inputCls}
          value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
        <textarea required rows={2} placeholder="Alamat lengkap usaha" aria-label="Alamat lengkap usaha" className={inputCls}
          value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>

      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Memproses..." : "Kirim Pendaftaran"}
      </button>

      <p className="mt-5 text-center text-sm text-stone-500">
        Sudah terdaftar?{" "}
        <Link href="/login" className="font-semibold text-brand-600">Masuk</Link>
      </p>
    </form>
  );
}
