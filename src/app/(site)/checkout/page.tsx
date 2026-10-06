import type { Metadata } from "next";
import { getGateway } from "@/lib/payments";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return <CheckoutForm onlinePayment={getGateway().name !== "manual"} />;
}
