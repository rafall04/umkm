"use client";

import { useState } from "react";
import { updateOrderItemStatus } from "@/app/actions/vendor";
import { useRouter } from "next/navigation";

const NEXT: Record<string, { label: string; status: string }> = {
  MENUNGGU: { label: "Proses", status: "DIPROSES" },
  DIPROSES: { label: "Kirim", status: "DIKIRIM" },
  DIKIRIM: { label: "Selesaikan", status: "SELESAI" },
};

export function ItemStatusButtons({ itemId, current }: { itemId: string; current: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const next = NEXT[current];

  if (!next) return null;

  return (
    <div className="mt-2 flex justify-end gap-2">
      <button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          await updateOrderItemStatus(itemId, next.status);
          setLoading(false);
          router.refresh();
        }}
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {next.label}
      </button>
    </div>
  );
}
