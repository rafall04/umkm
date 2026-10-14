import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, getMyVendor } from "@/lib/session";
import { rupiah, ORDER_STATUS_LABEL } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireRole("VENDOR", "ADMIN_DESA", "SUPERADMIN");
  const vendor = await getMyVendor(user.id);

  if (!vendor) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
        <p className="text-4xl">🏪</p>
        <h1 className="mt-4 text-xl font-bold">Anda belum memiliki toko</h1>
        <p className="mt-2 text-stone-500">Daftarkan UMKM Anda terlebih dahulu.</p>
        <Link
          href="/daftar-umkm"
          className="mt-4 inline-block rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white"
        >
          Daftar UMKM
        </Link>
      </div>
    );
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [productCount, pendingOrders, totalRevenue, revenue30d, bestSellers, recentItems] =
    await Promise.all([
      db.product.count({ where: { vendorId: vendor.id, isActive: true } }),
      db.orderItem.count({
        where: {
          vendorId: vendor.id,
          vendorStatus: "MENUNGGU",
          order: { status: { notIn: ["PENDING", "CANCELLED", "EXPIRED"] } },
        },
      }),
      db.orderItem.aggregate({
        _sum: { subtotal: true },
        where: {
          vendorId: vendor.id,
          order: { paymentStatus: "PAID" },
          vendorStatus: { not: "DIBATALKAN" },
        },
      }),
      db.orderItem.aggregate({
        _sum: { subtotal: true },
        where: {
          vendorId: vendor.id,
          order: { paymentStatus: "PAID", createdAt: { gte: thirtyDaysAgo } },
          vendorStatus: { not: "DIBATALKAN" },
        },
      }),
      // Produk terlaris dari item yang sudah dibayar
      db.orderItem.groupBy({
        by: ["productName"],
        where: {
          vendorId: vendor.id,
          order: { paymentStatus: "PAID" },
          vendorStatus: { not: "DIBATALKAN" },
        },
        _sum: { qty: true, subtotal: true },
        orderBy: { _sum: { qty: "desc" } },
        take: 5,
      }),
      db.orderItem.findMany({
        where: { vendorId: vendor.id },
        include: { order: true },
        orderBy: { order: { createdAt: "desc" } },
        take: 5,
      }),
    ]);

  const stats = [
    { label: "Produk Aktif", value: String(productCount), href: "/dashboard/produk" },
    { label: "Pesanan Baru", value: String(pendingOrders), href: "/dashboard/pesanan" },
    { label: "Omzet 30 Hari", value: rupiah(revenue30d._sum.subtotal ?? 0), href: "/dashboard/pesanan" },
    { label: "Total Pendapatan", value: rupiah(totalRevenue._sum.subtotal ?? 0), href: "/dashboard/pesanan" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ringkasan {vendor.name}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-2xl border border-stone-200 bg-white p-5 transition hover:shadow-md"
          >
            <p className="text-sm text-stone-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-brand-700">{s.value}</p>
          </Link>
        ))}
      </div>

      {/* Produk terlaris */}
      {bestSellers.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">Produk Terlaris</h2>
          <ul className="mt-3 space-y-2">
            {bestSellers.map((b, i) => {
              const max = bestSellers[0]._sum.qty ?? 1;
              const pct = Math.max(6, Math.round(((b._sum.qty ?? 0) / max) * 100));
              return (
                <li key={b.productName} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {i + 1}. {b.productName}
                    </span>
                    <span className="text-stone-500">
                      {b._sum.qty} terjual · {rupiah(b._sum.subtotal ?? 0)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-stone-100">
                    <div
                      className="h-2 rounded-full bg-brand-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <h2 className="font-semibold">Pesanan Terbaru</h2>
          <Link href="/dashboard/pesanan" className="text-sm font-semibold text-brand-600">
            Semua →
          </Link>
        </div>
        <ul className="divide-y divide-stone-100">
          {recentItems.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <div>
                <p className="font-medium">
                  {item.productName}
                  {item.variantName ? ` (${item.variantName})` : ""} ×{item.qty}
                </p>
                <p className="text-xs text-stone-500">{item.order.code}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge
                  status={item.order.status}
                  label={ORDER_STATUS_LABEL[item.order.status]}
                />
                <p className="font-semibold">{rupiah(item.subtotal)}</p>
              </div>
            </li>
          ))}
          {recentItems.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-stone-400">
              Belum ada pesanan.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
