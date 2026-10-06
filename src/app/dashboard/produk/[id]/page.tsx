import { db } from "@/lib/db";
import { getCategories } from "@/lib/queries";
import { requireRole, getMyVendor } from "@/lib/session";
import { ProductForm } from "../product-form";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("VENDOR", "ADMIN_DESA", "SUPERADMIN");
  const vendor = await getMyVendor(user.id);
  if (!vendor) redirect("/dashboard");

  const { id } = await params;
  const product = await db.product.findFirst({
    where: { id, vendorId: vendor.id },
  });
  if (!product) notFound();

  const categories = await getCategories();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Edit Produk</h1>
      <ProductForm categories={categories} product={product} />
    </div>
  );
}
