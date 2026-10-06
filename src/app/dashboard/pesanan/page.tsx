import { db } from "@/lib/db";
import { requireRole, getMyVendor } from "@/lib/session";
import { rupiah, formatDateTime, VENDOR_STATUS_LABEL, DELIVERY_LABEL } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { ItemStatusButtons } from "./item-status-buttons";
import { PaymentReviewButtons } from "./payment-review-buttons";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VendorOrdersPage() {
  const user = await requireRole("VENDOR", "ADMIN_DESA", "SUPERADMIN");
  const vendor = await getMyVendor(user.id);
  if (!vendor) redirect("/dashboard");

  // Tampilkan semua order aktif — termasuk yang belum dibayar agar penjual
  // bisa meninjau bukti transfer/QRIS yang diupload pembeli.
  const items = await db.orderItem.findMany({
    where: {
      vendorId: vendor.id,
      order: { status: { notIn: ["CANCELLED", "EXPIRED"] } },
    },
    include: { order: true },
    orderBy: { order: { createdAt: "desc" } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Pesanan Masuk</h1>
      <p className="mt-1 text-sm text-stone-500">
        Pesanan COD & yang sudah dibayar. Tinjau bukti bayar lalu ubah status sesuai progres pengiriman.
      </p>

      <div className="mt-6 space-y-4">
        {items.map((item) => {
          const { order } = item;
          const isTransfer = order.paymentMethod === "TRANSFER";
          const awaitingReview =
            isTransfer && order.paymentStatus === "PENDING" && order.paymentProof;
          const awaitingPayment = isTransfer && order.paymentStatus === "UNPAID";
          // Item hanya boleh diproses setelah pembayaran lunas (COD: tunai di tempat)
          const canProgress = !isTransfer || order.paymentStatus === "PAID";

          return (
            <div key={item.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {item.productName} <span className="text-stone-400">×{item.qty}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-stone-500">
                    {order.code} · {formatDateTime(order.createdAt)}
                  </p>
                  <p className="mt-1 text-sm">
                    {order.buyerName} · {order.buyerPhone}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    {DELIVERY_LABEL[order.deliveryMethod]}
                    {order.deliveryMethod !== "AMBIL_SENDIRI" &&
                      ` — ${order.addressText}`}
                  </p>
                  {order.note && (
                    <p className="mt-1 text-xs italic text-stone-500">Catatan: {order.note}</p>
                  )}
                  {awaitingPayment && (
                    <p className="mt-2 rounded-lg bg-stone-100 px-3 py-1.5 text-xs text-stone-500">
                      ⏳ Menunggu pembeli membayar & mengupload bukti
                    </p>
                  )}
                  {awaitingReview && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-semibold text-amber-800">
                        💳 Bukti pembayaran menunggu konfirmasi Anda
                      </p>
                      <a
                        href={order.paymentProof!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={order.paymentProof!}
                          alt="Bukti pembayaran"
                          className="h-24 rounded-lg border border-amber-200 bg-white object-cover"
                        />
                      </a>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-700">{rupiah(item.subtotal)}</p>
                  <StatusBadge
                    status={item.vendorStatus}
                    label={VENDOR_STATUS_LABEL[item.vendorStatus]}
                  />
                  {awaitingReview ? (
                    <PaymentReviewButtons orderId={order.id} />
                  ) : canProgress ? (
                    <ItemStatusButtons itemId={item.id} current={item.vendorStatus} />
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
            Belum ada pesanan masuk.
          </p>
        )}
      </div>
    </div>
  );
}
