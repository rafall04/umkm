export function rupiah(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function orderCode(): string {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ORD-${ymd}-${rand}`;
}

export function waLink(phone: string, message: string): string {
  const normalized = phone.replace(/\D/g, "").replace(/^0/, "62");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu Pembayaran",
  PAID: "Sudah Dibayar",
  PROCESSING: "Diproses",
  DELIVERED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "Belum Bayar",
  PENDING: "Menunggu Konfirmasi",
  PAID: "Lunas",
  FAILED: "Gagal",
  EXPIRED: "Kedaluwarsa",
  REFUNDED: "Dana Dikembalikan",
};

export const VENDOR_STATUS_LABEL: Record<string, string> = {
  MENUNGGU: "Menunggu",
  DIPROSES: "Diproses",
  DIKIRIM: "Dikirim",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

export const DELIVERY_LABEL: Record<string, string> = {
  COD: "Bayar di Tempat (COD)",
  ANTAR_DESA: "Antar ke Rumah",
  AMBIL_SENDIRI: "Ambil Sendiri",
};
