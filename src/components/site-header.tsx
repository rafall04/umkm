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
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-700">
          <span className="text-2xl">🛖</span>
          <span className="hidden sm:inline">Pasar UMKM</span>
        </Link>

        <VillageSwitcher villages={villages} />

        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
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
