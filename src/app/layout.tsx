import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AudioForge - Professional Audio Converter",
  description: "Modern, güçlü ve kullanımı kolay ses dosyası dönüştürme aracı. MP3, WAV, FLAC, OGG ve daha fazla format desteği.",
  keywords: ["audio converter", "ses dönüştürücü", "mp3 converter", "wav converter", "audio tool"],
  authors: [{ name: "AudioForge" }],
  openGraph: {
    title: "AudioForge - Professional Audio Converter",
    description: "Modern ses dosyası dönüştürme aracı",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body className={`${inter.variable} antialiased bg-zinc-950`}>
        {children}
      </body>
    </html>
  );
}
