import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma/enums";
import { redirect } from "next/navigation";

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireRole(...roles: Role[]) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

/** Vendor milik user yang sedang login */
export async function getMyVendor(userId: string) {
  return db.vendor.findUnique({
    where: { ownerId: userId },
    include: { village: true },
  });
}

/** Scope wilayah untuk admin: SUPERADMIN → semua, ADMIN_DESA → wilayah-nya */
export function adminVillageFilter(user: { role: Role; villageId: string | null }) {
  return user.role === "ADMIN_DESA" ? { villageId: user.villageId ?? undefined } : {};
}
