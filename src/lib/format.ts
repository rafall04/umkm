export function rupiah(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}

/**
 * JSON.stringify yang aman untuk ditanam di <script type="application/ld+json">.
 * JSON.stringify tidak meng-escape `<`, sehingga teks berisi "</script>" dapat
 * menutup tag script (stored XSS). Escape ke <.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Normalisasi nomor HP/WA Indonesia → "62xxx" untuk perbandingan & wa.me */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^0/, "62");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Bisnis berjalan di WIB — kunci timeZone agar tidak bergantung TZ server
// (VPS default UTC → jam pesanan akan mundur 7 jam).
const TZ = "Asia/Jakarta";

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });
}

export function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

export function orderCode(): string {
  const ymd = new Date()
    .toLocaleDateString("en-CA", { timeZone: TZ })
    .replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ORD-${ymd}-${rand}`;
}

export function waLink(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
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
