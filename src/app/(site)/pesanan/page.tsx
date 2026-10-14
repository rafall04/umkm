import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  rupiah,
  formatDateTime,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { TrackForm } from "./track-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Pesanan Saya" };

export default async function TrackOrderPage() {
  const session = await auth();

  const orders = session?.user?.id
    ? await db.order.findMany({
        where: { buyerId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { items: { select: { productName: true, variantName: true, qty: true } } },
      })
    : [];

  return (
    <div className="mx-auto max-w-md px-4 py-16 space-y-8">
      {orders.length > 0 && (
        <section>
          <h1 className="text-2xl font-bold">Pesanan Saya</h1>
          <ul className="mt-4 space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/pesanan/${o.code}`}
                  className="block rounded-2xl border border-stone-200 bg-white p-4 transition hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold">{o.code}</p>
                    <p className="text-xs text-stone-500">
                      {formatDateTime(o.createdAt)}
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-stone-500">
                    {o.items
                      .map(
                        (i) =>
                          `${i.productName}${i.variantName ? ` (${i.variantName})` : ""} ×${i.qty}`,
                      )
                      .join(", ")}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex gap-1.5">
                      <StatusBadge
                        status={o.status}
                        label={ORDER_STATUS_LABEL[o.status]}
                      />
                      <StatusBadge
                        status={o.paymentStatus}
                        label={
                          o.paymentMethod === "COD" && o.paymentStatus === "UNPAID"
                            ? "Bayar di Tempat"
                            : PAYMENT_STATUS_LABEL[o.paymentStatus]
                        }
                      />
                    </div>
                    <p className="text-sm font-bold text-brand-700">
                      {rupiah(o.total)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <TrackForm />
    </div>
  );
}
