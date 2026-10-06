"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import { waLink } from "@/lib/format";

type AddToCartProps = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  unit: string;
  stock: number;
  vendorId: string;
  vendorName: string;
  villageSlug: string;
  whatsapp?: string | null;
};

export function AddToCart(props: AddToCartProps) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const add = useCart((s) => s.add);
  const clear = useCart((s) => s.clear);

  if (props.stock <= 0) {
    return (
      <p className="rounded-xl bg-stone-100 px-4 py-3 text-center font-medium text-stone-500">
        Stok habis
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border border-stone-300">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-4 py-2.5 text-lg font-bold text-stone-500"
            aria-label="Kurangi"
          >
            −
          </button>
          <span className="w-10 text-center font-semibold">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(props.stock, q + 1))}
            className="px-4 py-2.5 text-lg font-bold text-stone-500"
            aria-label="Tambah"
          >
            +
          </button>
        </div>
        <p className="text-sm text-stone-500">Stok: {props.stock}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            // Konfirmasi saat pindah toko — isi keranjang akan diganti
            const current = useCart.getState().items[0];
            if (current && current.vendorId !== props.vendorId) {
              const ok = confirm(
                `Keranjang berisi produk dari "${current.vendorName}". Pembayaran dilakukan per toko — ganti isi keranjang dengan produk ini?`,
              );
              if (!ok) return;
              clear();
            }
            add(
              {
                productId: props.productId,
                slug: props.slug,
                name: props.name,
                price: props.price,
                image: props.image,
                unit: props.unit,
                stock: props.stock,
                vendorId: props.vendorId,
                vendorName: props.vendorName,
                villageSlug: props.villageSlug,
              },
              qty,
            );
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
          }}
          className="flex-1 rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700"
        >
          {added ? "✓ Ditambahkan" : "+ Keranjang"}
        </button>
        {props.whatsapp && (
          <a
            href={waLink(
              props.whatsapp,
              `Halo ${props.vendorName}, saya mau pesan ${props.name} (${qty} ${props.unit})`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center justify-center rounded-xl border-2 border-green-600 px-5 py-3 font-semibold text-green-700 transition hover:bg-green-50"
            title="Pesan via WhatsApp"
          >
            Chat WA
          </a>
        )}
      </div>
    </div>
  );
}
