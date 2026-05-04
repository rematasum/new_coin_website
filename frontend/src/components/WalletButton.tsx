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
        className="px-5 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm transition-colors"
      >
        Switch to Base
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="px-5 py-2 rounded-lg bg-surface-card border border-surface-border hover:border-brand text-sm font-mono transition-colors"
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
      className="px-5 py-2 rounded-lg bg-brand hover:bg-brand-dark text-white font-semibold text-sm transition-colors disabled:opacity-50"
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
