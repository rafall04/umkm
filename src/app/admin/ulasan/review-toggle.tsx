"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setReviewPublished } from "@/app/actions/admin";

export function ReviewToggle({
  reviewId,
  isPublished,
}: {
  reviewId: string;
  isPublished: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await setReviewPublished(reviewId, !isPublished);
        setLoading(false);
        router.refresh();
      }}
      className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
        isPublished
          ? "border-red-300 text-red-600 hover:bg-red-50"
          : "border-stone-300 text-stone-600 hover:bg-stone-50"
      }`}
    >
      {isPublished ? "Sembunyikan" : "Tampilkan"}
    </button>
  );
}
