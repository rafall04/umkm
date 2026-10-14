"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type VillageLite = { slug: string; name: string };

export function VillageSwitcher({ villages }: { villages: VillageLite[] }) {
  const pathname = usePathname();

  return (
    <div className="flex w-max items-center gap-1 rounded-full bg-stone-100 p-1 text-sm">
      {villages.map((v) => {
        const active = pathname === `/${v.slug}` || pathname.startsWith(`/${v.slug}/`);
        return (
          <Link
            key={v.slug}
            href={`/${v.slug}`}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 font-medium transition ${
              active
                ? "bg-white text-brand-700 shadow-sm"
                : "text-stone-600 hover:bg-white hover:text-brand-700 hover:shadow-sm"
            }`}
          >
            {v.name}
          </Link>
        );
      })}
    </div>
  );
}
