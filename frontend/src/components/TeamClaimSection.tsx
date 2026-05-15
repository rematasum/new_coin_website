"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { zeroAddress } from "viem";
import { TEAM_VESTING_ADDRESS, TEAM_VESTING_ABI } from "@/config/contracts";
import { targetChain } from "@/config/wagmi";
import { formatTokenAmount } from "@/lib/format";
import { WalletButton } from "./WalletButton";

const teamVestingContract = { address: TEAM_VESTING_ADDRESS, abi: TEAM_VESTING_ABI } as const;

export function TeamClaimSection() {
  const { address, isConnected, chainId } = useAccount();
  const [showDetails, setShowDetails] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const isCorrectChain = chainId === targetChain.id;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: beneficiary, refetch: refetchBeneficiary } = useReadContract({
    ...teamVestingContract,
    functionName: "getBeneficiary",
    args: [address ?? zeroAddress],
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const { data: vestingActive } = useReadContract({
    ...teamVestingContract,
    functionName: "vestingActive",
  });

  const { writeContract: writeClaim, data: claimTxHash, isPending: isClaiming } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimTxHash });

  if (isClaimSuccess) {
    refetchBeneficiary();
  }

  const totalAmount: bigint = (beneficiary as any)?.[0] ?? 0n;
  const claimed: bigint = (beneficiary as any)?.[1] ?? 0n;
  const instantUnlockBps: bigint = (beneficiary as any)?.[2] ?? 0n;
  const claimableNow: bigint = (beneficiary as any)?.[3] ?? 0n;
  const nextUnlockAt: bigint = (beneficiary as any)?.[4] ?? 0n;

  const isBeneficiary = isMounted && totalAmount > 0n;
  const canClaim = isMounted && isConnected && isCorrectChain && vestingActive && claimableNow > 0n;
  const instantPct = isMounted ? Number(instantUnlockBps) / 100 : 0;

  return (
    <div className="meme-card-glow p-6 w-full max-w-md mx-auto relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bangers text-3xl grad-yellow txt-shadow-sm" style={{ letterSpacing: "2px" }}>
            👥 TEAM & SPONSORS
          </h2>
          <p className="font-fredoka text-sky-base text-sm mt-0.5">
            {vestingActive ? "🟢 Vesting Active" : "🔴 Not Started"}
          </p>
        </div>
      </div>

      {/* Beneficiary info */}
      {isBeneficiary ? (
        <div className="space-y-4">
          {/* Total allocation */}
          <div className="meme-card p-4 text-center">
            <p className="font-fredoka text-xs text-gray-400 mb-1">Total Allocation</p>
            <p className="font-bangers text-2xl txt-yellow" style={{ letterSpacing: "1px" }}>
              {formatTokenAmount(totalAmount as bigint)} FLZY
            </p>
            <p className="font-fredoka text-xs text-gray-500 mt-1">{instantPct}% instant · {100 - instantPct}% over 24 months</p>
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

          {/* Vesting status */}
          {vestingActive && nextUnlockAt > 0n && (
            <div className="meme-card p-4 text-center border-sky-400" style={{ borderColor: "#00BCD4" }}>
              <p className="font-fredoka text-xs text-gray-400 mb-1">Next Unlock</p>
              <p className="font-fredoka text-sm text-gray-300">
                {new Date(Number(nextUnlockAt) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          )}

          {/* Claim button */}
          {!isConnected ? (
            <WalletButton />
          ) : (
            <button
              onClick={() => {
                if (canClaim) writeClaim({ ...teamVestingContract, functionName: "claim" });
              }}
              disabled={!canClaim || isClaiming || isClaimConfirming}
              className={`w-full py-3.5 text-xl font-bangers ${canClaim ? "btn-meme-purple" : "btn-meme-gray"}`}
              style={{ letterSpacing: "1px" }}
            >
              {isClaiming || isClaimConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-3 border-black/30 border-t-black rounded-full animate-spin" />
                  {isClaiming ? "Confirm in wallet…" : "Processing…"}
                </span>
              ) : canClaim ? (
                "💜 CLAIM TOKENS"
              ) : (
                "🔒 NO TOKENS TO CLAIM"
              )}
            </button>
          )}

          {isClaimSuccess && (
            <p className="text-center font-fredoka text-sm text-meme-green">✅ Tokens claimed successfully!</p>
          )}

          {/* Details toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full font-fredoka text-xs text-gray-500 hover:text-sky-base transition-colors underline underline-offset-2"
          >
            {showDetails ? "📖 Hide vesting schedule" : "📖 View vesting schedule"}
          </button>

          {showDetails && isMounted && (
            <div className="meme-card p-4 text-left text-sm font-fredoka text-gray-300 space-y-2">
              <div className="flex justify-between">
                <span>Total Allocation:</span>
                <span className="font-bangers txt-yellow">{formatTokenAmount(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Instant Unlock ({instantPct}%):</span>
                <span className="font-bangers txt-green">
                  {formatTokenAmount((totalAmount * instantUnlockBps) / 10000n)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Vesting Portion ({100 - instantPct}%):</span>
                <span className="font-bangers txt-blue">
                  {formatTokenAmount((totalAmount * (10000n - instantUnlockBps)) / 10000n)}
                </span>
              </div>
              <div className="border-t border-gray-600 pt-2 mt-2">
                <p className="text-gray-500 text-xs mb-1">Monthly unlock (30-day intervals):</p>
                <p className="text-xs">Starting from vesting activation date, you can claim in equal monthly tranches.</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="meme-card p-6 text-center">
          <p className="font-fredoka text-gray-400">
            {!isConnected ? "Connect your wallet to check allocation" : "You are not a team or sponsor beneficiary"}
          </p>
          {!isConnected && <div className="mt-4 flex justify-center"><WalletButton /></div>}
        </div>
      )}
    </div>
  );
}
