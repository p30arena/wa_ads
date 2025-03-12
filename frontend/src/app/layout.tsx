import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "WhatsApp Ads Software",
  description: "Professional WhatsApp advertising platform for managing and sending ads to contacts, groups, and non-contacts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="h-full bg-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
