import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, adminVillageFilter } from "@/lib/session";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireRole("ADMIN_DESA", "SUPERADMIN");
  const filter = adminVillageFilter(user);

  const [vendorCount, pendingVerify, orderCount, revenue] = await Promise.all([
    db.vendor.count({ where: filter }),
    db.vendor.count({ where: { ...filter, isVerified: false } }),
    db.order.count({
      where: filter.villageId
        ? { items: { some: { vendor: { villageId: filter.villageId } } } }
        : {},
    }),
    db.order.aggregate({
      _sum: { total: true },
      where: {
        paymentStatus: "PAID",
        ...(filter.villageId
          ? { items: { some: { vendor: { villageId: filter.villageId } } } }
          : {}),
      },
    }),
  ]);

  const stats = [
    { label: "UMKM Terdaftar", value: String(vendorCount), href: "/admin/umkm" },
    { label: "Menunggu Verifikasi", value: String(pendingVerify), href: "/admin/umkm" },
    { label: "Total Pesanan", value: String(orderCount), href: "/admin/pesanan" },
    { label: "Omzet Terbayar", value: rupiah(revenue._sum.total ?? 0), href: "/admin/pesanan" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Ringkasan</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}
