import Link from "next/link";
import type { Metadata } from "next";
import { getReceiptOrder } from "@/app/actions/checkout";
import { rupiah, formatDateTime, DELIVERY_LABEL } from "@/lib/format";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Struk Pesanan" };

const METHOD_LABEL: Record<string, string> = {
  COD: "COD (Bayar di Tempat)",
  TRANSFER: "Transfer / QRIS",
  GATEWAY: "Pembayaran Online",
};

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ hp?: string; ukuran?: string }>;
};

export default async function ReceiptPage({ params, searchParams }: Props) {
  const [{ code }, { hp, ukuran }] = await Promise.all([params, searchParams]);
  const order = await getReceiptOrder(code, hp ?? "");

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-5xl">🔍</p>
        <h1 className="mt-4 text-2xl font-bold">Struk Tidak Ditemukan</h1>
        <p className="mt-2 text-stone-500">
          Gunakan tautan struk dari halaman detail pesanan Anda.
        </p>
        <Link
          href="/pesanan"
          className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700"
        >
          Lacak Pesanan
        </Link>
      </div>
    );
  }

  const vendor = order.items[0]?.vendor;
  const paper = ukuran === "58" ? 58 : 80;
  const receiptW = paper === 58 ? "max-w-[50mm]" : "max-w-[72mm]";
  const statusLabel =
    order.paymentStatus === "PAID"
      ? "LUNAS"
      : order.paymentMethod === "COD"
        ? "BAYAR DI TEMPAT"
        : "BELUM LUNAS";

  const divider = "-".repeat(paper === 58 ? 30 : 40);

  return (
    <div className="min-h-screen bg-stone-200 px-4 py-8 print:bg-white print:p-0">
      <style
        dangerouslySetInnerHTML={{
          __html: `@page { size: ${paper}mm auto; margin: 0; }`,
        }}
      />

      <div className="no-print mx-auto mb-4 flex max-w-xs items-center justify-center gap-2 print:hidden">
        <PrintButton className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700" />
        <Link
          href={`?hp=${encodeURIComponent(hp ?? "")}&ukuran=${paper === 58 ? 80 : 58}`}
          className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-stone-50"
        >
          {paper === 58 ? "Ke 80mm" : "Ke 58mm"}
        </Link>
      </div>

      <div
        className={`mx-auto w-full ${receiptW} bg-white p-[4mm] font-mono text-[11px] leading-snug text-black shadow-lg print:max-w-full print:p-[2mm] print:shadow-none`}
      >
        <div className="text-center">
          <p className="text-[13px] font-bold uppercase">{vendor?.name ?? "Pasar UMKM"}</p>
          <p>
            {vendor?.village.name}, Kec. {vendor?.village.kecamatan}
          </p>
          {vendor?.whatsapp && <p>WA: {vendor.whatsapp}</p>}
          <p className="mt-1 text-[10px]">Pasar UMKM Bojonegoro</p>
        </div>

        <p className="my-2 overflow-hidden whitespace-nowrap">{divider}</p>

        <table className="w-full">
          <tbody>
            <tr><td className="align-top">No.</td><td className="text-right font-bold">{order.code}</td></tr>
            <tr><td className="align-top">Tgl</td><td className="text-right">{formatDateTime(order.createdAt)}</td></tr>
            <tr><td className="align-top">Pembeli</td><td className="text-right">{order.buyerName}</td></tr>
            <tr><td className="align-top">HP</td><td className="text-right">{order.buyerPhone}</td></tr>
            <tr>
              <td className="align-top">Kirim</td>
              <td className="text-right">
                {DELIVERY_LABEL[order.deliveryMethod]}
                {order.deliveryMethod !== "AMBIL_SENDIRI" && order.addressText
                  ? ` — ${order.addressText}`
                  : ""}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="my-2 overflow-hidden whitespace-nowrap">{divider}</p>

        <ul className="space-y-1.5">
          {order.items.map((item) => (
            <li key={item.id}>
              <p>{item.productName}</p>
              <div className="flex justify-between">
                <span>
                  {item.qty} x {rupiah(item.price)}
                </span>
                <span>{rupiah(item.subtotal)}</span>
              </div>
            </li>
          ))}
        </ul>

        <p className="my-2 overflow-hidden whitespace-nowrap">{divider}</p>

        <table className="w-full">
          <tbody>
            <tr><td>Subtotal</td><td className="text-right">{rupiah(order.subtotal)}</td></tr>
            <tr>
              <td>Ongkir</td>
              <td className="text-right">
                {order.shippingFee === 0 ? "Gratis" : rupiah(order.shippingFee)}
              </td>
            </tr>
            <tr className="text-[13px] font-bold">
              <td className="pt-1">TOTAL</td>
              <td className="pt-1 text-right">{rupiah(order.total)}</td>
            </tr>
          </tbody>
        </table>

        <p className="my-2 overflow-hidden whitespace-nowrap">{divider}</p>

        <table className="w-full">
          <tbody>
            <tr><td>Metode</td><td className="text-right">{METHOD_LABEL[order.paymentMethod]}</td></tr>
            <tr>
              <td>Status</td>
              <td className="text-right font-bold">{statusLabel}</td>
            </tr>
          </tbody>
        </table>

        {order.note && (
          <>
            <p className="my-2 overflow-hidden whitespace-nowrap">{divider}</p>
            <p>Catatan: {order.note}</p>
          </>
        )}

        <p className="my-2 overflow-hidden whitespace-nowrap">{divider}</p>

        <p className="text-center">
          Terima kasih telah berbelanja!
          <br />
          Setiap pembelian mendukung UMKM lokal.
        </p>
        <p className="mt-3 text-center text-[9px]">Dicetak {formatDateTime(new Date())}</p>
      </div>

      <div className="no-print mx-auto mt-4 max-w-xs text-center print:hidden">
        <Link
          href={`/pesanan/${order.code}${hp ? `?hp=${encodeURIComponent(hp)}` : ""}`}
          className="text-sm font-medium text-stone-500 hover:text-stone-800"
        >
          ← Kembali ke detail pesanan
        </Link>
      </div>
    </div>
  );
}
