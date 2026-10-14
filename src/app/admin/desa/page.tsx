import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import type { Village } from "@/generated/prisma/client";
import { VillageForm } from "./village-form";
import { VillageToggle } from "./village-toggle";

export const dynamic = "force-dynamic";

export default async function AdminVillagesPage() {
  await requireRole("SUPERADMIN");

  const villages = await db.village.findMany({
    include: { _count: { select: { vendors: true, products: true } } },
    // Aktif dulu — ratusan wilayah master hasil pre-seed menunggu aktivasi
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  const active = villages.filter((v) => v.isActive);
  const inactive = villages.filter((v) => !v.isActive);

  return (
    <div>
      <h1 className="text-2xl font-bold">Kelola Wilayah</h1>

      <div className="mt-6 space-y-3">
        {active.map((v) => (
          <VillageRow key={v.id} v={v} />
        ))}
      </div>

      {inactive.length > 0 && (
        <details className="mt-6 rounded-2xl border border-stone-200 bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-stone-600">
            {inactive.length} wilayah belum aktif (hasil pre-seed data
            Kemendagri) — buka untuk mengaktifkan
          </summary>
          <div className="space-y-3 border-t border-stone-100 p-4">
            {inactive.map((v) => (
              <VillageRow key={v.id} v={v} />
            ))}
          </div>
        </details>
      )}

      <h2 className="mt-10 text-xl font-bold">Tambah Wilayah Baru</h2>
      <p className="mt-1 text-sm text-stone-500">
        Sistem ini mendukung penambahan wilayah baru kapan saja — slug menjadi subfolder URL.
      </p>
      <div className="mt-4">
        <VillageForm />
      </div>
    </div>
  );
}

type VillageRowData = Village & {
  _count: { vendors: number; products: number };
};

function VillageRow({ v }: { v: VillageRowData }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {v.name}
            {!v.isActive && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                Nonaktif
              </span>
            )}
          </p>
          <p className="text-sm text-stone-500">
            /{v.slug} · Kec. {v.kecamatan}, {v.kabupaten} · {v._count.vendors} UMKM ·{" "}
            {v._count.products} produk
          </p>
        </div>
        <VillageToggle villageId={v.id} isActive={v.isActive} />
      </div>
    </div>
  );
}
