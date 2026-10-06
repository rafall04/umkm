import { describe, it, expect } from "vitest";
import { RESERVED_SLUGS } from "@/lib/slugs";

describe("RESERVED_SLUGS", () => {
  it("memblokir route statis tingkat atas", () => {
    for (const slug of ["admin", "api", "dashboard", "produk", "checkout", "login"]) {
      expect(RESERVED_SLUGS.has(slug)).toBe(true);
    }
  });

  it("tidak memblokir nama wilayah sah", () => {
    for (const slug of ["dander", "tanjungharjo", "sumberagung"]) {
      expect(RESERVED_SLUGS.has(slug)).toBe(false);
    }
  });
});
