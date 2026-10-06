# Design System — Pasar UMKM

Sistem visual aplikasi. Satu sumber kebenaran untuk token, komponen, dan
konvensi UI. Bahasa UI: **Indonesia**.

## Prinsip

- **Lokal & hangat** — pasar rakyat, bukan SaaS enterprise. Warna hijau
  "pasar"/hasil bumi + amber sebagai aksen status, netral warm-stone.
- **Mobile-first** — mayoritas pengguna lewat HP koneksi lambat; grid 2 kolom
  di mobile, PWA installable.
- **Hormati `prefers-reduced-motion`** — tidak ada animasi wajib; animasi
  yang ada hanya dekoratif (`animate-pulse` pada skeleton).

## Token (`src/app/globals.css` — Tailwind v4 `@theme`)

| Token | Pakai untuk |
|---|---|
| `brand-50..950` (hijau) | CTA utama, link aktif, badge brand, fokus |
| `accent-400..600` (amber) | highlight promo — jangan dipakai untuk status |
| `stone-*` | teks, border, background netral (warm) |
| `--font-jakarta` | semua teks (Plus Jakarta Sans via `next/font`) |

Status badge menggunakan palet tetap di `StatusBadge`
(`src/components/status-badge.tsx`) — **jangan** membuat warna status baru
di tempat lain.

## Komponen bersama

| Komponen / konstanta | Lokasi | Catatan |
|---|---|---|
| `INPUT_CLS` | `src/lib/ui.ts` | satu-satunya kelas input — jangan duplikat string |
| `StatusBadge` | `src/components/status-badge.tsx` | variant `solid`/`outline`; tambah status di map, bukan inline |
| `ProductCard` | `src/components/product-card.tsx` | kartu produk standar grid |
| `SearchBar` | `src/components/search-bar.tsx` | form GET ke `?q=` |
| `InstallPrompt` | `src/components/install-prompt.tsx` | PWA prompt, hormati dismiss |
| Label status | `src/lib/format.ts` | `ORDER_STATUS_LABEL`, `PAYMENT_STATUS_LABEL`, `VENDOR_STATUS_LABEL`, `DELIVERY_LABEL` |

## Pola tampilan

- Kartu: `rounded-2xl border border-stone-200 bg-white p-5` (mobile) /
  `rounded-3xl … shadow-sm` untuk panel auth.
- Tombol primer: `rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700
  disabled:opacity-50` — selalu sertakan state `disabled` & `hover`.
- Tombol bahaya: `text-red-600 hover:bg-red-50`.
- Fokus input: `focus:border-brand-500 focus:ring-2 focus:ring-brand-100`.
- Empty state: emoji besar + judul + sub-teks + CTA (lihat keranjang kosong).
- Skeleton: `animate-pulse rounded-2xl bg-stone-100` — dipakai juga untuk
  guard hydration pada komponen yang membaca `localStorage`.

## Aksesibilitas

- Input **wajib** `aria-label` (atau `<label>`) — placeholder bukan pengganti.
- `type="tel"` untuk nomor HP, `type="search"` untuk pencarian.
- Emoji dekoratif dipakai di empty state — pastikan teks tetap berdiri sendiri.
- Kontras: teks pada `brand-600` selalu `text-white`; status badge memakai
  pasangan `bg-*-100`/`text-*-800` yang sudah lolos kontras.

## Istilah

- Pakai **"wilayah"** bukan "desa" di teks UI (route `[desa]` hanya nama teknis).
- Status selalu lewat label di `format.ts` — jangan hardcode string status.
- Harga: `rupiah()` dari `format.ts`; tanggal `formatDate`/`formatDateTime`
  (terkunci `Asia/Jakarta`).
