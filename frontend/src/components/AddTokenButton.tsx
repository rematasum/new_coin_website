"use client";

import { useState } from "react";
import { useWatchAsset } from "wagmi";
import { TOKEN_ADDRESS } from "@/config/contracts";

export function AddTokenButton({ className = "" }: { className?: string }) {
  const { watchAsset, isPending } = useWatchAsset();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    watchAsset(
      {
        type: "ERC20",
        options: {
          address: TOKEN_ADDRESS,
          symbol: "FLZY",
          decimals: 18,
          image: typeof window !== "undefined" ? `${window.location.origin}/logo.png` : "",
        },
      },
      {
        onSuccess: () => setAdded(true),
      },
    );
  };

  return (
    <button
      onClick={handleAdd}
      disabled={isPending}
      className={`w-full font-fredoka text-xs text-gray-400 hover:text-meme-yellow transition-colors underline underline-offset-2 ${className}`}
    >
      {added ? "✅ FLZY added to wallet" : isPending ? "Waiting for wallet…" : "🪙 Add FLZY to wallet"}
    </button>
  );
}
