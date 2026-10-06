import { db } from "@/lib/db";
import { requireRole, adminVillageFilter } from "@/lib/session";
import {
  rupiah,
  formatDateTime,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmPaymentButton } from "./confirm-payment-button";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const user = await requireRole("ADMIN_DESA", "SUPERADMIN");
  const filter = adminVillageFilter(user);

  const orders = await db.order.findMany({
    where: filter.villageId
      ? { items: { some: { vendor: { villageId: filter.villageId } } } }
      : {},
    include: {
      items: { include: { vendor: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Pesanan</h1>

      <div className="mt-6 space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{o.code}</p>
                <p className="mt-0.5 text-sm text-stone-500">
                  {formatDateTime(o.createdAt)} · {o.buyerName} · {o.buyerPhone}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {o.items.map((i) => i.vendor.name).join(", ")} ·{" "}
                  {o.paymentMethod}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">{rupiah(o.total)}</p>
                <div className="mt-1 flex flex-wrap justify-end gap-1.5">
                  <StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
                  <StatusBadge
                    status={o.paymentStatus}
                    label={PAYMENT_STATUS_LABEL[o.paymentStatus]}
                    variant="outline"
                  />
                </div>
                {o.paymentMethod !== "GATEWAY" &&
                  o.paymentStatus !== "PAID" &&
                  !["CANCELLED", "EXPIRED"].includes(o.status) && (
                    <ConfirmPaymentButton orderId={o.id} />
                  )}
              </div>
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
            Belum ada pesanan.
          </p>
        )}
      </div>
    </div>
  );
}
