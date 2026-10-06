const COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-violet-100 text-violet-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  EXPIRED: "bg-stone-200 text-stone-600",
  UNPAID: "bg-amber-100 text-amber-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-stone-200 text-stone-600",
  MENUNGGU: "bg-amber-100 text-amber-800",
  DIPROSES: "bg-indigo-100 text-indigo-800",
  DIKIRIM: "bg-violet-100 text-violet-800",
  SELESAI: "bg-green-100 text-green-800",
  DIBATALKAN: "bg-red-100 text-red-800",
};

const OUTLINE: Record<string, string> = {
  PENDING: "border-amber-300 text-amber-700",
  PAID: "border-blue-300 text-blue-700",
  PROCESSING: "border-indigo-300 text-indigo-700",
  DELIVERED: "border-violet-300 text-violet-700",
  COMPLETED: "border-green-300 text-green-700",
  CANCELLED: "border-red-300 text-red-700",
  EXPIRED: "border-stone-300 text-stone-500",
  UNPAID: "border-amber-300 text-amber-700",
  FAILED: "border-red-300 text-red-700",
  REFUNDED: "border-stone-300 text-stone-500",
  MENUNGGU: "border-amber-300 text-amber-700",
  DIPROSES: "border-indigo-300 text-indigo-700",
  DIKIRIM: "border-violet-300 text-violet-700",
  SELESAI: "border-green-300 text-green-700",
  DIBATALKAN: "border-red-300 text-red-700",
};

export function StatusBadge({
  status,
  label,
  variant = "solid",
}: {
  status: string;
  label: string;
  variant?: "solid" | "outline";
}) {
  const palette = variant === "outline" ? OUTLINE : COLORS;
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
        variant === "outline" ? "border bg-white" : ""
      } ${palette[status] ?? "bg-stone-200 text-stone-600"}`}
    >
      {label}
    </span>
  );
}
