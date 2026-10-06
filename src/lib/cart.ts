"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
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

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
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
          const existing = items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: items.map((i) =>
                i.productId === item.productId
                  ? { ...i, qty: Math.min(i.qty + qty, i.stock) }
                  : i,
              ),
            };
          }
          return { items: [...items, { ...item, qty }] };
        }),
      setQty: (productId, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.productId !== productId)
              : s.items.map((i) =>
                  i.productId === productId
                    ? { ...i, qty: Math.min(qty, i.stock) }
                    : i,
                ),
        })),
      remove: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      clear: () => set({ items: [] }),
      totalItems: () => get().items.reduce((a, i) => a + i.qty, 0),
      subtotal: () => get().items.reduce((a, i) => a + i.qty * i.price, 0),
    }),
    { name: "umkm-cart" },
  ),
);
