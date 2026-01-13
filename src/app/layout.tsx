import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Audio Convertor - Professional Audio Converter",
  description: "Modern, powerful and easy-to-use audio file conversion tool. MP3, WAV, FLAC, OGG and more format support.",
  keywords: ["audio converter", "ses dönüştürücü", "mp3 converter", "wav converter", "audio tool"],
  authors: [{ name: "Audio Convertor" }],
  openGraph: {
    title: "Audio Convertor - Professional Audio Converter",
    description: "Modern audio file conversion tool",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased bg-zinc-950`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
