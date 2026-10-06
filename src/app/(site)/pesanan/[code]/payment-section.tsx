"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitPaymentProof } from "@/app/actions/payment";
import { rupiah, waLink } from "@/lib/format";

type Props = {
  orderCode: string;
  phone: string;
  total: number;
  vendorName: string;
  vendorWhatsapp: string | null;
  qrisImage: string | null;
  paymentProof: string | null;
  awaitingConfirmation: boolean;
};

export function PaymentSection(props: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(!props.awaitingConfirmation);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(file: File) {
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await submitPaymentProof(props.orderCode, props.phone, fd);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    router.refresh();
  }

  // Bukti sudah diupload → tunggu konfirmasi penjual
  if (props.awaitingConfirmation && !showUpload) {
    return (
      <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <p className="font-semibold text-sky-900">Bukti pembayaran terkirim ✓</p>
        <p className="mt-1 text-sm text-sky-800">
          Penjual sedang memeriksa pembayaran Anda. Status akan berubah menjadi
          Lunas setelah dikonfirmasi.
        </p>
        {props.paymentProof && (
          <a href={props.paymentProof} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={props.paymentProof}
              alt="Bukti pembayaran"
              className="h-28 rounded-xl border border-sky-200 bg-white object-cover"
            />
          </a>
        )}
        <div className="mt-3">
          <button
            onClick={() => setShowUpload(true)}
            className="text-xs font-medium text-sky-700 underline hover:text-sky-900"
          >
            Upload ulang bukti
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-5">
      <p className="font-semibold">Bayar ke {props.vendorName}</p>
      <p className="mt-1 text-sm text-stone-600">
        Total <strong>{rupiah(props.total)}</strong> — dibayar langsung ke
        rekening penjual, tanpa perantara.
      </p>

      {props.qrisImage ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={props.qrisImage}
            alt={`QRIS ${props.vendorName}`}
            className="max-h-72 w-auto max-w-full object-contain"
          />
          <p className="text-xs text-stone-500">
            Scan dengan aplikasi apa pun (GoPay, OVO, DANA, m-banking)
          </p>
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-white p-4 text-sm text-stone-600">
          Penjual belum mengunggah QRIS.{" "}
          {props.vendorWhatsapp && (
            <>
              Hubungi penjual via{" "}
              <a
                href={waLink(
                  props.vendorWhatsapp,
                  `Halo ${props.vendorName}, saya mau bayar pesanan ${props.orderCode}`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-green-700 underline"
              >
                WhatsApp
              </a>{" "}
              untuk info pembayaran.
            </>
          )}
        </p>
      )}

      <div className="mt-4">
        <p className="text-sm font-medium">Sudah bayar? Upload bukti:</p>
        <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-white px-4 py-3 text-sm font-semibold text-brand-700 hover:border-brand-500">
          {loading ? "Mengunggah..." : "📷 Pilih Foto Bukti Bayar"}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            disabled={loading}
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </label>
        <p className="mt-1.5 text-xs text-stone-500">
          Screenshot mutasi / foto struk transfer. JPG/PNG/WebP, maks. 3MB.
        </p>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
