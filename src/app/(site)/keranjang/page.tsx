"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart, cartKey } from "@/lib/cart";
import { rupiah } from "@/lib/format";
import { useMounted } from "@/lib/use-mounted";

export default function CartPage() {
  const { items, setQty, remove, subtotal } = useCart();
  const mounted = useMounted();

  if (!mounted) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-stone-400">Memuat keranjang...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-5xl">🧺</p>
        <h1 className="mt-4 text-2xl font-bold">Keranjang Kosong</h1>
        <p className="mt-2 text-stone-500">Yuk, dukung UMKM lokal dengan belanja produk buatan penjual sekitar.</p>
        <Link
          href="/produk"
          className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
        >
          Lihat Produk
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Keranjang Belanja</h1>

      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div
            key={cartKey(item)}
            className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 sm:gap-4"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:h-20 sm:w-20">
              {item.image ? (
                <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl">🧺</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/${item.villageSlug}/produk/${item.slug}`}
                className="line-clamp-2 text-sm font-medium leading-snug hover:text-brand-600 sm:text-base"
              >
                {item.name}
              </Link>
              {item.variantName && (
                <p className="mt-0.5 truncate text-xs font-medium text-stone-600">
                  Varian: {item.variantName}
                </p>
              )}
              <p className="mt-0.5 truncate text-xs text-stone-500">{item.vendorName}</p>
              <p className="mt-1 text-sm font-bold text-brand-700">{rupiah(item.price)}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center rounded-xl border border-stone-300">
                <button
                  onClick={() => setQty(cartKey(item), item.qty - 1)}
                  className="px-3 py-2 font-bold text-stone-500"
                  aria-label="Kurangi"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                <button
                  onClick={() => setQty(cartKey(item), item.qty + 1)}
                  className="px-3 py-2 font-bold text-stone-500"
                  aria-label="Tambah"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => remove(cartKey(item))}
                className="p-2 text-stone-400 hover:text-red-600"
                aria-label="Hapus"
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex justify-between text-lg font-bold">
          <span>Subtotal</span>
          <span>{rupiah(subtotal())}</span>
        </div>
        <p className="mt-1 text-xs text-stone-500">
          Ongkir dihitung saat checkout berdasarkan metode pengiriman.
        </p>
        <Link
          href="/checkout"
          className="mt-4 block rounded-xl bg-brand-600 py-3.5 text-center font-bold text-white hover:bg-brand-700"
        >
          Lanjut ke Checkout →
        </Link>
      </div>
    </div>
  );
}
