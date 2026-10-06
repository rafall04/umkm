import Link from "next/link";
import type { Metadata } from "next";
import { trackOrder, cancelOrder } from "@/app/actions/checkout";
import { StatusBadge } from "@/components/status-badge";
import { PaymentSection } from "./payment-section";
import {
  rupiah,
  formatDateTime,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  VENDOR_STATUS_LABEL,
  DELIVERY_LABEL,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Detail Pesanan" };

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ hp?: string }>;
};

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const [{ code }, { hp }] = await Promise.all([params, searchParams]);
  const order = await trackOrder(code, hp ?? "");

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-5xl">🔍</p>
        <h1 className="mt-4 text-2xl font-bold">Pesanan Tidak Ditemukan</h1>
        <p className="mt-2 text-stone-500">
          Periksa kembali kode pesanan dan nomor HP Anda.
        </p>
        <form className="mt-6">
          <input
            name="hp"
            type="tel"
            required
            placeholder="No. HP pembeli"
            aria-label="Nomor HP pembeli"
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            defaultValue={hp}
          />
          <button className="mt-3 w-full rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700">
            Verifikasi
          </button>
        </form>
      </div>
    );
  }

  const canCancel =
    ["PENDING", "PROCESSING"].includes(order.status) &&
    order.paymentStatus !== "PAID";
  const boundCancel = cancelOrder.bind(null, order.code, hp ?? order.buyerPhone);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{order.code}</h1>
          <p className="text-sm text-stone-500">{formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={order.status} label={ORDER_STATUS_LABEL[order.status]} />
          <StatusBadge
            status={order.paymentStatus}
            label={
              order.paymentMethod === "COD" && order.paymentStatus === "UNPAID"
                ? "Bayar di Tempat"
                : PAYMENT_STATUS_LABEL[order.paymentStatus]
            }
            variant="outline"
          />
        </div>
      </div>

      {order.paymentUrl && order.paymentStatus === "UNPAID" && (
        <a
          href={order.paymentUrl}
          className="mt-6 block rounded-2xl bg-brand-600 p-5 text-center font-bold text-white hover:bg-brand-700"
        >
          Bayar Sekarang →
        </a>
      )}
      {order.paymentMethod === "TRANSFER" &&
        order.paymentStatus !== "PAID" &&
        !["CANCELLED", "EXPIRED"].includes(order.status) && (
          <PaymentSection
            orderCode={order.code}
            phone={hp ?? order.buyerPhone}
            total={order.total}
            vendorName={order.items[0]?.vendor.name ?? "penjual"}
            vendorWhatsapp={order.items[0]?.vendor.whatsapp ?? null}
            qrisImage={order.items[0]?.vendor.qrisImage ?? null}
            paymentProof={order.paymentProof}
            awaitingConfirmation={order.paymentStatus === "PENDING"}
          />
        )}

      {/* Item pesanan */}
      <div className="mt-6 rounded-2xl border border-stone-200 bg-white">
        <h2 className="border-b border-stone-100 px-5 py-3 font-semibold">Item Pesanan</h2>
        <ul className="divide-y divide-stone-100">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div>
                <p className="text-sm font-medium">
                  {item.productName} <span className="text-stone-400">×{item.qty}</span>
                </p>
                <p className="text-xs text-stone-500">
                  {item.vendor.name} · {item.vendor.village.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{rupiah(item.subtotal)}</p>
                <StatusBadge
                  status={item.vendorStatus}
                  label={VENDOR_STATUS_LABEL[item.vendorStatus]}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Ringkasan */}
      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">Pengiriman</span>
            <span>{DELIVERY_LABEL[order.deliveryMethod]}</span>
          </div>
          {order.deliveryMethod !== "AMBIL_SENDIRI" && (
            <div className="flex justify-between">
              <span className="text-stone-500">Alamat</span>
              <span className="max-w-xs text-right">{order.addressText}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-stone-500">Subtotal</span>
            <span>{rupiah(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Ongkir</span>
            <span>{order.shippingFee === 0 ? "Gratis" : rupiah(order.shippingFee)}</span>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-bold">
            <span>Total</span>
            <span>{rupiah(order.total)}</span>
          </div>
        </div>
      </div>

      {order.note && (
        <p className="mt-4 rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">
          Catatan: {order.note}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        {canCancel && (
          <form action={boundCancel}>
            <button className="rounded-xl border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
              Batalkan Pesanan
            </button>
          </form>
        )}
        <Link
          href="/produk"
          className="rounded-xl border border-stone-300 px-5 py-2.5 text-sm font-semibold hover:bg-stone-50"
        >
          Belanja Lagi
        </Link>
      </div>
    </div>
  );
}
