import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 text-center">
      <p className="text-6xl">🧺</p>
      <h1 className="mt-6 text-2xl font-bold">Halaman Tidak Ditemukan</h1>
      <p className="mt-2 text-stone-500">Alamat yang Anda tuju tidak tersedia.</p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
