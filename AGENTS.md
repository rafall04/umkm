<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Pasar UMKM — Dander & Tanjungharjo

Marketplace multi-vendor untuk produk UMKM lokal (Kab. Bojonegoro). Next.js 16 (App Router + Turbopack) + TypeScript + PostgreSQL + Prisma 7 + NextAuth v5 + Tailwind v4 + PWA. Platform ini hanya perantara — pembayaran pembeli masuk langsung ke rekening/QRIS masing-masing toko (bukan ke desa/pengelola); keranjang dibatasi 1 toko per order. Jangan gunakan istilah "desa" pada teks UI (pakai "wilayah").

## Perintah utama

- `npm run dev` — dev server (butuh `DATABASE_URL` di `.env`)
- `npm run build` — `prisma generate` + `next build`
- `npx prisma migrate dev` / `npm run db:deploy` — migrasi
- `npm run db:seed` — seed 2 wilayah, kategori, admin, contoh UMKM
- `npm run icons` — regenerate icon PWA (scripts/gen-icons.mjs)
- Setup: `cp env.example .env` lalu isi env. DB via `docker compose up -d db`
- Deploy produksi: lihat `DEPLOY.md` (Ubuntu + PM2 + Nginx)

## Peran pengguna (enum Role)

`SUPERADMIN` (semua wilayah) · `ADMIN_DESA` (scope `villageId`) · `VENDOR` (pemilik toko, `vendor.ownerId`) · `BUYER`.

## Struktur

- `prisma/schema.prisma` — Village, User, Vendor, Category, Product, Order/OrderItem, PaymentLog. Generated client → `src/generated/prisma` (gitignored; import dari `@/generated/prisma/client` + `@/generated/prisma/enums`)
- `src/auth.ts`, `src/proxy.ts` — NextAuth Credentials + JWT; proxy guard `/dashboard` & `/admin`
- `src/lib/` — `db.ts` (PrismaPg adapter), `queries.ts`, `cart.ts` (zustand), `format.ts`, `session.ts`, `payments/` (interface + adapter `tripay.ts`, `ipaymu.ts`, `manual.ts`; pilih via env `PAYMENT_GATEWAY`)
- `src/app/(site)/` — halaman publik: `/`, `/produk`, `/[desa]` (hub), `/[desa]/produk|umkm|kategori`, `/keranjang`, `/checkout`, `/pesanan/[code]`
- `src/app/(auth)/` — `login`, `daftar`, `daftar-umkm`
- `src/app/dashboard/` — vendor: produk CRUD, pesanan masuk, profil toko
- `src/app/admin/` — admin: verifikasi UMKM, pesanan, pengguna & wilayah (SUPERADMIN)
- `src/app/api/` — `auth/[...nextauth]`, `payments/callback/[gateway]` (verifikasi signature → update order), `upload` (foto → `./uploads`, max 3MB; disajikan via `src/app/uploads/[...path]` karena `next start` tidak menyajikan file baru di `public/`)
- `src/app/actions/` — server actions: `checkout.ts`, `auth.ts`, `vendor.ts`, `admin.ts`, `payment.ts` (bukti bayar QRIS/transfer → approve/tolak oleh toko)

## Konvensi penting

- Semua halaman yang query DB pakai `export const dynamic = "force-dynamic"` (DB tidak ada saat build)
- params/searchParams adalah `Promise` — selalu `await`
- Struktur URL wilayah = subfolder (`/{slug}`) — konsolidasi SEO; wilayah baru ditambah lewat `/admin/desa`
- Keranjang maksimal 1 toko per order (pembayaran per toko) — ditegakkan di `cart.ts` + `placeOrder`; order `TRANSFER` wajib `paymentStatus=PAID` (approve bukti oleh toko) sebelum item bisa diproses
- Harga selalu `Int` rupiah; **harga & stok selalu diambil ulang dari DB saat checkout** (jangan percaya client)
- Pembatalan/gagal/expired order mengembalikan stok (lihat `placeOrder`, `cancelOrder`, callback route)
- Bahasa UI: Indonesia. Status enum pakai label dari `src/lib/format.ts`
