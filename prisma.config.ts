import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Fallback agar `prisma generate` tetap jalan tanpa .env (mis. saat CI build).
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder",
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
