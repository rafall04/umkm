import { db } from "@/lib/db";
import { requireRole, adminVillageFilter } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { ReviewToggle } from "./review-toggle";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const user = await requireRole("ADMIN_DESA", "SUPERADMIN");
  const filter = adminVillageFilter(user);

  const reviews = await db.review.findMany({
    where: filter.villageId ? { vendor: { villageId: filter.villageId } } : {},
    include: {
      product: { select: { name: true, slug: true, village: { select: { slug: true } } } },
      vendor: { select: { name: true, village: { select: { name: true } } } },
      orderItem: { select: { order: { select: { code: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Ulasan Pembeli</h1>
      <p className="mt-1 text-sm text-stone-500">
        Ulasan yang disembunyikan tidak tampil di halaman produk.
      </p>
      <div className="mt-6 space-y-3">
        {reviews.map((r) => (
          <div
            key={r.id}
            className={`rounded-2xl border border-stone-200 bg-white p-4 ${!r.isPublished ? "opacity-60" : ""}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                  <span className="text-stone-300">{"★".repeat(5 - r.rating)}</span>
                  <span className="ml-2 font-semibold">{r.buyerName}</span>
                  <span className="ml-1 text-xs text-stone-400">
                    {formatDateTime(r.createdAt)}
                  </span>
                </p>
                <p className="mt-1 text-sm text-stone-600">{r.comment}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {r.product.name} · {r.vendor.name} ({r.vendor.village.name}) ·{" "}
                  {r.orderItem.order.code}
                </p>
              </div>
              <ReviewToggle reviewId={r.id} isPublished={r.isPublished} />
            </div>
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
            Belum ada ulasan.
          </p>
        )}
      </div>
    </div>
  );
}
