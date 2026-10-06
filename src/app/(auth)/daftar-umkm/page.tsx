import { getVillages } from "@/lib/queries";
import { VendorRegisterForm } from "./vendor-register-form";

export const dynamic = "force-dynamic";

export default async function VendorRegisterPage() {
  const villages = await getVillages();
  return <VendorRegisterForm villages={villages} />;
}
