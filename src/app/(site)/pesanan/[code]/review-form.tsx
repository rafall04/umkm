"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitReview } from "@/app/actions/review";
import { INPUT_CLS } from "@/lib/ui";

type Props = {
  orderCode: string;
  phone: string;
  orderItemId: string;
  productName: string;
};

export function ReviewForm({ orderCode, phone, orderItemId, productName }: Props) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<{ loading: boolean; error?: string; done?: boolean }>({
    loading: false,
  });
  const router = useRouter();

  if (state.done) {
    return <p className="mt-1 text-xs font-semibold text-green-600">✓ Ulasan terkirim</p>;
  }

  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setState({ loading: true });
        const res = await submitReview({ orderCode, phone, orderItemId, rating, comment });
        if (res.ok) {
          setState({ loading: false, done: true });
          router.refresh();
        } else {
          setState({ loading: false, error: res.error });
        }
      }}
    >
      <div className="flex items-center gap-1" role="radiogroup" aria-label={`Rating ${productName}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} bintang`}
            aria-pressed={rating === n}
            className={`text-xl ${n <= rating ? "text-amber-500" : "text-stone-300"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        name="comment"
        required
        minLength={5}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={`Bagaimana ${productName}?`}
        aria-label={`Ulasan untuk ${productName}`}
        rows={2}
        className={INPUT_CLS}
      />
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      <button
        disabled={state.loading}
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        Kirim Ulasan
      </button>
    </form>
  );
}
