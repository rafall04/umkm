"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerBuyer } from "@/app/actions/auth";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const inputCls =
    "w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await registerBuyer(form);
    if (!res.ok) {
      setError(res.error ?? "Gagal mendaftar");
      setLoading(false);
      return;
    }
    router.push("/login?registered=1");
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold">Daftar Pembeli</h1>
      <p className="mt-1 text-sm text-stone-500">
        Buat akun untuk memantau pesanan lebih mudah.
      </p>

      <div className="mt-6 space-y-3">
        <input required placeholder="Nama lengkap" className={inputCls}
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="tel" placeholder="No. HP / WhatsApp" className={inputCls}
          value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input type="email" placeholder="Email (opsional)" className={inputCls}
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input required type="password" placeholder="Kata sandi (min. 6 karakter)" className={inputCls}
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>

      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Memproses..." : "Daftar"}
      </button>

      <p className="mt-5 text-center text-sm text-stone-500">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-brand-600">Masuk</Link>
      </p>
    </form>
  );
}
