import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SwRegister } from "@/components/sw-register";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Pasar UMKM Bojonegoro",
    template: "%s | Pasar UMKM",
  },
  description:
    "Marketplace produk UMKM se-Kabupaten Bojonegoro. Belanja langsung dari pelaku usaha lokal di wilayah Anda.",
  keywords: [
    "UMKM Dander",
    "UMKM Tanjungharjo",
    "UMKM Bojonegoro",
    "produk UMKM",
    "oleh-oleh Bojonegoro",
    "pasar UMKM online",
  ],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Pasar UMKM",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2a733e",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${jakarta.variable} antialiased`}>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
