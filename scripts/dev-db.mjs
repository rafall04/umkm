/**
 * Postgres embedded untuk development/verifikasi lokal (tanpa Docker).
 * Jalankan: node scripts/dev-db.mjs  — biarkan proses hidup selama dev.
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dataDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".pgdata",
);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port: 5432,
  persistent: true,
});

// initdb hanya saat cluster belum ada — .pgdata berisi data persistent
if (!existsSync(join(dataDir, "PG_VERSION"))) {
  await pg.initialise();
}
await pg.start();

// Buat database app jika belum ada
try {
  await pg.createDatabase("umkm_desa");
} catch {
  // sudah ada — abaikan
}

console.log("PostgreSQL embedded berjalan di :5432 (db: umkm_desa)");
console.log("Data dir:", dataDir);
console.log("Ctrl+C untuk berhenti");

process.on("SIGINT", async () => {
  await pg.stop();
  process.exit(0);
});

// keep alive
await new Promise(() => {});
