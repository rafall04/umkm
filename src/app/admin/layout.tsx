import Link from "next/link";
import { requireRole } from "@/lib/session";
import { UserMenu } from "@/components/user-menu";
import { SideNav } from "@/components/side-nav";
import { db } from "@/lib/db";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN_DESA", "SUPERADMIN");
  const isSuper = user.role === "SUPERADMIN";
  const village = user.villageId
    ? await db.village.findUnique({ where: { id: user.villageId } })
    : null;

  const menu: [string, string][] = [
    ["/admin", "📊 Ringkasan"],
    ["/admin/umkm", "🏪 UMKM"],
    ["/admin/pesanan", "🧾 Pesanan"],
    ["/admin/ulasan", "⭐ Ulasan"],
    ...(isSuper
      ? ([["/admin/pengguna", "👥 Pengguna"], ["/admin/desa", "🗺️ Wilayah"]] as [string, string][])
      : []),
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href="/" className="shrink-0 whitespace-nowrap font-bold text-brand-700">
              🛖 Pasar UMKM
            </Link>
            <span className="shrink-0 text-stone-300">|</span>
            <span className="truncate text-xs font-medium text-stone-600 sm:text-sm">
              Panel Admin{village ? ` — ${village.name}` : " (Semua Wilayah)"}
            </span>
          </div>
          <UserMenu user={user} />
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:gap-6">
        <aside className="md:w-44 md:shrink-0">
          <div className="md:sticky md:top-20">
            <SideNav items={menu} />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
