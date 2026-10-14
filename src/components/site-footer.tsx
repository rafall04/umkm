import Link from "next/link";
import { getVillages } from "@/lib/queries";

export async function SiteFooter() {
  const villages = await getVillages();

  return (
    <footer className="mt-16 border-t border-stone-200 bg-stone-900 text-stone-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="flex items-center gap-2 text-lg font-bold text-white">
            <span>🛖</span> Pasar UMKM
          </p>
          <p className="mt-3 text-sm leading-relaxed text-stone-400">
            Pasar produk UMKM Kabupaten Bojonegoro — dari penjual lokal ke
            rumah Anda.
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">Wilayah</p>
          <ul className="mt-3 space-y-2 text-sm">
            {villages.slice(0, 6).map((v) => (
              <li key={v.slug}>
                <Link href={`/${v.slug}`} className="hover:text-white">
                  {v.name}
                </Link>
              </li>
            ))}
            {villages.length > 6 && (
              <li>
                <Link href="/wilayah" className="font-medium hover:text-white">
                  Semua {villages.length} wilayah →
                </Link>
              </li>
            )}
            <li>
              <Link href="/produk" className="hover:text-white">
                Semua Produk
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Belanja</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/keranjang" className="hover:text-white">
                Keranjang Belanja
              </Link>
            </li>
            <li>
              <Link href="/pesanan" className="hover:text-white">
                Lacak Pesanan
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Pelaku Usaha</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/daftar-umkm" className="hover:text-white">
                Daftarkan UMKM Anda
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">
                Masuk Dashboard
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-800 py-4 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} Pasar UMKM Bojonegoro,
        Kabupaten Bojonegoro
      </div>
    </footer>
  );
}
