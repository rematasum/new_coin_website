"use client";

import { WalletButton } from "./WalletButton";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-surface-border bg-surface/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center font-bold text-sm">T</div>
          <span className="font-bold text-lg gradient-text">TOKEN</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#presale" className="hover:text-white transition-colors">Presale</a>
          <a href="#tokenomics" className="hover:text-white transition-colors">Tokenomics</a>
          <a href="#roadmap" className="hover:text-white transition-colors">Roadmap</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>

        <WalletButton />
      </div>
    </nav>
  );
}
