import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

import { ToastProvider } from "@/context/ToastContext";

export const metadata: Metadata = {
  title: "WalletGraph — On-Chain Wallet Reputation",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
  description:
    "A decentralized, on-chain reputation layer for Stellar wallets. Register, endorse, and report wallets — immutably on the blockchain.",
  keywords: ["Stellar", "Wallet", "Reputation", "Blockchain", "Soroban", "Crypto", "Trust", "Web3", "WalletGraph", "On-Chain Dashboard"],
  authors: [{ name: "Harshal", url: "https://harshal.great-site.net/" }],
  creator: "Harshal",
  publisher: "WalletGraph",
  metadataBase: new URL("https://harshal.great-site.net/"),
  openGraph: {
    title: "WalletGraph — On-Chain Wallet Reputation",
    description: "A decentralized, on-chain reputation layer for Stellar wallets.",
    url: "https://harshal.great-site.net/",
    siteName: "WalletGraph",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WalletGraph — On-Chain Wallet Reputation",
    description: "A decentralized, on-chain reputation layer for Stellar wallets.",
  },
  verification: {
    google: "71AvwCTLNtia6Tt3dvKFdDDWFxZjI6KYiL8Xrdz2X5U",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${sourceSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F2F0EF]">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
