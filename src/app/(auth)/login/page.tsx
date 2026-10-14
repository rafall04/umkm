"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { INPUT_CLS } from "@/lib/ui";

function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Email/HP atau kata sandi salah");
      setLoading(false);
      return;
    }
    // Hanya path lokal — callbackUrl absolute (https://…) = open redirect
    const cb = searchParams.get("callbackUrl");
    router.push(cb?.startsWith("/") && !cb.startsWith("//") ? cb : "/");
    router.refresh();
  }

  const inputCls = INPUT_CLS;

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold">Masuk</h1>
      <p className="mt-1 text-sm text-stone-500">Untuk pembeli, pemilik UMKM, dan admin.</p>

      <div className="mt-6 space-y-3">
        <input
          required
          placeholder="Email atau No. HP"
          aria-label="Email atau nomor HP"
          className={inputCls}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <input
          required
          type="password"
          placeholder="Kata sandi"
          aria-label="Kata sandi"
          className={inputCls}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Memproses..." : "Masuk"}
      </button>

      <p className="mt-5 text-center text-sm text-stone-500">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-semibold text-brand-600">
          Daftar pembeli
        </Link>{" "}
        ·{" "}
        <Link href="/daftar-umkm" className="font-semibold text-brand-600">
          Daftar UMKM
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
