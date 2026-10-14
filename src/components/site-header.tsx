import Link from "next/link";
import { auth } from "@/auth";
import { getVillages } from "@/lib/queries";
import { CartButton } from "./cart-button";
import { VillageSwitcher } from "./village-switcher";
import { UserMenu } from "./user-menu";

export async function SiteHeader() {
  const [session, villages] = await Promise.all([auth(), getVillages()]);
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-brand-700">
          <span className="text-2xl">🛖</span>
          <span className="hidden sm:inline">Pasar UMKM</span>
        </Link>

        {/* min-w-0 + scroll horizontal: pill wilayah tidak boleh mendorong
            nav keluar viewport di layar sempit. Lebih dari 4 wilayah aktif →
            ganti pill dengan tautan direktori (pill tidak skala). */}
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {villages.length > 4 ? (
            <Link
              href="/wilayah"
              className="inline-block w-max rounded-full bg-stone-100 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-200"
            >
              🗺️ {villages.length} Wilayah
            </Link>
          ) : (
            <VillageSwitcher villages={villages} />
          )}
        </div>

        <nav className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
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
    </header>
  );
}
