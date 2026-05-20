"use client";

import Image from "next/image";
import { WalletButton } from "./WalletButton";
import { AddTokenButton } from "./AddTokenButton";

export function Navbar() {
  return (
    <nav className="fixed top-[42px] left-0 right-0 z-50 border-b-4 border-meme-yellow"
         style={{ background: "rgba(7,27,62,0.97)", backdropFilter: "blur(12px)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-meme-yellow"
               style={{ boxShadow: "2px 2px 0 #000" }}>
            <Image src="/logo.png" alt="Flozy" fill sizes="40px" style={{ objectFit: "cover" }} />
          </div>
          <span className="font-bangers text-2xl txt-shadow-sm"
                style={{ color: "#FFD43B", letterSpacing: "3px" }}>
            FLOZY
          </span>
        </div>

        {/* Links */}
        <div className="hidden md:flex items-center gap-5">
          <a href="#presale"
             className="font-fredoka text-white hover:text-meme-yellow transition-colors text-sm font-semibold tracking-wide">
            Buy $FLZY
          </a>
          <a href="#claims"
             className="font-fredoka text-white hover:text-meme-yellow transition-colors text-sm font-semibold tracking-wide">
            Claims
          </a>
          <a href="#tokenomics"
             className="font-fredoka text-white hover:text-meme-yellow transition-colors text-sm font-semibold tracking-wide">
            Tokenomics
          </a>
          <a href="#roadmap"
             className="font-fredoka text-white hover:text-meme-yellow transition-colors text-sm font-semibold tracking-wide">
            Roadmap
          </a>
          <a href="#airdrop"
             className="font-fredoka text-white hover:text-meme-yellow transition-colors text-sm font-semibold tracking-wide">
            Airdrop
          </a>
          <a href="#faq"
             className="font-fredoka text-white hover:text-meme-yellow transition-colors text-sm font-semibold tracking-wide">
            FAQ
          </a>
          <a href="https://x.com/flozymeme" target="_blank" rel="noopener noreferrer"
             className="font-fredoka text-white hover:text-sky-base transition-colors text-sm font-semibold tracking-wide">
            𝕏 Twitter
          </a>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <AddTokenButton className="text-xs px-3 py-1.5 border border-meme-yellow/40 rounded-full hover:border-meme-yellow" />
          </div>
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
