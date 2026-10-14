/**
 * Slug yang dilarang untuk nama wilayah — segmen dinamis /{slug} berada
 * di tingkat atas sehingga akan bertabrakan dengan route statis lain.
 */
export const RESERVED_SLUGS = new Set([
  "admin", "api", "dashboard", "produk", "pesanan", "keranjang", "checkout",
  "wilayah",
  "login", "daftar", "daftar-umkm", "offline", "uploads", "icons", "images",
  "robots.txt", "sitemap.xml", "manifest.webmanifest", "sw.js", "favicon.ico",
  "_next",
]);
