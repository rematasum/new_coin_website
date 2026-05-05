"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { targetChain } from "@/config/wagmi";

export function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const isWrongChain = isConnected && chainId !== targetChain.id;

  if (isWrongChain) {
    return (
      <button
        onClick={() => switchChain({ chainId: targetChain.id })}
        className="px-4 py-2 rounded-bubble bg-accent-yellow text-surface font-black text-sm shadow-bubble transition-all hover:-translate-y-0.5"
      >
        Switch to Base
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="px-4 py-2 rounded-bubble border-2 border-surface-light text-sm font-mono font-semibold hover:border-brand transition-colors"
      >
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  const metamask = connectors.find((c) => c.id === "metaMask") ?? connectors[0];

  return (
    <button
      onClick={() => connect({ connector: metamask })}
      disabled={isPending}
      className="btn-bubble text-sm px-5 py-2"
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
