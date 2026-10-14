import Link from "next/link";
import { auth } from "@/auth";
import { CartButton } from "./cart-button";
import { UserMenu } from "./user-menu";
import { HeaderSearch } from "./header-search";

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-brand-700">
          <span className="text-2xl">🛖</span>
          <span className="hidden sm:inline">Pasar UMKM</span>
        </Link>

        {/* Direktori wilayah — nama desa tidak ditonjolkan di header karena
            cakupan sudah se-Kabupaten Bojonegoro. */}
        <div className="min-w-0 flex-1">
          <Link
            href="/wilayah"
            className="inline-block w-max rounded-full bg-stone-100 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-200"
          >
            🗺️ Wilayah
          </Link>
        </div>

        <nav className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="hidden lg:block">
            <HeaderSearch />
          </div>
          <Link
            href="/pesanan"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 sm:block"
          >
            Lacak Pesanan
          </Link>
          <CartButton />
          <UserMenu user={user} />
        </nav>
      </div>
      {/* Baris pencarian untuk layar kecil — header utama terlalu penuh */}
      <div className="border-t border-stone-100 px-4 py-2 lg:hidden">
        <HeaderSearch />
      </div>
    </header>
  );
}
