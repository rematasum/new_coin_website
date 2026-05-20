"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { zeroAddress } from "viem";
import { TEAM_VESTING_ADDRESS, TEAM_VESTING_ABI } from "@/config/contracts";
import { targetChain } from "@/config/wagmi";
import { formatTokenAmount } from "@/lib/format";
import { WalletButton } from "./WalletButton";
import { AddTokenButton } from "./AddTokenButton";

const teamVestingContract = { address: TEAM_VESTING_ADDRESS, abi: TEAM_VESTING_ABI } as const;

export function TeamClaimSection() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [showDetails, setShowDetails] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const isCorrectChain = chainId === targetChain.id;

  useEffect(() => { setIsMounted(true); }, []);

  const {
    data: beneficiary,
    isLoading: isBeneficiaryLoading,
    isSuccess: isBeneficiaryLoaded,
    refetch: refetchBeneficiary,
  } = useReadContract({
    ...teamVestingContract,
    functionName: "getBeneficiary",
    args: [address ?? zeroAddress],
    query: { enabled: isMounted && !!address, refetchInterval: 15_000 },
  });

  const { data: vestingActive } = useReadContract({
    ...teamVestingContract,
    functionName: "vestingActive",
    query: { enabled: isMounted },
  });

  const { writeContract: writeClaim, data: claimTxHash, isPending: isClaiming } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimTxHash });

  useEffect(() => { if (isClaimSuccess) refetchBeneficiary(); }, [isClaimSuccess]);

  const totalAmount: bigint     = (beneficiary as any)?.[0] ?? 0n;
  const claimed: bigint         = (beneficiary as any)?.[1] ?? 0n;
  const instantUnlockBps: bigint = (beneficiary as any)?.[2] ?? 0n;
  const claimableNow: bigint    = (beneficiary as any)?.[3] ?? 0n;
  const nextUnlockAt: bigint    = (beneficiary as any)?.[4] ?? 0n;

  const instantPct = isMounted ? Number(instantUnlockBps) / 100 : 0;

  // Only decide "not a beneficiary" after the read has actually completed.
  // While loading, we show a spinner so the user doesn't see a false negative.
  const isQuerying   = isMounted && isConnected && isCorrectChain && isBeneficiaryLoading;
  const isBeneficiary = isMounted && isBeneficiaryLoaded && totalAmount > 0n;
  const isNotBeneficiary = isMounted && isBeneficiaryLoaded && totalAmount === 0n;
  const canClaim = isMounted && isConnected && isCorrectChain && !!vestingActive && claimableNow > 0n;

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

      {/* ── Not connected ── */}
      {!isMounted || !isConnected ? (
        <div className="meme-card p-6 text-center space-y-4">
          <p className="font-fredoka text-gray-400">Connect your wallet to check allocation</p>
          <div className="flex justify-center"><WalletButton /></div>
        </div>

      /* ── Wrong network ── */
      ) : !isCorrectChain ? (
        <div className="meme-card p-6 text-center space-y-3">
          <p className="font-fredoka text-orange-400 text-sm">
            ⚠ Wrong network. Switch to {targetChain.name}.
          </p>
          <button
            onClick={() => switchChain({ chainId: targetChain.id })}
            className="btn-meme-orange px-6 py-2 text-sm font-bangers"
            style={{ letterSpacing: "1px" }}
          >
            Switch to {targetChain.name}
          </button>
        </div>

      /* ── Loading ── */
      ) : isQuerying ? (
        <div className="meme-card p-6 text-center">
          <span className="inline-block w-6 h-6 border-3 border-meme-yellow/30 border-t-meme-yellow rounded-full animate-spin" />
          <p className="font-fredoka text-gray-400 text-sm mt-2">Checking allocation…</p>
        </div>

      /* ── Beneficiary found ── */
      ) : isBeneficiary ? (
        <div className="space-y-4">
          {/* Total allocation */}
          <div className="meme-card p-4 text-center">
            <p className="font-fredoka text-xs text-gray-400 mb-1">Total Allocation</p>
            <p className="font-bangers text-2xl txt-yellow" style={{ letterSpacing: "1px" }}>
              {formatTokenAmount(totalAmount)} FLZY
            </p>
            <p className="font-fredoka text-xs text-gray-500 mt-1">
              {instantPct}% instant · {100 - instantPct}% over 24 months
            </p>
          </div>

          {/* Claimed / Claimable */}
          <div className="grid grid-cols-2 gap-3">
            <div className="meme-card p-3 text-center">
              <p className="font-fredoka text-xs text-gray-400">Already Claimed</p>
              <p className="font-bangers text-lg txt-blue" style={{ letterSpacing: "1px" }}>
                {formatTokenAmount(claimed)}
              </p>
            </div>
            <div className="meme-card p-3 text-center" style={{ borderColor: "#00E676" }}>
              <p className="font-fredoka text-xs text-gray-400">Available Now</p>
              <p className="font-bangers text-lg txt-green" style={{ letterSpacing: "1px" }}>
                {formatTokenAmount(claimableNow)}
              </p>
            </div>
          </div>

          {/* Next unlock */}
          {vestingActive && nextUnlockAt > 0n && (
            <div className="meme-card p-4 text-center" style={{ borderColor: "#00BCD4" }}>
              <p className="font-fredoka text-xs text-gray-400 mb-1">Next Unlock</p>
              <p className="font-fredoka text-sm text-gray-300">
                {new Date(Number(nextUnlockAt) * 1000).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </p>
            </div>
          )}

          {/* Vesting not started notice */}
          {!vestingActive && (
            <div className="meme-card p-3 text-center border-orange-500" style={{ borderColor: "#FF9800" }}>
              <p className="font-fredoka text-xs text-orange-300">
                ⏳ Vesting not started yet. Claim will be available after the owner activates vesting.
              </p>
            </div>
          )}

          {/* Claim button */}
          <button
            onClick={() => { if (canClaim) writeClaim({ ...teamVestingContract, functionName: "claim" }); }}
            disabled={!canClaim || isClaiming || isClaimConfirming}
            className={`w-full py-3.5 text-xl font-bangers ${canClaim ? "btn-meme-purple" : "btn-meme-gray"}`}
            style={{ letterSpacing: "1px" }}
          >
            {isClaiming || isClaimConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-3 border-black/30 border-t-black rounded-full animate-spin" />
                {isClaiming ? "Confirm in wallet…" : "Processing…"}
              </span>
            ) : canClaim ? "💜 CLAIM TOKENS" : "🔒 NO TOKENS TO CLAIM"}
          </button>

          {isClaimSuccess && (
            <>
              <p className="text-center font-fredoka text-sm text-meme-green">✅ Tokens claimed successfully!</p>
              <AddTokenButton />
            </>
          )}

          {/* Details toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full font-fredoka text-xs text-gray-500 hover:text-sky-base transition-colors underline underline-offset-2"
          >
            {showDetails ? "📖 Hide vesting schedule" : "📖 View vesting schedule"}
          </button>

          {showDetails && (
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
                <p className="text-gray-500 text-xs">Monthly unlock (30-day intervals) starting from vesting activation date.</p>
              </div>
            </div>
          )}
        </div>

      /* ── Not a beneficiary (confirmed after load) ── */
      ) : isNotBeneficiary ? (
        <div className="meme-card p-6 text-center">
          <p className="font-fredoka text-gray-400">You are not a team or sponsor beneficiary</p>
        </div>

      /* ── Fallback while address resolves ── */
      ) : (
        <div className="meme-card p-6 text-center">
          <span className="inline-block w-6 h-6 border-3 border-meme-yellow/30 border-t-meme-yellow rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
