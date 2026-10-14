import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { UserActiveButton } from "./user-active-button";
import { AdminCreateForm } from "./admin-create-form";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireRole("SUPERADMIN");

  const [users, villages] = await Promise.all([
    db.user.findMany({
      include: { village: { select: { name: true } }, vendor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.village.findMany({
      select: { id: true, name: true, kecamatan: true, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const roleLabel: Record<string, string> = {
    SUPERADMIN: "Superadmin",
    ADMIN_DESA: "Admin Wilayah",
    VENDOR: "Pemilik UMKM",
    BUYER: "Pembeli",
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pengguna</h1>
        <AdminCreateForm villages={villages} />
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Kontak</th>
              <th className="px-4 py-3">Peran</th>
              <th className="px-4 py-3">Wilayah/Toko</th>
              <th className="px-4 py-3">Terdaftar</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map((u) => (
              <tr key={u.id} className={!u.isActive ? "opacity-50" : ""}>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-stone-500">
                  {u.email ?? "-"} {u.phone ? `· ${u.phone}` : ""}
                </td>
                <td className="px-4 py-3">{roleLabel[u.role]}</td>
                <td className="px-4 py-3 text-stone-500">
                  {u.vendor?.name ?? u.village?.name ?? "-"}
                </td>
                <td className="px-4 py-3 text-stone-500">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  {u.role !== "SUPERADMIN" && (
                    <UserActiveButton userId={u.id} isActive={u.isActive} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
