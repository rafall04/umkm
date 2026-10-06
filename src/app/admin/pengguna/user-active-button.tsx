"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setUserActive } from "@/app/actions/admin";

export function UserActiveButton({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await setUserActive(userId, !isActive);
        setLoading(false);
        router.refresh();
      }}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
        isActive
          ? "border border-red-300 text-red-600 hover:bg-red-50"
          : "bg-brand-600 text-white hover:bg-brand-700"
      } disabled:opacity-50`}
    >
      {isActive ? "Nonaktifkan" : "Aktifkan"}
    </button>
  );
}
