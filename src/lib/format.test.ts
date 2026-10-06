import { describe, it, expect } from "vitest";
import {
  safeJsonLd,
  normalizePhone,
  slugify,
  orderCode,
  rupiah,
} from "@/lib/format";

describe("safeJsonLd", () => {
  it("menghasilkan JSON valid yang bisa di-parse ulang", () => {
    const data = { name: "Keripik Singkong", price: 15000 };
    expect(JSON.parse(safeJsonLd(data))).toEqual(data);
  });

  it("menetralisir </script> agar tidak menutup tag (XSS)", () => {
    const out = safeJsonLd({ name: '</script><script>alert("x")</script>' });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
    // tetap JSON valid setelah parse
    expect(JSON.parse(out).name).toBe('</script><script>alert("x")</script>');
  });

  it("escape semua karakter < di nested object", () => {
    const out = safeJsonLd({ a: { b: ["<img>", "<svg>"] } });
    expect(out).not.toContain("<");
  });
});

describe("normalizePhone", () => {
  it("08xx → 62xx", () => {
    expect(normalizePhone("081234567890")).toBe("6281234567890");
  });
  it("+62 dan spasi/dash dibersihkan", () => {
    expect(normalizePhone("+62 812-3456-7890")).toBe("6281234567890");
  });
  it("62xx dibiarkan", () => {
    expect(normalizePhone("6281234567890")).toBe("6281234567890");
  });
  it("dua format setara menghasilkan string sama", () => {
    expect(normalizePhone("0812-345-6789")).toBe(normalizePhone("+628123456789"));
  });
});

describe("slugify", () => {
  it("huruf kecil + dash", () => {
    expect(slugify("Keripik Singkong Pedas!")).toBe("keripik-singkong-pedas");
  });
  it("aksen dihilangkan", () => {
    expect(slugify("Café Latté")).toBe("cafe-latte");
  });
});

describe("orderCode", () => {
  it("format ORD-YYYYMMDD-XXXXX", () => {
    expect(orderCode()).toMatch(/^ORD-\d{8}-[A-Z0-9]{5}$/);
  });
});

describe("rupiah", () => {
  it("format ribuan id-ID", () => {
    expect(rupiah(15000)).toMatch(/^Rp15\.000$/);
  });
});
