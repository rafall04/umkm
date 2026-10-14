"use client";

import { useRef, useState } from "react";

// Cetak struk tanpa pindah halaman / tab baru: muat halaman struk di iframe
// tersembunyi lalu panggil print() pada konteksnya — browser mencetak iframe
// saja. Fallback ke window.open bila print iframe tidak didukung.
export function PrintReceiptButton({
  code,
  size = "58",
  className,
  children = "🖨️ Cetak struk",
}: {
  code: string;
  size?: "58" | "80";
  className?: string;
  children?: React.ReactNode;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loading, setLoading] = useState(false);

  function handlePrint() {
    const url = `/pesanan/${encodeURIComponent(code)}/struk?ukuran=${size}`;
    // Reuse iframe yang sudah ada agar klik berulang tidak menumpuk dokumen
    let iframe = iframeRef.current;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.title = "Struk pesanan";
      iframe.setAttribute(
        "style",
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden"
      );
      document.body.appendChild(iframe);
      iframeRef.current = iframe;
    }
    setLoading(true);
    iframe.onload = () => {
      setLoading(false);
      const win = iframe.contentWindow;
      if (win) {
        win.focus();
        win.print();
      } else {
        window.open(url, "_blank");
      }
    };
    iframe.src = url;
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      disabled={loading}
      className={className}
    >
      {loading ? "Menyiapkan…" : children}
    </button>
  );
}
