import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MangaHook - Discover Your Next Manga",
  description: "Browse and discover manga with advanced filtering and search",
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: "/hat.png",
    apple: "/hat.png",
  },
  openGraph: {
    title: "MangaHook - Discover Your Next Manga",
    description: "Browse and discover manga with advanced filtering and search",
    images: [
      {
        url: "/manga-logo.webp",
        width: 1200,
        height: 630,
        alt: "MangaHook Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MangaHook - Discover Your Next Manga",
    description: "Browse and discover manga with advanced filtering and search",
    images: ["/manga-logo.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider defaultTheme="dark" storageKey="manga-ui-theme">
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
