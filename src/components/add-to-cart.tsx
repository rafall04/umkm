"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import { waLink } from "@/lib/format";

type VariantLite = {
  id: string;
  name: string;
  price: number | null; // null = ikut harga produk
  stock: number;
};

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
  variants?: VariantLite[];
};

export function AddToCart(props: AddToCartProps) {
  const variants = props.variants ?? [];
  const [variantId, setVariantId] = useState<string | null>(
    variants.length > 0 ? variants[0].id : null,
  );
  const variant = variants.find((v) => v.id === variantId) ?? null;
  // Saat produk punya varian, stok & harga mengikuti varian terpilih
  const price = variant?.price ?? props.price;
  const stock = variant ? variant.stock : props.stock;

  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const add = useCart((s) => s.add);
  const clear = useCart((s) => s.clear);

  if (stock <= 0) {
    return (
      <div className="space-y-3">
        {variants.length > 1 && (
          <VariantPicker variants={variants} selected={variantId} onSelect={setVariantId} basePrice={props.price} />
        )}
        <p className="rounded-xl bg-stone-100 px-4 py-3 text-center font-medium text-stone-500">
          Stok habis
        </p>
      </div>
    );
  }

  const itemName = variant ? `${props.name} (${variant.name})` : props.name;

  return (
    <div className="space-y-3">
      {variants.length > 0 && (
        <VariantPicker variants={variants} selected={variantId} onSelect={setVariantId} basePrice={props.price} />
      )}

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
            onClick={() => setQty((q) => Math.min(stock, q + 1))}
            className="px-4 py-2.5 text-lg font-bold text-stone-500"
            aria-label="Tambah"
          >
            +
          </button>
        </div>
        <p className="text-sm text-stone-500">Stok: {stock}</p>
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
                variantId: variant?.id,
                variantName: variant?.name,
                slug: props.slug,
                name: props.name,
                price,
                image: props.image,
                unit: props.unit,
                stock,
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
              `Halo ${props.vendorName}, saya mau pesan ${itemName} (${qty} ${props.unit})`,
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

function VariantPicker({
  variants,
  selected,
  onSelect,
  basePrice,
}: {
  variants: VariantLite[];
  selected: string | null;
  onSelect: (id: string) => void;
  basePrice: number;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">Pilih varian:</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const active = v.id === selected;
          const price = v.price ?? basePrice;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v.id)}
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                active
                  ? "border-brand-600 bg-brand-50 font-semibold text-brand-700"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
              }`}
            >
              {v.name} · Rp {price.toLocaleString("id-ID")}
              {v.stock <= 0 && <span className="ml-1 text-red-500">(habis)</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
