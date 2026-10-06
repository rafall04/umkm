"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { useMounted } from "@/lib/use-mounted";

export function CartButton() {
  const totalItems = useCart((s) => s.items.reduce((a, i) => a + i.qty, 0));
  const mounted = useMounted();

  return (
    <Link
      href="/keranjang"
      className="relative rounded-lg p-2 text-stone-600 hover:bg-stone-100"
      aria-label="Keranjang belanja"
    >
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
        />
      </svg>
      {mounted && totalItems > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-xs font-bold text-white">
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      )}
    </Link>
  );
}
