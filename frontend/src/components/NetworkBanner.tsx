"use client";

import { useEffect, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { targetChain } from "@/config/wagmi";

/**
 * Site-wide sticky banner shown when the user's wallet is connected but on a
 * chain other than `targetChain`. Visible from any scroll position so a user
 * who accidentally switched MetaMask to (say) Ethereum mainnet sees the warning
 * before attempting any on-chain action.
 */
export function NetworkBanner() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isMounted) return null;
  if (!isConnected) return null;
  if (chainId === targetChain.id) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] border-b-4 border-black"
      style={{ background: "#FF6B00", boxShadow: "0 4px 0 rgba(0,0,0,0.3)" }}
      role="alert"
    >
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4 flex-wrap">
        <p className="font-fredoka text-sm sm:text-base text-black font-bold">
          ⚠️ Yanlış ağdasın — FLZY işlemleri yalnızca{" "}
          <span className="font-bangers tracking-wider">{targetChain.name}</span> üzerinde çalışır.
        </p>
        <button
          onClick={() => switchChain({ chainId: targetChain.id })}
          disabled={isPending}
          className="font-bangers text-sm bg-black text-meme-yellow px-4 py-1.5 rounded-full hover:bg-gray-900 transition-colors disabled:opacity-50"
          style={{ letterSpacing: "2px", boxShadow: "2px 2px 0 rgba(0,0,0,0.4)" }}
        >
          {isPending ? "Geçiliyor…" : `Switch to ${targetChain.name}`}
        </button>
      </div>
    </div>
  );
}
