import type { ProgressStep } from "@/lib/order-rules";

const STEP_ICON: Record<string, string> = {
  buat: "📝",
  bayar: "💳",
  proses: "📦",
  kirim: "🛵",
  selesai: "✅",
};

/** Timeline horizontal langkah order; langkah terakhir yang selesai disorot. */
export function OrderTimeline({ steps }: { steps: ProgressStep[] }) {
  const lastDone = steps.reduce((acc, s, i) => (s.done ? i : acc), 0);

  return (
    <ol className="flex items-start">
      {steps.map((step, i) => (
        <li key={step.key} className="flex flex-1 flex-col items-center">
          <div className="flex w-full items-center">
            {i > 0 && (
              <div
                className={`h-0.5 flex-1 ${step.done ? "bg-brand-500" : "bg-stone-200"}`}
              />
            )}
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${
                step.done
                  ? i === lastDone
                    ? "bg-brand-600 text-white ring-4 ring-brand-100"
                    : "bg-brand-100 text-brand-700"
                  : "bg-stone-100 text-stone-300"
              }`}
            >
              {STEP_ICON[step.key] ?? "•"}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 ${steps[i + 1].done ? "bg-brand-500" : "bg-stone-200"}`}
              />
            )}
          </div>
          <p
            className={`mt-2 text-center text-[11px] leading-tight sm:text-xs ${
              step.done ? "font-semibold text-stone-800" : "text-stone-400"
            }`}
          >
            {step.label}
          </p>
        </li>
      ))}
    </ol>
  );
}
