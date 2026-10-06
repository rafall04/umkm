import { db } from "@/lib/db";
import { cache } from "react";

export const getVillages = cache(async () =>
  db.village.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { vendors: true, products: true } } },
  }),
);

export const getVillageBySlug = cache(async (slug: string) =>
  db.village.findUnique({
    where: { slug },
    include: { _count: { select: { vendors: true, products: true } } },
  }),
);

export const getCategories = cache(async () =>
  db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  }),
);

export const getProductsByVillage = cache(
  async (villageId: string, opts?: { categoryId?: string; q?: string; limit?: number }) =>
    db.product.findMany({
      where: {
        villageId,
        isActive: true,
        vendor: { isActive: true, isVerified: true },
        ...(opts?.categoryId ? { categoryId: opts.categoryId } : {}),
        ...(opts?.q
          ? {
              OR: [
                { name: { contains: opts.q, mode: "insensitive" as const } },
                { description: { contains: opts.q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      include: { vendor: true, category: true },
      orderBy: { createdAt: "desc" },
      take: opts?.limit,
    }),
);

export const getFeaturedProducts = cache(async (limit = 8) =>
  db.product.findMany({
    where: { isActive: true, vendor: { isActive: true, isVerified: true } },
    include: { vendor: { include: { village: true } }, category: true, village: true },
    orderBy: [{ views: "desc" }, { createdAt: "desc" }],
    take: limit,
  }),
);

export const getVendorsByVillage = cache(async (villageId: string) =>
  db.vendor.findMany({
    where: { villageId, isActive: true, isVerified: true },
    include: {
      village: true,
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
  }),
);
