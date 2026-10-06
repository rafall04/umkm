import { getCategories } from "@/lib/queries";
import { requireRole, getMyVendor } from "@/lib/session";
import { ProductForm } from "../product-form";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const user = await requireRole("VENDOR", "ADMIN_DESA", "SUPERADMIN");
  const vendor = await getMyVendor(user.id);
  if (!vendor) redirect("/dashboard");
  const categories = await getCategories();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Tambah Produk</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
