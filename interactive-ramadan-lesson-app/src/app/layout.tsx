import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "صَوْمُ رَمَضَانَ | مدرسة العروس الابتدائية",
  description:
    "رحلة تعليمية تفاعلية من 12 محطة لدرس صوم رمضان — الدراسات الإسلامية (التوحيد) للصف الثالث الابتدائي، مع لوحة متابعة للمعلم وشهادة بطل صوم رمضان.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Cairo:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-ramadan-cream font-cairo text-slate-800 antialiased">{children}</body>
    </html>
  );
}
