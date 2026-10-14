import { db } from "@/lib/db";
import { requireRole, getMyVendor } from "@/lib/session";
import { rupiah, formatDateTime, waLink, VENDOR_STATUS_LABEL, DELIVERY_LABEL } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { ItemStatusButtons } from "./item-status-buttons";
import { PrintReceiptButton } from "@/components/print-receipt-button";
import { MarkPaidButton } from "./mark-paid-button";
import { PaymentReviewButtons } from "./payment-review-buttons";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Tab = "baru" | "konfirmasi" | "diproses" | "selesai";

const TABS: { key: Tab | "semua"; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "baru", label: "Pesanan Baru" },
  { key: "konfirmasi", label: "Cek Bukti Bayar" },
  { key: "diproses", label: "Diproses" },
  { key: "selesai", label: "Selesai" },
];

export default async function VendorOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
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

  const isAwaitingReview = (o: (typeof items)[number]["order"]) =>
    o.paymentMethod === "TRANSFER" && o.paymentStatus === "PENDING" && !!o.paymentProof;

  const counts: Record<Tab | "semua", number> = {
    semua: items.length,
    baru: items.filter((i) => i.vendorStatus === "MENUNGGU" && !isAwaitingReview(i.order)).length,
    konfirmasi: items.filter((i) => isAwaitingReview(i.order)).length,
    diproses: items.filter((i) => ["DIPROSES", "DIKIRIM"].includes(i.vendorStatus)).length,
    selesai: items.filter((i) => ["SELESAI", "DIBATALKAN"].includes(i.vendorStatus)).length,
  };

  const active = (TABS.some((t) => t.key === tab) ? tab : "semua") as Tab | "semua";
  const filtered =
    active === "semua"
      ? items
      : items.filter((i) => {
          if (active === "baru") return i.vendorStatus === "MENUNGGU" && !isAwaitingReview(i.order);
          if (active === "konfirmasi") return isAwaitingReview(i.order);
          if (active === "diproses") return ["DIPROSES", "DIKIRIM"].includes(i.vendorStatus);
          return ["SELESAI", "DIBATALKAN"].includes(i.vendorStatus);
        });

  return (
    <div>
      <h1 className="text-2xl font-bold">Pesanan Masuk</h1>
      <p className="mt-1 text-sm text-stone-500">
        Pesanan COD & yang sudah dibayar. Tinjau bukti bayar lalu ubah status sesuai progres pengiriman.
      </p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "semua" ? "/dashboard/pesanan" : `/dashboard/pesanan?tab=${t.key}`}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
              active === t.key
                ? "bg-brand-600 text-white"
                : "border border-stone-300 text-stone-600 hover:border-brand-400"
            }`}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span className={`ml-1.5 ${active === t.key ? "text-brand-100" : "text-stone-400"}`}>
                {counts[t.key]}
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {filtered.map((item) => {
          const { order } = item;
          const isTransfer = order.paymentMethod === "TRANSFER";
          const awaitingReview = isAwaitingReview(order);
          const awaitingPayment = isTransfer && order.paymentStatus === "UNPAID";
          // Item hanya boleh diproses setelah pembayaran lunas (COD: tunai di tempat)
          const canProgress =
            order.paymentMethod === "COD" || order.paymentStatus === "PAID";
          // COD yang belum lunas — vendor menandai saat tunai diterima
          const codUnpaid =
            order.paymentMethod === "COD" && order.paymentStatus === "UNPAID";

          return (
            <div key={item.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {item.productName}
                    {item.variantName && (
                      <span className="text-stone-500"> ({item.variantName})</span>
                    )}{" "}
                    <span className="text-stone-400">×{item.qty}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-stone-500">
                    {order.code} · {formatDateTime(order.createdAt)}
                  </p>
                  <p className="mt-1 text-sm">
                    {order.buyerName} · {order.buyerPhone}{" "}
                    <a
                      href={waLink(
                        order.buyerPhone,
                        `Halo ${order.buyerName}, saya ${vendor.name} dari Pasar UMKM terkait pesanan ${order.code}.`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-green-700 hover:underline"
                    >
                      Chat WA →
                    </a>
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
                  {codUnpaid && <MarkPaidButton orderId={order.id} />}
                  <PrintReceiptButton
                    code={order.code}
                    className="mt-2 text-xs font-medium text-stone-500 hover:text-stone-800"
                  />
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
            {items.length === 0 ? "Belum ada pesanan masuk." : "Tidak ada pesanan di tab ini."}
          </p>
        )}
      </div>
    </div>
  );
}
