"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProduct, deleteProduct } from "@/app/actions/vendor";
import { INPUT_CLS } from "@/lib/ui";

type CategoryLite = { id: string; name: string; icon: string | null };
type ProductEditable = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  unit: string;
  categoryId: string;
  images: string[];
  isActive: boolean;
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
    stock: product?.stock?.toString() ?? "0",
    unit: product?.unit ?? "pcs",
    categoryId: product?.categoryId ?? "",
    images: product?.images ?? ([] as string[]),
    isActive: product?.isActive ?? true,
  });
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
      stock: Number(form.stock),
      unit: form.unit,
      categoryId: form.categoryId,
      images: form.images,
      isActive: form.isActive,
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
