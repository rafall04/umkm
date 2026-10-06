"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SideNavProps = {
  items: readonly (readonly [string, string])[];
};

export function SideNav({ items }: SideNavProps) {
  const pathname = usePathname();
  const activeHref = items
    .map(([href]) => href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 text-sm md:flex-col md:gap-0 md:space-y-1">
      {items.map(([href, label]) => {
        const active = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`block whitespace-nowrap rounded-lg px-3 py-2 font-medium transition ${
              active
                ? "bg-brand-50 text-brand-700"
                : "text-stone-600 hover:bg-white hover:text-brand-700"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
