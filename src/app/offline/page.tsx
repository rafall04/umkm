import Link from "next/link";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 text-center">
      <p className="text-6xl">📡</p>
      <h1 className="mt-6 text-2xl font-bold">Anda Sedang Offline</h1>
      <p className="mt-2 max-w-sm text-stone-500">
        Koneksi internet terputus. Periksa jaringan Anda lalu coba lagi —
        halaman yang pernah dibuka tetap bisa dilihat.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white"
      >
        Ke Beranda
      </Link>
    </div>
  );
}
