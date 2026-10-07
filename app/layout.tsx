import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { getBrand } from "@/lib/config/brand";
import { googleFontsStylesheet } from "@/lib/fonts/studyFonts";

const brand = getBrand();

export const metadata: Metadata = {
  title: brand.displayName,
  description: brand.displayName,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={googleFontsStylesheet} rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
