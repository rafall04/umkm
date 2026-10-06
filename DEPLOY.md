# Deploy ke Ubuntu Server

Panduan production deploy untuk **Ubuntu 20.04+** dengan Node.js + PM2 + Nginx + PostgreSQL.

## 1. Prasyarat di server

```bash
# Node.js 20+ (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx

# PostgreSQL — pilih salah satu:

# Opsi A: Docker (disarankan — sudah ada docker-compose.yml)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # logout-login lagi
docker compose up -d db

# Opsi B: PostgreSQL native
sudo apt install -y postgresql
sudo -u postgres psql -c "CREATE DATABASE umkm_desa;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password-kuat-anda';"

# PM2 (process manager)
sudo npm install -g pm2
```

## 2. Setup aplikasi

```bash
git clone <repo-anda> /var/www/umkm-desa
cd /var/www/umkm-desa

cp env.example .env
nano .env   # isi: DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_APP_URL,
            # PAYMENT_GATEWAY, kredensial Tripay/iPaymu

npm ci
npx prisma migrate deploy   # buat tabel
npx prisma db seed          # data awal (2 wilayah + admin + contoh)
npm run build
```

## 3. Jalankan dengan PM2

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup          # ikuti perintah yang muncul agar auto-start saat reboot
```

## 4. Nginx reverse proxy

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/umkm-desa
sudo nano /etc/nginx/sites-available/umkm-desa   # ganti server_name
sudo ln -s /etc/nginx/sites-available/umkm-desa /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 5. HTTPS (wajib untuk PWA + payment callback)

```bash
sudo certbot --nginx -d domain-anda.com
```

## 6. Callback payment gateway

Daftarkan URL callback di dashboard gateway:

| Gateway | URL callback |
|---------|--------------|
| Tripay  | `https://domain-anda.com/api/payments/callback/tripay` |
| iPaymu  | `https://domain-anda.com/api/payments/callback/ipaymu` |

Set `PAYMENT_GATEWAY=tripay` atau `ipaymu` di `.env`.

## Update aplikasi

```bash
cd /var/www/umkm-desa
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 restart umkm-desa
```

## Akun default (GANTI SETELAH LOGIN PERTAMA)

| Peran | Login | Password |
|-------|-------|----------|
| Superadmin | `admin@umkm.local` | dari `SEED_ADMIN_PASSWORD` (default `admin123`) |
| Admin Dander | `admin.dander@umkm.local` | sama |
| Admin Tanjungharjo | `admin.tanjungharjo@umkm.local` | sama |
| Vendor contoh | `makiis@umkm.local`, `anyaman@umkm.local` | sama |

## Arsitektur runtime

```
Internet ──► Nginx (80/443, TLS) ──► Next.js :3000 (PM2) ──► PostgreSQL :5432
                                       │
                                       ├── /api/payments/callback/{tripay|ipaymu}
                                       ├── ./uploads → /uploads/*  (foto produk, disajikan route handler)
                                       └── /sw.js (PWA service worker)
```

## Catatan

- **Backup**: `pg_dump umkm_desa > backup-$(date +%F).sql` (jadwalkan via cron). Folder `uploads/` (foto produk) juga ikut dibackup — ditulis di luar `public/` karena `next start` tidak menyajikan file baru di `public/` tanpa rebuild.
- **Log**: `pm2 logs umkm-desa`
- **Monitoring**: `pm2 monit` atau `pm2 install pm2-logrotate`
