import type { Metadata } from "next";
import { Geist, Geist_Mono, Coiny } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const coiny = Coiny({
  variable: "--font-coiny",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Ghost Setup Finder",
  description: "AI-powered product discovery with a friendly ghost guide",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${coiny.variable} antialiased`}
      >
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
