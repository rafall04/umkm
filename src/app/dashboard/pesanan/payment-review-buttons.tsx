"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewPaymentProof } from "@/app/actions/payment";

export function PaymentReviewButtons({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function act(decision: "approve" | "reject") {
    setLoading(true);
    const res = await reviewPaymentProof(orderId, decision);
    setLoading(false);
    if (!res.ok) alert(res.error);
    router.refresh();
  }

  return (
    <div className="mt-2 flex justify-end gap-2">
      <button
        disabled={loading}
        onClick={() => act("approve")}
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        ✓ Konfirmasi Lunas
      </button>
      <button
        disabled={loading}
        onClick={() => {
          if (confirm("Tolak bukti ini? Pembeli harus mengunggah ulang.")) {
            act("reject");
          }
        }}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        ✕ Tolak
      </button>
    </div>
  );
}
