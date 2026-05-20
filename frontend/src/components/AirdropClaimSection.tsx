"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchAsset } from "wagmi";
import { zeroAddress } from "viem";
import { AIRDROP_VAULT_ADDRESS, AIRDROP_VAULT_ABI, TOKEN_ADDRESS } from "@/config/contracts";
import { targetChain } from "@/config/wagmi";
import { formatTokenAmount } from "@/lib/format";
import { WalletButton } from "./WalletButton";
import { AddTokenButton } from "./AddTokenButton";
import { notifyWebhook } from "@/lib/notify";

const airdropContract = { address: AIRDROP_VAULT_ADDRESS, abi: AIRDROP_VAULT_ABI } as const;

export function AirdropClaimSection() {
  const { address, isConnected, chainId } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  const isCorrectChain = chainId === targetChain.id;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: alloc, refetch: refetchAlloc } = useReadContract({
    ...airdropContract,
    functionName: "getAllocation",
    args: [address ?? zeroAddress],
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const { data: claimable, refetch: refetchClaimable } = useReadContract({
    ...airdropContract,
    functionName: "getClaimableNow",
    args: [address ?? zeroAddress],
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const { data: fixedDate } = useReadContract({
    ...airdropContract,
    functionName: "fixedUnlockDate",
  });

  const { writeContract: writeClaim, data: claimTxHash, isPending: isClaiming } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimTxHash });
  const { watchAsset } = useWatchAsset();

  useEffect(() => {
    if (isClaimSuccess) {
      refetchAlloc();
      refetchClaimable();
      notifyWebhook({ type: "airdrop_claim", wallet: address, txHash: claimTxHash });
      watchAsset({
        type: "ERC20",
        options: {
          address: TOKEN_ADDRESS,
          symbol: "FLZY",
          decimals: 18,
          image: typeof window !== "undefined" ? `${window.location.origin}/logo.png` : "",
        },
      });
    }
  }, [isClaimSuccess]);

  const totalAmount: bigint = isMounted ? ((alloc as any)?.[0] ?? 0n) : 0n;
  const claimed: bigint = isMounted ? ((alloc as any)?.[1] ?? 0n) : 0n;
  const claimableNow: bigint = isMounted ? ((alloc as any)?.[2] ?? 0n) : 0n;
  const daysUntilUnlock: bigint = isMounted ? ((alloc as any)?.[3] ?? 0n) : 0n;

  const isUnlocked = isMounted && claimableNow > 0n;
  const canClaim = isMounted && isConnected && isCorrectChain && isUnlocked;
  const hasAllocation = isMounted && totalAmount > 0n;

  return (
    <div className="meme-card-glow p-6 w-full max-w-md mx-auto relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bangers text-3xl grad-yellow txt-shadow-sm" style={{ letterSpacing: "2px" }}>
            🎁 AIRDROP CLAIM
          </h2>
          <p className="font-fredoka text-sky-base text-sm mt-0.5">
            {isUnlocked ? "🟢 Available" : "🔴 Locked"}
          </p>
        </div>
      </div>

      {/* Allocation info */}
      {hasAllocation ? (
        <div className="space-y-4">
          {/* Total allocation */}
          <div className="meme-card p-4 text-center">
            <p className="font-fredoka text-xs text-gray-400 mb-1">Total Allocation</p>
            <p className="font-bangers text-2xl txt-yellow" style={{ letterSpacing: "1px" }}>
              {formatTokenAmount(totalAmount as bigint)} FLZY
            </p>
          </div>

          {/* Claimed / Claimable */}
          <div className="grid grid-cols-2 gap-3">
            <div className="meme-card p-3 text-center">
              <p className="font-fredoka text-xs text-gray-400">Already Claimed</p>
              <p className="font-bangers text-lg txt-blue" style={{ letterSpacing: "1px" }}>
                {formatTokenAmount(claimed as bigint)}
              </p>
            </div>
            <div className="meme-card p-3 text-center border-meme-green" style={{ borderColor: "#00E676" }}>
              <p className="font-fredoka text-xs text-gray-400">Available Now</p>
              <p className="font-bangers text-lg txt-green" style={{ letterSpacing: "1px" }}>
                {formatTokenAmount(claimableNow as bigint)}
              </p>
            </div>
          </div>

          {/* Unlock status */}
          {!isUnlocked && daysUntilUnlock !== undefined && (
            <div className="meme-card p-4 text-center border-orange-400" style={{ borderColor: "#FF9800" }}>
              <p className="font-fredoka text-xs text-gray-400 mb-1">Unlocks In</p>
              <p className="font-bangers text-2xl txt-yellow" style={{ letterSpacing: "1px" }}>
                {Number(daysUntilUnlock)} days
              </p>
              <p className="font-fredoka text-xs text-gray-500 mt-1">
                {fixedDate && new Date(Number(fixedDate) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          )}

          {/* Claim button */}
          {!isConnected ? (
            <WalletButton />
          ) : (
            <button
              onClick={() => {
                if (canClaim) writeClaim({ ...airdropContract, functionName: "claim" });
              }}
              disabled={!canClaim || isClaiming || isClaimConfirming}
              className={`w-full py-3.5 text-xl font-bangers ${canClaim ? "btn-meme-green" : "btn-meme-gray"}`}
              style={{ letterSpacing: "1px" }}
            >
              {isClaiming || isClaimConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-3 border-black/30 border-t-black rounded-full animate-spin" />
                  {isClaiming ? "Confirm in wallet…" : "Processing…"}
                </span>
              ) : isUnlocked && canClaim ? (
                "💚 CLAIM AIRDROP"
              ) : (
                `🔒 CLAIM (LOCKED ${isMounted && Number(daysUntilUnlock) > 0 ? `${Number(daysUntilUnlock)} DAYS` : ""})`
              )}
            </button>
          )}

          {isClaimSuccess && (
            <>
              <p className="text-center font-fredoka text-sm text-meme-green">✅ Airdrop claimed successfully!</p>
              <AddTokenButton />
            </>
          )}
        </div>
      ) : (
        <div className="meme-card p-6 text-center">
          <p className="font-fredoka text-gray-400">
            {!isConnected ? "Connect your wallet to check airdrop eligibility" : "You are not on the airdrop whitelist"}
          </p>
          {!isConnected && <div className="mt-4 flex justify-center"><WalletButton /></div>}
        </div>
      )}
    </div>
  );
}
