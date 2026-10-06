import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

const MAX_SIZE = 3 * 1024 * 1024; // 3MB — foto produk/QRIS toko
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !["VENDOR", "ADMIN_DESA", "SUPERADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Tidak berwenang" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Format harus JPG/PNG/WebP" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Ukuran maksimal 3MB" }, { status: 400 });
  }

  const filename = `${nanoid(12)}.${ext}`;
  // Ditulis di luar public/ — `next start` tidak menyajikan file baru di public/.
  // Disajikan lewat src/app/uploads/[...path]/route.ts
  const uploadDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/${filename}` });
}
