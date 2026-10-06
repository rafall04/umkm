import { manual } from "./manual";
import { tripay } from "./tripay";
import { ipaymu } from "./ipaymu";
import type { PaymentGateway } from "./types";

export type { PaymentGateway } from "./types";

const gateways: Record<string, PaymentGateway> = {
  tripay,
  ipaymu,
  manual,
};

export function getGateway(name?: string): PaymentGateway {
  const key = (name ?? process.env.PAYMENT_GATEWAY ?? "manual").toLowerCase();
  return gateways[key] ?? manual;
}

export function getGatewayByName(name: string): PaymentGateway | null {
  return gateways[name.toLowerCase()] ?? null;
}
