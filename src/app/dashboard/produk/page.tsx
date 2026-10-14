import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { requireRole, getMyVendor } from "@/lib/session";
import { rupiah } from "@/lib/format";
import { StockEditor } from "./stock-editor";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VendorProductsPage() {
  const user = await requireRole("VENDOR", "ADMIN_DESA", "SUPERADMIN");
  const vendor = await getMyVendor(user.id);
  if (!vendor) redirect("/dashboard");

  const products = await db.product.findMany({
    where: { vendorId: vendor.id },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produk Saya</h1>
        <Link
          href="/dashboard/produk/baru"
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Tambah Produk
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100">
              {p.images[0] ? (
                <Image src={p.images[0]} alt={p.name} fill sizes="64px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xl">🧺</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {p.name}
                {!p.isActive && (
                  <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-500">
                    Nonaktif
                  </span>
                )}
              </p>
              <p className="text-sm text-stone-500">
                {rupiah(p.price)}/{p.unit} · Stok <StockEditor productId={p.id} stock={p.stock} /> · {p.category.name}
              </p>
            </div>
            <Link
              href={`/dashboard/produk/${p.id}`}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
            >
              Edit
            </Link>
          </div>
        ))}
        {products.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
            Belum ada produk.{" "}
            <Link href="/dashboard/produk/baru" className="font-semibold text-brand-600">
              Tambah produk pertama
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
