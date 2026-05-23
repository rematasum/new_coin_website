import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://flozy.meme"),
  title: "FLOZY ($FLZY) — Biggest Meme on Base",
  description: "Join the FLOZY presale on Base network. Buy $FLZY with ETH. 5 stages, early buyers get up to 25% instant unlock.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "FLOZY ($FLZY) — Biggest Meme on Base",
    description: "Join the FLOZY presale. 5 stages. 250M tokens. Early buyers get the best price.",
    type: "website",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-sky-dark text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
