import { db } from "@/lib/db";
import { requireRole, adminVillageFilter } from "@/lib/session";
import { VendorActions } from "./vendor-actions";

export const dynamic = "force-dynamic";

export default async function AdminVendorsPage() {
  const user = await requireRole("ADMIN_DESA", "SUPERADMIN");
  const filter = adminVillageFilter(user);

  const vendors = await db.vendor.findMany({
    where: filter,
    include: {
      village: true,
      owner: { select: { name: true, phone: true, email: true } },
      _count: { select: { products: true } },
    },
    orderBy: [{ isVerified: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">UMKM Terdaftar</h1>
      <div className="mt-6 space-y-3">
        {vendors.map((v) => (
          <div key={v.id} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {v.name}{" "}
                  {v.isVerified ? (
                    <span className="ml-1.5 inline-block rounded-full bg-brand-100 px-2.5 py-1 align-middle text-xs font-semibold text-brand-700">
                      ✓ Terverifikasi
                    </span>
                  ) : (
                    <span className="ml-1.5 inline-block rounded-full bg-amber-100 px-2.5 py-1 align-middle text-xs font-semibold text-amber-800">
                      ⏳ Belum diverifikasi
                    </span>
                  )}
                  {!v.isActive && (
                    <span className="ml-1.5 inline-block rounded-full bg-red-100 px-2.5 py-1 align-middle text-xs font-semibold text-red-700">
                      Nonaktif
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-stone-600">{v.description}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {v.village.name} · {v._count.products} produk · Pemilik: {v.owner.name} (
                  {v.owner.phone ?? v.owner.email})
                </p>
                {!v.village.isActive && (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                    ⚠️ Wilayah &ldquo;{v.village.name}&rdquo; belum aktif — produk tidak tampil publik
                    meski UMKM terverifikasi.
                  </p>
                )}
              </div>
              <VendorActions
                vendorId={v.id}
                isVerified={v.isVerified}
                isActive={v.isActive}
                villageInactive={!v.village.isActive}
                villageId={v.villageId}
                villageName={v.village.name}
                canActivateVillage={user.role === "SUPERADMIN"}
              />
            </div>
          </div>
        ))}
        {vendors.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
            Belum ada UMKM terdaftar.
          </p>
        )}
      </div>
    </div>
  );
}
