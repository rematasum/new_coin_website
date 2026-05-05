"use client";

import { WalletButton } from "./WalletButton";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-surface-border bg-surface/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center font-black text-white text-base shadow-glow">
            🌊
          </div>
          <span className="font-black text-xl gradient-text tracking-tight">FLOZY</span>
        </div>

        {/* Links */}
        <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-400">
          <a href="#presale"  className="hover:text-white transition-colors">Buy FLZY</a>
          <a href="#airdrop"  className="hover:text-accent-yellow transition-colors">Airdrop</a>
          <a href="https://x.com/flozymeme" target="_blank" rel="noopener noreferrer"
             className="hover:text-accent-blue transition-colors flex items-center gap-1">
            𝕏 Twitter
          </a>
        </div>

        <WalletButton />
      </div>
    </nav>
  );
}
