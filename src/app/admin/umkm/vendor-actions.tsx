"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setVendorVerified, setVendorActive } from "@/app/actions/admin";

export function VendorActions({
  vendorId,
  isVerified,
  isActive,
}: {
  vendorId: string;
  isVerified: boolean;
  isActive: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function run(fn: () => Promise<unknown>) {
    setLoading(true);
    await fn();
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {!isVerified && (
        <button
          disabled={loading}
          onClick={() => run(() => setVendorVerified(vendorId, true))}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Verifikasi
        </button>
      )}
      <button
        disabled={loading}
        onClick={() => run(() => setVendorActive(vendorId, !isActive))}
        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
          isActive
            ? "border-red-300 text-red-600 hover:bg-red-50"
            : "border-stone-300 text-stone-600 hover:bg-stone-50"
        }`}
      >
        {isActive ? "Nonaktifkan" : "Aktifkan"}
      </button>
    </div>
  );
}
