"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  variantId?: string; // undefined = produk tanpa varian
  variantName?: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  unit: string;
  qty: number;
  stock: number;
  vendorId: string;
  vendorName: string;
  villageSlug: string;
};

/** Kunci unik item keranjang — produk+varian, supaya varian beda tidak tergabung. */
export function cartKey(item: Pick<CartItem, "productId" | "variantId">) {
  return `${item.productId}:${item.variantId ?? ""}`;
}

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  totalItems: () => number;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) =>
        set((s) => {
          // Keranjang maksimal 1 toko — pembayaran langsung ke masing-masing
          // penjual, jadi item toko lain menggantikan seluruh isi keranjang.
          const items =
            s.items.length > 0 && s.items[0].vendorId !== item.vendorId
              ? []
              : s.items;
          const key = cartKey(item);
          const existing = items.find((i) => cartKey(i) === key);
          if (existing) {
            return {
              items: items.map((i) =>
                cartKey(i) === key
                  ? { ...i, qty: Math.min(i.qty + qty, i.stock) }
                  : i,
              ),
            };
          }
          return { items: [...items, { ...item, qty }] };
        }),
      setQty: (key, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => cartKey(i) !== key)
              : s.items.map((i) =>
                  cartKey(i) === key
                    ? { ...i, qty: Math.min(qty, i.stock) }
                    : i,
                ),
        })),
      remove: (key) =>
        set((s) => ({ items: s.items.filter((i) => cartKey(i) !== key) })),
      clear: () => set({ items: [] }),
      totalItems: () => get().items.reduce((a, i) => a + i.qty, 0),
      subtotal: () => get().items.reduce((a, i) => a + i.qty * i.price, 0),
    }),
    { name: "umkm-cart" },
  ),
);
