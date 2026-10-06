# Audit Proyek — Pasar UMKM (2026-10-06)

Verdict: **fondasi sehat, siap staging; perlu perbaikan sebelum produksi penuh.**
Lint bersih · `next build` sukses · smoke test live (login guard, callback, upload, traversal, lacak) semua lolos.

## Skor UI

| Kategori            | Skor | Catatan |
|---------------------|------|---------|
| Visual hierarchy    | 8/10 | Konsisten, jelas; heading bisa `tracking-tight` |
| Typography          | 7/10 | Plus Jakarta Sans; label form sering hanya placeholder |
| Depth & layering    | 7/10 | Card + border + shadow konsisten |
| Interactive states  | 6/10 | Hover ada; `focus-visible` ring absen di banyak tombol |
| Responsiveness      | 8/10 | Grid collapse rapi; side-nav scroll horizontal di mobile |
| Accessibility       | 6/10 | aria-label mayoritas ada; input tanpa `<label>`; `<details>` user-menu tak tertutup klik luar |
| Motion              | 7/10 | Transisi halus & terukur; `prefers-reduced-motion` belum dihormati |

## 🔴 Blocker

1. **Bukan git repository** — tidak ada version control. `.pgdata/` (data Postgres binary) juga belum ada di `.gitignore` — `git init` sekarang akan meng-commit data DB. Fix: tambahkan `.pgdata/` ke `.gitignore`, lalu `git init` + commit baseline.
2. **Stored XSS via JSON-LD** — `dangerouslySetInnerHTML` + `JSON.stringify` tidak escape `<`. Nama/deskripsi vendor berisi `</script><script>…` keluar dari tag. Fix: `.replace(/</g, "\\u003c")`. Lokasi: `(site)/[desa]/page.tsx`, `[desa]/produk/[slug]/page.tsx`, `[desa]/umkm/[slug]/page.tsx`, `[desa]/kategori/[slug]/page.tsx`.
3. **Callback iPaymu bisa dipalsukan** — `ipaymu.ts` fallback `json?.Data?.StatusCode ?? body.status_code`: jika API check gagal, status dipercaya dari body request tak terverifikasi → order bisa ditandai PAID via POST palsu. Fix: tanpa fallback — gagal API = tolak. (Hanya aktif bila `PAYMENT_GATEWAY=ipaymu`.)
4. **Stok bisa dikembalikan dua kali** — (a) `cancelOrder` cek status di luar transaksi, update unconditional → dua cancel bersamaan = restore 2×. (b) `updateOrderItemStatus` tak cek status order induk — item pada order CANCELLED/EXPIRED masih bisa DIBATALKAN → restore lagi. Fix: guard `updateMany` berkondisi status di dalam tx + tolak item pada order terminal.

## 🟡 Perlu dipertimbangkan

5. **`adminVillageFilter` fail-open** — ADMIN_DESA dengan `villageId: null` mendapat scope global (Prisma mengabaikan `villageId: undefined`). Ubah ke fail-closed.
6. **Order TRANSFER PENDING tak pernah expired** — `expiredAt` hanya diisi gateway; stok pesanan yang ditinggal tersangkut selamanya. Set `expiredAt` untuk TRANSFER + sweep/check.
7. **Ongkir hardcode `5000` di `checkout-form.tsx`** vs `NEXT_PUBLIC_FLAT_SHIPPING_FEE` di server — ganti env = UI bohong. Baca env yang sama (NEXT_PUBLIC inline saat build) atau kirim via props.
8. **Hydration mismatch `/checkout`** — `checkout-form.tsx` pakai `useCart()` tanpa `useMounted()` (halaman keranjang sudah benar). SSR kosong vs client terisi → mismatch.
9. **No. HP lacak exact-match** — `0812…` saat checkout vs `62812…` saat lacak = "tidak ditemukan". Normalisasi kedua sisi.
10. **Desa nonaktif tetap hidup** — `getVillageBySlug` tak filter `isActive`; `/produk` global & `placeOrder` tak cek `village.isActive`. Toggle admin hanya menyembunyikan dari nav — produk tetap bisa dibeli.
11. **Sesi tak tercabut** — `isActive=false`/ganti role baru efektif setelah JWT (~30 hari) kedaluwarsa. Pertimbangkan cek `isActive` berkala di callback session.
12. **Tanpa rate limit** — login/register/lacak terbuka untuk brute force. Kombinasi kredensial seed default `admin123` + email admin dapat ditebak = wajib rate limit (nginx `limit_req_zone` paling murah) + ganti password pasca-deploy.
13. **Timezone** — `formatDate*` pakai TZ server (UTC di VPS) → jam pesanan mundur 7 jam dari WIB. Set `timeZone: "Asia/Jakarta"` atau `TZ` di env.
14. **Postgres terekspos publik** — `docker-compose.yml` `ports: "5432:5432"` bind 0.0.0.0 dengan password default `postgres`. Di server produksi ubah ke `127.0.0.1:5432:5432`.
15. **Security headers absen** — tidak ada CSP/X-Frame-Options/Referrer-Policy/HSTS di next.config maupun nginx.conf.
16. **Slug wilayah bisa tabrakan route** — `saveVillage` tak blacklist slug `produk`, `admin`, `api`, `uploads`, `pesanan`, `checkout`, `login`, `offline`, `dashboard`, `daftar*` → hub wilayah tak terjangkau.
17. **`npm audit`: 9 high, semua tidak reachable** — braces/micromatch (eslint-config-next), deepmerge-ts (@prisma/config), mysql2 (CLI prisma; app pakai Postgres, tak pernah di-load). Jangan `audit fix --force` (akan downgrade eslint-config-next & prisma secara breaking). Pantau rilis berikutnya atau pakai `overrides` untuk braces.

## 🟢 Hygiene / jangka panjang

- `inputCls` diduplikasi di 6 file + label DELIVERY duplikat dengan `DELIVERY_LABEL` + `OUTLINE` duplikat `COLORS` → ekstrak `src/lib/ui.ts` atau komponen `Input`/`EmptyState` bersama.
- File upload yatim: bukti ditolak/diganti tak menghapus file lama di `uploads/`.
- Nol test. Prioritas: invariant stok di `placeOrder`/`cancelOrder`, verifikasi signature gateway, `slugify`.
- `@auth/prisma-adapter` terinstall tak dipakai — hapus.
- Tidak ada `DESIGN.md` — token (brand #2a733e, accent amber, stone, Plus Jakarta Sans) hidup di `globals.css` tapi tak terdokumentasi.
- `robots.ts`: tambahkan `/pesanan` (dan opsional `/uploads`) ke disallow.
- `apple-touch-icon.png` ada di `/icons/` tapi tak pernah di-link — iOS mencarinya di root.
- Query list tanpa pagination: `/produk`, `/[desa]/produk` render semua; admin dibatasi 100/200. Siapkan cursor pagination sebelum data besar.
- `orderCode` pakai `Math.random` tanpa retry pada collision; `registerBuyer/registerVendor` race pada unique constraint → 500 tak tertangani.
- `views` naik juga saat prefetch Link; `InstallPrompt` dismiss tak persisten antar kunjungan.
- `NEXT_PUBLIC_FLAT_SHIPPING_FEE`, `SEED_ADMIN_PASSWORD` tak ada di `env.example` — dokumentasi drift.
- `dev-db.mjs` berguna tapi tak ada di README/package scripts (`"db:dev": "node scripts/dev-db.mjs"`).
- `images.remotePatterns` mengizinkan http+https `**` — batasi ke https.
- Tidak ada `engines`/`ci` — tambahkan `"engines": { "node": ">=20" }` + GitHub Actions (lint+build).
- `/keranjang` client page → tak punya `metadata` (pakai default title).
- DEPLOY/README/AGENTS konsisten dan akurat; struktur folder sudah idiom App Router (route group `(site)/(auth)`, colocated client components, `actions/` terpisah, adapter gateway di `lib/payments`).

## Yang sudah benar (jangan diubah)

- Harga/stok selalu diambil ulang dari DB saat checkout; decrement stok atomik `stock >= qty`.
- Callback gateway idempotent untuk restore stok (guard `alreadyRestored`); signature Tripay `timingSafeEqual`; iPaymu cross-check ke API.
- Keranjang 1-toko ditegakkan di client (dengan konfirmasi) dan server.
- Upload: whitelist MIME+ext, batas 3MB, nama nanoid, traversal ditolak, disajikan via route (bukan public/).
- Otorisasi server-side di semua action: vendor↔item, ADMIN_DESA↔wilayah, SUPERADMIN-only untuk desa/pengguna.
- Soft-delete produk menjaga riwayat order; snapshot harga/nama di OrderItem.
- `proxy.ts` = konvensi Next.js 16 yang benar (middleware→proxy); matcher tepat (hanya /dashboard & /admin).
- `force-dynamic` konsisten di semua halaman DB; `params`/`searchParams` selalu di-await.
- PWA: manifest lengkap (192+512+maskable, shortcuts), SW network-first untuk navigasi + SWR gambar + cache-first aset, offline page, SW hanya produksi.
- SEO: metadata per halaman, JSON-LD, sitemap dinamis, robots, canonical village.
