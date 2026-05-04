import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  title: "Token Presale — Get In Early",
  description: "Join the presale on Base network. Buy tokens with ETH and be part of the next big project.",
  openGraph: {
    title: "Token Presale — Get In Early",
    description: "Buy tokens on Base network. Limited supply, staged pricing.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-surface text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
