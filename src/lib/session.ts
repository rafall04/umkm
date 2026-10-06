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

  // JWT tidak berubah setelah login — ambil ulang status aktif, role,
  // dan scope wilayah dari DB agar nonaktif/pemindahan role langsung
  // berlaku tanpa menunggu token kedaluwarsa (1 query PK per aksi).
  const fresh = await db.user.findUnique({
    where: { id: user.id },
    select: { isActive: true, role: true, villageId: true },
  });
  if (!fresh?.isActive) redirect("/login");
  if (!roles.includes(fresh.role)) redirect("/");

  return { ...user, role: fresh.role, villageId: fresh.villageId };
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
  if (user.role !== "ADMIN_DESA") return {};
  // Fail-closed: admin tanpa wilayah tidak boleh melihat/mengubah apa pun —
  // nilai ini tidak akan pernah cocok dengan id asli.
  return { villageId: user.villageId ?? "__tanpa_wilayah__" };
}
