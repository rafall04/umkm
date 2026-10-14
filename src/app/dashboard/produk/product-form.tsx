"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProduct, deleteProduct } from "@/app/actions/vendor";
import { INPUT_CLS } from "@/lib/ui";

type CategoryLite = { id: string; name: string; icon: string | null };
type VariantEditable = {
  id?: string;
  name: string;
  price: string; // "" = ikut harga produk
  stock: string;
  isActive: boolean;
};
type ProductEditable = {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  unit: string;
  categoryId: string;
  images: string[];
  isActive: boolean;
  variants?: { id: string; name: string; price: number | null; stock: number; isActive: boolean }[];
};

export function ProductForm({
  categories,
  product,
}: {
  categories: CategoryLite[];
  product?: ProductEditable;
}) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product?.price?.toString() ?? "",
    compareAtPrice: product?.compareAtPrice?.toString() ?? "",
    stock: product?.stock?.toString() ?? "0",
    unit: product?.unit ?? "pcs",
    categoryId: product?.categoryId ?? "",
    images: product?.images ?? ([] as string[]),
    isActive: product?.isActive ?? true,
  });
  const [variants, setVariants] = useState<VariantEditable[]>(
    product?.variants?.map((v) => ({
      id: v.id,
      name: v.name,
      price: v.price?.toString() ?? "",
      stock: v.stock.toString(),
      isActive: v.isActive,
    })) ?? [],
  );
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const inputCls = INPUT_CLS;

  async function uploadImage(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    setUploading(false);
    if (json.url) setForm((f) => ({ ...f, images: [...f.images, json.url] }));
    else setError(json.error ?? "Upload gagal");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await saveProduct({
      id: product?.id,
      name: form.name,
      description: form.description,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
      stock: Number(form.stock),
      unit: form.unit,
      categoryId: form.categoryId,
      images: form.images,
      isActive: form.isActive,
      variants: variants
        .filter((v) => v.name.trim())
        .map((v) => ({
          id: v.id,
          name: v.name.trim(),
          price: v.price.trim() ? Number(v.price) : null,
          stock: Number(v.stock) || 0,
          isActive: v.isActive,
        })),
    });
    if (!res.ok) {
      setError(res.error ?? "Gagal menyimpan");
      setLoading(false);
      return;
    }
    router.push("/dashboard/produk");
    router.refresh();
  }

  async function handleDelete() {
    if (!product || !confirm("Nonaktifkan produk ini?")) return;
    await deleteProduct(product.id);
    router.push("/dashboard/produk");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Nama Produk</label>
            <input required className={inputCls} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Deskripsi</label>
            <textarea required rows={4} className={inputCls} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Harga (Rp)</label>
            <input required type="number" min={0} className={inputCls} value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Harga Coret <span className="font-normal text-stone-400">(opsional, untuk diskon)</span>
            </label>
            <input type="number" min={0} className={inputCls} value={form.compareAtPrice}
              placeholder="Harga normal sebelum diskon"
              onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Stok</label>
              <input required type="number" min={0} className={inputCls} value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Satuan</label>
              <input required className={inputCls} value={form.unit} placeholder="pcs/kg/paket"
                onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Kategori</label>
            <select required className={inputCls} value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">— Pilih kategori —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Varian */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium">
            Varian <span className="font-normal text-stone-400">(rasa/ukuran/warna — opsional)</span>
          </label>
          <button
            type="button"
            onClick={() =>
              setVariants([...variants, { name: "", price: "", stock: "0", isActive: true }])
            }
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold hover:bg-stone-50"
          >
            + Tambah Varian
          </button>
        </div>
        {variants.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">
            Tanpa varian — pembeli langsung membeli produk ini.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {variants.map((v, i) => (
              <div key={v.id ?? i} className="flex flex-wrap items-center gap-2">
                <input
                  className={`${inputCls} flex-1 min-w-32`}
                  placeholder="Nama varian (mis. Pedas)"
                  value={v.name}
                  onChange={(e) =>
                    setVariants(variants.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                />
                <input
                  className={`${inputCls} w-28`}
                  type="number"
                  min={0}
                  placeholder="Harga*"
                  title="Kosongkan untuk ikut harga produk"
                  value={v.price}
                  onChange={(e) =>
                    setVariants(variants.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))
                  }
                />
                <input
                  className={`${inputCls} w-20`}
                  type="number"
                  min={0}
                  placeholder="Stok"
                  title="Stok varian"
                  value={v.stock}
                  onChange={(e) =>
                    setVariants(variants.map((x, j) => (j === i ? { ...x, stock: e.target.value } : x)))
                  }
                />
                <button
                  type="button"
                  onClick={() => setVariants(variants.filter((_, j) => j !== i))}
                  className="rounded-lg px-2 py-2 text-stone-400 hover:text-red-600"
                  aria-label="Hapus varian"
                >
                  ✕
                </button>
              </div>
            ))}
            <p className="text-xs text-stone-400">
              *Kosongkan harga untuk mengikuti harga produk. Stok dihitung per varian.
            </p>
          </div>
        )}
      </div>

      {/* Foto */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <label className="mb-2 block text-sm font-medium">Foto Produk (maks. 5)</label>
        <div className="flex flex-wrap gap-3">
          {form.images.map((url, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-20 w-20 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, images: form.images.filter((_, j) => j !== i) })
                }
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white"
              >
                ✕
              </button>
            </div>
          ))}
          {form.images.length < 5 && (
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-stone-300 text-stone-400 hover:border-brand-400">
              {uploading ? "..." : "+"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
              />
            </label>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            placeholder="atau tempel URL gambar..."
            className={`${inputCls} text-xs`}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              if (imageUrl.trim()) {
                setForm({ ...form, images: [...form.images, imageUrl.trim()] });
                setImageUrl("");
              }
            }}
            className="shrink-0 rounded-xl border border-stone-300 px-4 text-sm font-medium hover:bg-stone-50"
          >
            Tambah
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 accent-brand-600"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        />
        Tampilkan produk di katalog
      </label>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex gap-3">
        <button
          disabled={loading}
          className="rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Simpan Produk"}
        </button>
        {product && (
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Nonaktifkan
          </button>
        )}
      </div>
    </form>
  );
}
