"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { targetChain } from "@/config/wagmi";

export function WalletButton() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  useEffect(() => { setMounted(true); }, []);

  // Always render the same placeholder on server + first client paint to avoid hydration mismatch
  if (!mounted) {
    return (
      <button disabled className="btn-meme-yellow text-sm px-5 py-2 opacity-0">
        Connect
      </button>
    );
  }

  const isWrongChain = isConnected && chainId !== targetChain.id;

  if (isWrongChain) {
    return (
      <button onClick={() => switchChain({ chainId: targetChain.id })} className="btn-meme-orange text-sm px-4 py-2">
        ⚠ Switch to Base
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

  const metamask = connectors.find((c) => c.id === "metaMask") ?? connectors[0];

  return (
    <button onClick={() => connect({ connector: metamask })} disabled={isPending} className="btn-meme-yellow text-sm px-5 py-2">
      {isPending ? "Connecting…" : "🦊 Connect Wallet"}
    </button>
  );
}
