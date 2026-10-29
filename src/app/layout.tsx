import type { Metadata } from "next";
import { Funnel_Display, Funnel_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

// Funnel Display for headings: soft, slightly condensed curves with sharp
// terminals. Funnel Sans is its text companion for UI and body copy.
const funnelDisplay = Funnel_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const funnelSans = Funnel_Sans({
  variable: "--font-text",
  subsets: ["latin"],
  display: "swap",
});

// Compact mono for labels, handles, signatures, and ciphertext.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Veiled: Private banking for humans and AI agents",
  description:
    "Veiled is the private bank of the agent economy. Every transfer is encrypted end to end, amounts stay hidden from everyone but you, and settlement lands on Solana in under a second. Humans and AI agents hold confidential accounts side by side, and agents spend only within the limits you set. Confidential by construction. Verifiable by design.",
  icons: {
    icon: "/images/logo-bg.png",
    shortcut: "/images/logo-bg.png",
    apple: "/images/logo-bg.png",
  },
  openGraph: {
    title: "Veiled: Private banking for humans and AI agents",
    description:
      "Veiled is the private bank of the agent economy. Every transfer is encrypted end to end, amounts stay hidden from everyone but you, and settlement lands on Solana in under a second. Humans and AI agents hold confidential accounts side by side, and agents spend only within the limits you set. Confidential by construction. Verifiable by design.",
    url: "https://useveiled.com",
    siteName: "Veiled",
    type: "website",
    images: [
      {
        url: "https://useveiled.com/images/og.jpg",
        width: 1081,
        height: 561,
        alt: "Veiled: Private banking for humans and AI agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@useveiled",
    creator: "@useveiled",
    title: "Veiled: Private banking for humans and AI agents",
    description:
      "Veiled is the private bank of the agent economy. Every transfer is encrypted end to end, amounts stay hidden from everyone but you, and settlement lands on Solana in under a second. Humans and AI agents hold confidential accounts side by side, and agents spend only within the limits you set. Confidential by construction. Verifiable by design.",
    images: ["https://useveiled.com/images/og.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${funnelDisplay.variable} ${funnelSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-full flex flex-col">
        <div aria-hidden="true" className="veil-backdrop" />
        {children}
      </body>
    </html>
  );
}
