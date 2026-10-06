/**
 * Generator icon PWA sederhana — PNG murni tanpa dependency.
 * Menghasilkan: icon-192.png, icon-512.png, icon-512-maskable.png
 * Desain: latar hijau brand + lingkaran putih + titik hijau (logo pasar).
 * Ganti dengan logo resmi desa jika tersedia.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function writePng(size, draw) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 3 + 1);
    raw[rowStart] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = draw(x / size, y / size);
      const i = rowStart + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const GREEN = [42, 115, 62]; // brand-600
const GREEN_DARK = [30, 74, 44];
const WHITE = [255, 255, 255];

// Normal icon: rounded square + circle + dot
function icon(x, y, radius) {
  // rounded corners
  const r = 0.18;
  const inCorner =
    (x < r && y < r && Math.hypot(x - r, y - r) > r) ||
    (x > 1 - r && y < r && Math.hypot(x - (1 - r), y - r) > r) ||
    (x < r && y > 1 - r && Math.hypot(x - r, y - (1 - r)) > r) ||
    (x > 1 - r && y > 1 - r && Math.hypot(x - (1 - r), y - (1 - r)) > r);
  if (inCorner) return [0, 0, 0]; // transparan tidak didukung — pakai putih
  const d = Math.hypot(x - 0.5, y - 0.5);
  if (d < radius * 0.45) return GREEN_DARK;
  if (d < radius) return WHITE;
  return GREEN;
}

// Maskable: full-bleed (safe zone di tengah)
function maskable(x, y) {
  const d = Math.hypot(x - 0.5, y - 0.5);
  if (d < 0.2) return GREEN_DARK;
  if (d < 0.32) return WHITE;
  return GREEN;
}

const icon192 = writePng(192, (x, y) => {
  const px = icon(x, y, 0.3);
  return px[0] === 0 && px[1] === 0 && px[2] === 0 &&
    // sudut terpangkas → putih (bukan transparan)
    !(
      (x > 0.18 || (x < 0.18 && y > 0.18)) &&
      (x < 0.82 || (x > 0.82 && y > 0.18)) &&
      (y < 0.82 || (y > 0.82 && x > 0.18))
    )
    ? [250, 250, 249]
    : px;
});

writeFileSync(join(outDir, "icon-192.png"), icon192);
writeFileSync(join(outDir, "icon-512.png"), writePng(512, (x, y) => icon(x, y, 0.3)));
writeFileSync(join(outDir, "icon-512-maskable.png"), writePng(512, maskable));
writeFileSync(join(outDir, "apple-touch-icon.png"), writePng(180, (x, y) => icon(x, y, 0.3)));

console.log("Icons generated to public/icons/");
