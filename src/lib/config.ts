/**
 * Konfigurasi publik — satu sumber kebenaran untuk server & client.
 * NEXT_PUBLIC_* di-inline saat build sehingga aman dipakai di komponen client.
 */
export const FLAT_SHIPPING_FEE = Number(
  process.env.NEXT_PUBLIC_FLAT_SHIPPING_FEE ?? 5000,
);
