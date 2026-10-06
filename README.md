# Pasar UMKM Desa

Marketplace produk UMKM **Desa Dander** (Kec. Dander) dan **Desa Tanjungharjo** (Kec. Kapas), Kabupaten Bojonegoro — satu website, satu domain, desa dipisah via subfolder (`/dander`, `/tanjungharjo`).

**Stack:** Next.js 16 · TypeScript · PostgreSQL + Prisma 7 · NextAuth v5 · Tailwind v4 · PWA · Payment gateway Tripay/iPaymu + COD/transfer manual.

## Quick start

```bash
cp env.example .env          # isi DATABASE_URL, AUTH_SECRET, dll
docker compose up -d db      # PostgreSQL (atau pakai Postgres lokal)
npm install
npx prisma migrate dev       # buat tabel
npm run db:seed              # data awal: 2 desa, kategori, admin, contoh UMKM
npm run dev
```

Buka http://localhost:3000

## Fitur

- **Pembeli** — katalog per desa/kategori, keranjang, checkout (COD / transfer / QRIS-VA via gateway), lacak pesanan tanpa akun (kode + no HP)
- **Pemilik UMKM** — daftar toko → verifikasi admin → dashboard kelola produk & pesanan
- **Admin desa** — verifikasi UMKM desanya, konfirmasi pembayaran manual, pantau pesanan
- **Superadmin** — kelola desa (bisa tambah desa baru), pengguna, seluruh UMKM
- **SEO (programmatic)** — setiap desa/UMKM/produk/kategori punya halaman teroptimasi + JSON-LD + sitemap dinamis
- **PWA** — installable, offline fallback, cache produk untuk koneksi lambat

## Dokumentasi

- Struktur & konvensi kode: `AGENTS.md`
- Deploy ke Ubuntu Server (PM2 + Nginx + SSL): `DEPLOY.md`
