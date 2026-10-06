"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useMounted } from "@/lib/use-mounted";
import { placeOrder } from "@/app/actions/checkout";
import { rupiah } from "@/lib/format";
import { FLAT_SHIPPING_FEE } from "@/lib/config";
import { INPUT_CLS } from "@/lib/ui";

const DELIVERY = [
  { value: "COD", label: "Bayar & serah terima di tempat", fee: 0 },
  { value: "ANTAR_DESA", label: "Diantar ke alamat Anda", fee: FLAT_SHIPPING_FEE },
  { value: "AMBIL_SENDIRI", label: "Ambil sendiri di lokasi penjual", fee: 0 },
] as const;

export function CheckoutForm({ onlinePayment }: { onlinePayment: boolean }) {
  const { items, clear } = useCart();
  const mounted = useMounted();
  const router = useRouter();
  const [delivery, setDelivery] = useState<(typeof DELIVERY)[number]["value"]>(
    "ANTAR_DESA",
  );
  const [payment, setPayment] = useState<"COD" | "TRANSFER" | "GATEWAY">("COD");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const paymentOptions = [
    { value: "COD" as const, label: "Bayar di Tempat (COD)", desc: "Bayar tunai saat barang diterima" },
    { value: "TRANSFER" as const, label: "QRIS / Transfer ke Toko", desc: "Scan QRIS penjual lalu upload bukti bayar" },
    ...(onlinePayment
      ? [{ value: "GATEWAY" as const, label: "QRIS / VA / E-Wallet", desc: "Bayar online otomatis terverifikasi" }]
      : []),
  ];

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shippingFee =
    subtotal === 0 ? 0 : (DELIVERY.find((d) => d.value === delivery)?.fee ?? 0);
  const total = subtotal + shippingFee;

  // Keranjang tersimpan di localStorage — jangan render isinya sebelum
  // hydration selesai supaya tidak terjadi mismatch SSR↔client.
  if (!mounted) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-stone-100" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-4xl">🧺</p>
        <h1 className="mt-4 text-xl font-bold">Keranjang masih kosong</h1>
        <Link
          href="/produk"
          className="mt-4 inline-block rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white"
        >
          Belanja Dulu
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await placeOrder({
      buyerName: String(fd.get("buyerName") ?? ""),
      buyerPhone: String(fd.get("buyerPhone") ?? ""),
      deliveryMethod: delivery,
      addressText: String(fd.get("addressText") ?? ""),
      note: String(fd.get("note") ?? ""),
      paymentMethod: payment,
      items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Gagal membuat pesanan");
      return;
    }
    clear();
    router.push(
      res.paymentUrl ??
        `/pesanan/${res.orderCode}?hp=${encodeURIComponent(String(fd.get("buyerPhone")))}`,
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          {/* Data pembeli */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">Data Pembeli</h2>
            <div className="mt-4 space-y-3">
              <input
                name="buyerName"
                required
                placeholder="Nama lengkap"
                aria-label="Nama lengkap"
                className={INPUT_CLS}
              />
              <input
                name="buyerPhone"
                required
                type="tel"
                placeholder="No. HP / WhatsApp (08xx)"
                aria-label="Nomor HP atau WhatsApp"
                className={INPUT_CLS}
              />
            </div>
          </section>

          {/* Pengiriman */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">Pengiriman</h2>
            <div className="mt-4 space-y-2">
              {DELIVERY.map((d) => (
                <label
                  key={d.value}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm ${
                    delivery === d.value
                      ? "border-brand-500 bg-brand-50"
                      : "border-stone-200"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="delivery"
                      className="accent-brand-600"
                      checked={delivery === d.value}
                      onChange={() => setDelivery(d.value)}
                    />
                    {d.label}
                  </span>
                  <span className="font-medium">
                    {d.fee === 0 ? "Gratis" : rupiah(d.fee)}
                  </span>
                </label>
              ))}
              {delivery !== "AMBIL_SENDIRI" && (
                <textarea
                  name="addressText"
                  required
                  rows={2}
                  placeholder="Alamat lengkap (RT/RW, dusun, patokan)"
                  aria-label="Alamat lengkap"
                  className={INPUT_CLS}
                />
              )}
            </div>
          </section>

          {/* Pembayaran */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">Pembayaran</h2>
            <div className="mt-4 space-y-2">
              {paymentOptions.map((p) => (
                <label
                  key={p.value}
                  className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${
                    payment === p.value
                      ? "border-brand-500 bg-brand-50"
                      : "border-stone-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    className="mt-0.5 accent-brand-600"
                    checked={payment === p.value}
                    onChange={() => setPayment(p.value)}
                  />
                  <span>
                    <span className="font-medium">{p.label}</span>
                    <span className="block text-xs text-stone-500">{p.desc}</span>
                  </span>
                </label>
              ))}
            </div>
            <textarea
              name="note"
              rows={2}
              placeholder="Catatan untuk penjual (opsional)"
              aria-label="Catatan untuk penjual"
              className={`${INPUT_CLS} mt-3`}
            />
          </section>
        </div>

        {/* Ringkasan */}
        <aside className="lg:col-span-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">Ringkasan Pesanan</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {items.map((i) => (
                <li key={i.productId} className="flex justify-between gap-2">
                  <span>
                    {i.name} <span className="text-stone-400">×{i.qty}</span>
                  </span>
                  <span>{rupiah(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-stone-100 pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500">Subtotal</dt>
                <dd>{rupiah(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Ongkir</dt>
                <dd>{shippingFee === 0 ? "Gratis" : rupiah(shippingFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd className="text-brand-700">{rupiah(total)}</dd>
              </div>
            </dl>
            {error && (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? "Memproses..." : `Buat Pesanan — ${rupiah(total)}`}
            </button>
          </div>
        </aside>
      </div>
    </form>
  );
}
