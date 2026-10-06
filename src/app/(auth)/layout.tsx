import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2 text-xl font-bold text-brand-700">
        <span className="text-2xl">🛖</span> Pasar UMKM
      </Link>
      {children}
    </div>
  );
}
