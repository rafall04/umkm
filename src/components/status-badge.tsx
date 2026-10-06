// Kelas harus literal agar terbaca scanner Tailwind — satu sumber per status,
// tambahkan status baru di sini (bukan di dua map terpisah).
const STATUS_COLORS: Record<string, { solid: string; outline: string }> = {
  PENDING: { solid: "bg-amber-100 text-amber-800", outline: "border-amber-300 text-amber-700" },
  PAID: { solid: "bg-blue-100 text-blue-800", outline: "border-blue-300 text-blue-700" },
  PROCESSING: { solid: "bg-indigo-100 text-indigo-800", outline: "border-indigo-300 text-indigo-700" },
  DELIVERED: { solid: "bg-violet-100 text-violet-800", outline: "border-violet-300 text-violet-700" },
  COMPLETED: { solid: "bg-green-100 text-green-800", outline: "border-green-300 text-green-700" },
  CANCELLED: { solid: "bg-red-100 text-red-800", outline: "border-red-300 text-red-700" },
  EXPIRED: { solid: "bg-stone-200 text-stone-600", outline: "border-stone-300 text-stone-500" },
  UNPAID: { solid: "bg-amber-100 text-amber-800", outline: "border-amber-300 text-amber-700" },
  FAILED: { solid: "bg-red-100 text-red-800", outline: "border-red-300 text-red-700" },
  REFUNDED: { solid: "bg-stone-200 text-stone-600", outline: "border-stone-300 text-stone-500" },
  MENUNGGU: { solid: "bg-amber-100 text-amber-800", outline: "border-amber-300 text-amber-700" },
  DIPROSES: { solid: "bg-indigo-100 text-indigo-800", outline: "border-indigo-300 text-indigo-700" },
  DIKIRIM: { solid: "bg-violet-100 text-violet-800", outline: "border-violet-300 text-violet-700" },
  SELESAI: { solid: "bg-green-100 text-green-800", outline: "border-green-300 text-green-700" },
  DIBATALKAN: { solid: "bg-red-100 text-red-800", outline: "border-red-300 text-red-700" },
};

const FALLBACK = { solid: "bg-stone-200 text-stone-600", outline: "border-stone-300 text-stone-500" };

export function StatusBadge({
  status,
  label,
  variant = "solid",
}: {
  status: string;
  label: string;
  variant?: "solid" | "outline";
}) {
  const colors = STATUS_COLORS[status] ?? FALLBACK;
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
        variant === "outline" ? "border bg-white" : ""
      } ${colors[variant]}`}
    >
      {label}
    </span>
  );
}
