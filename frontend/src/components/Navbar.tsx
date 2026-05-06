"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

const NAV_LINKS = [
  { href: "/",            label: "Home" },
  { href: "/tokenomics",  label: "Tokenomics" },
  { href: "/vesting",     label: "Vesting" },
  { href: "/airdrop",     label: "Airdrop 🎁" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-[42px] left-0 right-0 z-50 border-b-4 border-meme-yellow"
         style={{ background: "rgba(7,27,62,0.97)", backdropFilter: "blur(12px)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-meme-yellow"
               style={{ boxShadow: "2px 2px 0 #000" }}>
            <Image src="/logo.png" alt="Flozy" fill style={{ objectFit: "cover" }} />
          </div>
          <span className="font-bangers text-2xl txt-shadow-sm"
                style={{ color: "#FFD43B", letterSpacing: "3px" }}>
            FLOZY
          </span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-5">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`font-fredoka text-sm font-semibold tracking-wide transition-colors ${
                pathname === href
                  ? "text-meme-yellow border-b-2 border-meme-yellow pb-0.5"
                  : "text-white hover:text-meme-yellow"
              }`}
            >
              {label}
            </Link>
          ))}
          <a href="https://x.com/flozymeme" target="_blank" rel="noopener noreferrer"
             className="font-fredoka text-white hover:text-sky-base transition-colors text-sm font-semibold tracking-wide">
            𝕏 Twitter
          </a>
        </div>

        <WalletButton />
      </div>

      {/* Mobile menu */}
      <div className="md:hidden flex items-center gap-4 px-4 pb-2 overflow-x-auto">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`font-fredoka text-xs font-semibold whitespace-nowrap transition-colors ${
              pathname === href ? "text-meme-yellow" : "text-gray-300 hover:text-meme-yellow"
            }`}
          >
            {label}
          </Link>
        ))}
        <a href="https://x.com/flozymeme" target="_blank" rel="noopener noreferrer"
           className="font-fredoka text-xs text-gray-300 hover:text-sky-base whitespace-nowrap">
          𝕏 Twitter
        </a>
      </div>
    </nav>
  );
}
