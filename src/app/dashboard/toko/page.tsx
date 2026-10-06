import { requireRole, getMyVendor } from "@/lib/session";
import { StoreForm } from "./store-form";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const user = await requireRole("VENDOR", "ADMIN_DESA", "SUPERADMIN");
  const vendor = await getMyVendor(user.id);
  if (!vendor) redirect("/dashboard");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Toko Saya</h1>
      <StoreForm vendor={vendor} />
    </div>
  );
}
