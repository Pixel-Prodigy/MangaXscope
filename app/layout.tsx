import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeProvider } from "@/components/theme-provider";
import { PWARegister } from "@/components/pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e5e5e5" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
  colorScheme: "dark light",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://mangahook.app"
  ),
  title: {
    default: "MangaHook - Discover Your Next Manga",
    template: "%s | MangaHook",
  },
  description:
    "Browse and discover manga with advanced filtering and search. Find your next favorite manga with powerful search tools, genre filters, and detailed information.",
  keywords: [
    "manga",
    "comics",
    "manga reader",
    "manga browser",
    "manga search",
    "manga discovery",
    "anime",
    "manga library",
  ],
  authors: [{ name: "MangaHook" }],
  creator: "MangaHook",
  publisher: "MangaHook",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/hat.png", sizes: "any" },
      { url: "/hat.png", sizes: "192x192", type: "image/png" },
      { url: "/hat.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/hat.png", sizes: "180x180", type: "image/png" },
      { url: "/hat.png", sizes: "192x192", type: "image/png" },
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/hat.png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MangaHook",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "MangaHook",
    title: "MangaHook - Discover Your Next Manga",
    description:
      "Browse and discover manga with advanced filtering and search. Find your next favorite manga with powerful search tools, genre filters, and detailed information.",
    images: [
      {
        url: "/manga-logo.webp",
        width: 1200,
        height: 630,
        alt: "MangaHook - Discover Your Next Manga",
        type: "image/webp",
      },
      {
        url: "/manga-logo.webp",
        width: 800,
        height: 600,
        alt: "MangaHook Logo",
        type: "image/webp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MangaHook - Discover Your Next Manga",
    description:
      "Browse and discover manga with advanced filtering and search. Find your next favorite manga with powerful search tools.",
    images: [
      {
        url: "/manga-logo.webp",
        width: 1200,
        height: 630,
        alt: "MangaHook Logo",
      },
    ],
    creator: "@mangahook",
    site: "@mangahook",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  verification: {
    // Add your verification codes here when available
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
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
          <Providers>
            <PWARegister />
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
