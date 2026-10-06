import Link from "next/link";
import { signOut } from "@/auth";
import type { Session } from "next-auth";

export function UserMenu({ user }: { user: Session["user"] | undefined }) {
  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Masuk
      </Link>
    );
  }

  const isVendor = ["VENDOR", "ADMIN_DESA", "SUPERADMIN"].includes(user.role);
  const isAdmin = ["ADMIN_DESA", "SUPERADMIN"].includes(user.role);

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 [&::-webkit-details-marker]:hidden">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
          {user.name?.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-28 truncate sm:inline">{user.name}</span>
      </summary>
      <div className="absolute right-0 mt-1 w-48 rounded-xl border border-stone-200 bg-white p-1 shadow-lg">
        {isVendor && (
          <Link href="/dashboard" className="block rounded-lg px-3 py-2 text-sm hover:bg-stone-100">
            Dashboard Toko
          </Link>
        )}
        {isAdmin && (
          <Link href="/admin" className="block rounded-lg px-3 py-2 text-sm hover:bg-stone-100">
            Panel Admin
          </Link>
        )}
        <Link href="/pesanan" className="block rounded-lg px-3 py-2 text-sm hover:bg-stone-100">
          Pesanan Saya
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
            Keluar
          </button>
        </form>
      </div>
    </details>
  );
}
