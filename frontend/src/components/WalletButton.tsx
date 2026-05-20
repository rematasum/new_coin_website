"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { targetChain } from "@/config/wagmi";

export function WalletButton() {
  const [isMounted, setIsMounted] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => setIsMounted(true), []);

  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  // Close popover on outside click
  useEffect(() => {
    if (!showOptions) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showOptions]);

  if (!isMounted) {
    return (
      <button disabled className="btn-meme-yellow text-sm px-5 py-2 opacity-60">
        🦊 Connect Wallet
      </button>
    );
  }

  const isWrongChain = isConnected && chainId !== targetChain.id;

  if (isWrongChain) {
    return (
      <button onClick={() => switchChain({ chainId: targetChain.id })} className="btn-meme-orange text-sm px-4 py-2">
        ⚠ Switch to {targetChain.name}
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="font-fredoka text-sm px-4 py-2 rounded-full border-2 border-meme-yellow text-meme-yellow hover:bg-meme-yellow hover:text-black transition-all"
        style={{ fontWeight: 700 }}
      >
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  // Friendly label per connector id
  const labelFor = (id: string, name: string) => {
    if (id === "injected" || id === "metaMask") return "🦊 Browser Wallet";
    if (id === "walletConnect") return "📱 WalletConnect (Mobile)";
    if (id === "coinbaseWalletSDK") return "🔵 Coinbase Wallet";
    return name;
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setShowOptions((v) => !v)}
        disabled={isPending}
        className="btn-meme-yellow text-sm px-5 py-2"
      >
        {isPending ? "Connecting…" : "🦊 Connect Wallet"}
      </button>

      {showOptions && (
        <div
          className="absolute right-0 mt-2 w-60 rounded-xl z-50 p-2 space-y-1"
          style={{ background: "rgba(7,27,62,0.98)", border: "3px solid #FFD43B", boxShadow: "4px 4px 0 #000" }}
        >
          {connectors.map((c) => (
            <button
              key={c.uid}
              onClick={() => { connect({ connector: c }); setShowOptions(false); }}
              className="w-full text-left px-3 py-2 rounded-lg font-fredoka text-sm text-white hover:bg-meme-yellow/20 transition-colors"
            >
              {labelFor(c.id, c.name)}
            </button>
          ))}
          {connectors.length === 0 && (
            <p className="font-fredoka text-xs text-gray-400 px-3 py-2">No wallets available.</p>
          )}
        </div>
      )}
    </div>
  );
}
