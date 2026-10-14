"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markCodPaid } from "@/app/actions/vendor";

export function MarkPaidButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        setLoading(true);
        await markCodPaid(orderId);
        setLoading(false);
        router.refresh();
      }}
      disabled={loading}
      className="mt-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
    >
      {loading ? "..." : "💵 Tandai Sudah Dibayar"}
    </button>
  );
}
