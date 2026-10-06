"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmManualPayment } from "@/app/actions/admin";

export function ConfirmPaymentButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <button
      disabled={loading}
      onClick={async () => {
        if (!confirm("Konfirmasi pembayaran pesanan ini?")) return;
        setLoading(true);
        const res = await confirmManualPayment(orderId);
        setLoading(false);
        if (!res.ok) alert(res.error ?? "Gagal mengonfirmasi");
        router.refresh();
      }}
      className="mt-2 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
    >
      {loading ? "..." : "Konfirmasi Bayar"}
    </button>
  );
}
