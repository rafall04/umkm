import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// Menyajikan file hasil upload vendor. File ditulis ke ./uploads/ (bukan
// public/) karena `next start` hanya menyajikan snapshot public/ saat build —
// file baru di public/ tidak akan tersaji tanpa rebuild.

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: segs } = await ctx.params;
  const filename = segs.at(-1) ?? "";

  // Hanya nama file tunggal yang aman — tolak subfolder & traversal
  const safe = /^[\w-]+\.(jpg|jpeg|png|webp|avif)$/i.test(filename);
  if (segs.length !== 1 || !safe) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const buf = await readFile(path.join(process.cwd(), "uploads", filename));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[filename.split(".").pop()!.toLowerCase()],
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
