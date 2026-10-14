import { db } from "@/lib/db";
import { VendorRegisterForm } from "./vendor-register-form";

export const dynamic = "force-dynamic";

export default async function VendorRegisterPage() {
  // Semua desa/kelurahan Bojonegoro bisa dipilih — pendaftaran dari wilayah
  // yang belum aktif menjadi sinyal bagi admin untuk membukanya.
  const villages = await db.village.findMany({
    select: { id: true, name: true, kecamatan: true, isActive: true },
    orderBy: [{ isActive: "desc" }, { kecamatan: "asc" }, { name: "asc" }],
  });
  return <VendorRegisterForm villages={villages} />;
}
