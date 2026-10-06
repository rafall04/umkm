"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TrackForm() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const router = useRouter();

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center">
      <p className="text-4xl">📦</p>
      <h2 className="mt-4 text-2xl font-bold">Lacak Pesanan</h2>
      <p className="mt-2 text-sm text-stone-500">
        Masukkan kode pesanan dan nomor HP yang dipakai saat checkout.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push(
            `/pesanan/${encodeURIComponent(code.trim().toUpperCase())}?hp=${encodeURIComponent(phone.trim())}`,
          );
        }}
        className="mt-6 space-y-3 text-left"
      >
        <input
          required
          id="track-code"
          name="code"
          autoComplete="off"
          placeholder="Kode pesanan (ORD-...)"
          aria-label="Kode pesanan"
          className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm uppercase outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <input
          required
          id="track-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="No. HP pembeli"
          aria-label="Nomor HP pembeli"
          className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700">
          Lacak
        </button>
      </form>
    </div>
  );
}
