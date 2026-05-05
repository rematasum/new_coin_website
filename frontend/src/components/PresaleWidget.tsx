"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther, zeroAddress } from "viem";
import { PRESALE_ADDRESS, PRESALE_ABI } from "@/config/contracts";
import { targetChain } from "@/config/wagmi";
import { formatTokenAmount, formatCountdown } from "@/lib/format";
import { WalletButton } from "./WalletButton";
import { StageTable } from "./StageTable";
import { VestingModal } from "./VestingModal";

const presaleContract = { address: PRESALE_ADDRESS, abi: PRESALE_ABI } as const;

export function PresaleWidget() {
  const { address, isConnected, chainId } = useAccount();
  const [ethInput, setEthInput] = useState("");
  const [referrer, setReferrer] = useState<`0x${string}`>(zeroAddress);
  const [countdown, setCountdown] = useState("");
  const [showVesting, setShowVesting] = useState(false);

  const isCorrectChain = chainId === targetChain.id;

  const { data, refetch } = useReadContracts({
    contracts: [
      { ...presaleContract, functionName: "currentStage" },
      { ...presaleContract, functionName: "currentStageInfo" },
      { ...presaleContract, functionName: "totalTokensSold" },
      { ...presaleContract, functionName: "totalAllocation" },
      { ...presaleContract, functionName: "deadline" },
      { ...presaleContract, functionName: "presaleActive" },
      { ...presaleContract, functionName: "isEnded" },
      { ...presaleContract, functionName: "totalEthRaised" },
      { ...presaleContract, functionName: "stageCount" },
      { ...presaleContract, functionName: "referralBonusBps" },
      { ...presaleContract, functionName: "presaleEndTime" },
    ],
    query: { refetchInterval: 10_000 },
  });

  const currentStage    = data?.[0]?.result as bigint | undefined;
  const stageInfo       = data?.[1]?.result as { tokenPrice: bigint; tokenAllocation: bigint; tokensSold: bigint; instantUnlockBps: bigint } | undefined;
  const totalSold       = data?.[2]?.result as bigint | undefined;
  const totalAlloc      = data?.[3]?.result as bigint | undefined;
  const deadline        = data?.[4]?.result as bigint | undefined;
  const presaleActive   = data?.[5]?.result as boolean | undefined;
  const isEnded         = data?.[6]?.result as boolean | undefined;
  const totalEthRaised  = data?.[7]?.result as bigint | undefined;
  const stageCount      = data?.[8]?.result as bigint | undefined;
  const referralBps     = data?.[9]?.result as bigint | undefined;
  const presaleEndTime  = data?.[10]?.result as bigint | undefined;

  const { data: claimable, refetch: refetchClaimable } = useReadContract({
    ...presaleContract,
    functionName: "getClaimableNow",
    args: [address ?? zeroAddress],
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const ethInputWei = ethInput ? parseEther(ethInput) : 0n;
  const { data: estimatedTokens } = useReadContract({
    ...presaleContract,
    functionName: "estimateTokens",
    args: [ethInputWei],
    query: { enabled: ethInputWei > 0n },
  });

  const { writeContract: writeBuy, data: buyTxHash, isPending: isBuying, error: buyError } = useWriteContract();
  const { isLoading: isBuyConfirming, isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyTxHash });

  const { writeContract: writeClaim, data: claimTxHash, isPending: isClaiming } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimTxHash });

  useEffect(() => {
    if (isBuySuccess || isClaimSuccess) { refetch(); refetchClaimable(); setEthInput(""); }
  }, [isBuySuccess, isClaimSuccess]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref?.startsWith("0x") && ref.length === 42) setReferrer(ref as `0x${string}`);
  }, []);

  useEffect(() => {
    if (!deadline) return;
    const iv = setInterval(() => {
      const left = Number(deadline) - Math.floor(Date.now() / 1000);
      setCountdown(formatCountdown(left));
    }, 1000);
    return () => clearInterval(iv);
  }, [deadline]);

  const overallProgress = totalAlloc && totalAlloc > 0n
    ? Number((totalSold ?? 0n) * 10000n / totalAlloc) / 100 : 0;

  const stageProgress = stageInfo && stageInfo.tokenAllocation > 0n
    ? Number(stageInfo.tokensSold * 10000n / stageInfo.tokenAllocation) / 100 : 0;

  const canBuy   = isConnected && isCorrectChain && presaleActive && !isEnded && ethInputWei > 0n;
  const canClaim = isConnected && isCorrectChain && isEnded && (claimable as bigint ?? 0n) > 0n;

  const stageIdx = currentStage !== undefined ? Number(currentStage) : 0;

  return (
    <>
      <div className="glass rounded-3xl p-6 w-full max-w-md mx-auto border border-accent-blue/20 shadow-card">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-black gradient-text">FLZY Presale</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Stage {currentStage !== undefined ? stageIdx + 1 : "–"} of {stageCount?.toString() ?? "–"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Price / Token</p>
            <p className="text-lg font-mono font-black text-accent-yellow">
              {stageInfo ? formatEther(stageInfo.tokenPrice) : "–"} ETH
            </p>
          </div>
        </div>

        {/* Overall progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>Total Progress</span>
            <span className="font-semibold text-white">{overallProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-surface-border rounded-full h-3 overflow-hidden">
            <div className="progress-shimmer h-3 rounded-full transition-all duration-500"
                 style={{ width: `${Math.min(overallProgress, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatTokenAmount(totalSold ?? 0n)} sold</span>
            <span>{formatTokenAmount(totalAlloc ?? 0n)} total</span>
          </div>
        </div>

        {/* Stage progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>Stage {stageIdx + 1} Progress</span>
            <span>{stageProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-surface-border rounded-full h-1.5 overflow-hidden">
            <div className="bg-accent-blue h-1.5 rounded-full transition-all duration-500"
                 style={{ width: `${Math.min(stageProgress, 100)}%` }} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-surface-card rounded-2xl p-3 border border-surface-border">
            <p className="text-xs text-gray-400">ETH Raised</p>
            <p className="text-sm font-mono font-bold mt-0.5 text-accent-blue">
              {parseFloat(formatEther(totalEthRaised ?? 0n)).toFixed(4)} ETH
            </p>
          </div>
          <div className="bg-surface-card rounded-2xl p-3 border border-surface-border">
            <p className="text-xs text-gray-400">Ends In</p>
            <p className="text-sm font-mono font-bold mt-0.5 text-accent-yellow">
              {isEnded ? "Ended ✓" : countdown || "–"}
            </p>
          </div>
        </div>

        {/* Stage table */}
        <div className="mb-4">
          <StageTable currentStage={stageIdx} />
        </div>

        {/* Referral badge */}
        {referralBps && referralBps > 0n && referrer !== zeroAddress && (
          <div className="bg-accent-green/10 border border-accent-green/30 rounded-2xl px-3 py-2 text-xs text-accent-green mb-4">
            🎁 Referral active — {Number(referralBps) / 100}% bonus for referrer
          </div>
        )}

        {/* Buy / Claim */}
        {!isEnded ? (
          <div className="space-y-3">
            <div className="relative">
              <input
                type="number" value={ethInput} onChange={(e) => setEthInput(e.target.value)}
                placeholder="0.0" min="0" step="0.001"
                className="w-full bg-surface-card border-2 border-surface-border rounded-2xl px-4 py-3 pr-16 text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors font-mono text-lg"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">ETH</span>
            </div>

            {estimatedTokens !== undefined && ethInputWei > 0n && (
              <div className="text-center text-sm text-gray-300">
                ≈ <span className="text-accent-yellow font-black font-mono">{formatTokenAmount(estimatedTokens as bigint)}</span> FLZY
              </div>
            )}

            {!isConnected ? (
              <div className="w-full flex justify-center">
                <WalletButton />
              </div>
            ) : (
              <button onClick={() => {
                if (!canBuy) return;
                writeBuy({ ...presaleContract, functionName: "buy", args: [referrer], value: ethInputWei });
              }}
                disabled={!canBuy || isBuying || isBuyConfirming}
                className="btn-bubble w-full text-lg py-3.5">
                {isBuying || isBuyConfirming ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {isBuying ? "Confirm in wallet…" : "Processing…"}
                  </span>
                ) : "🚀 Buy FLZY Now"}
              </button>
            )}

            {isBuySuccess && (
              <p className="text-center text-xs text-accent-green">
                ✅ Purchase confirmed! Tokens claimable after presale ends.
              </p>
            )}
            {buyError && (
              <p className="text-center text-xs text-red-400">{buyError.message.slice(0, 80)}</p>
            )}
          </div>
        ) : (
          /* Claim section */
          <div className="space-y-3">
            <div className="bg-surface-card border border-accent-green/30 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Claimable Now</p>
              <p className="text-2xl font-black font-mono text-accent-green">
                {formatTokenAmount(claimable as bigint ?? 0n)} FLZY
              </p>
              <p className="text-xs text-gray-500 mt-1">Includes instant unlock + vested portion</p>
            </div>

            {!isConnected ? (
              <WalletButton />
            ) : (
              <button onClick={() => { if (canClaim) writeClaim({ ...presaleContract, functionName: "claim" }); }}
                disabled={!canClaim || isClaiming || isClaimConfirming}
                className="btn-bubble-blue w-full font-black text-lg py-3.5">
                {isClaiming || isClaimConfirming ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
                    Claiming…
                  </span>
                ) : "💎 Claim FLZY"}
              </button>
            )}

            {isClaimSuccess && (
              <p className="text-center text-xs text-accent-green">✅ Tokens claimed!</p>
            )}
          </div>
        )}

        {/* Vesting schedule link */}
        <button
          onClick={() => setShowVesting(true)}
          className="w-full mt-3 text-xs text-gray-500 hover:text-accent-blue transition-colors underline underline-offset-2"
        >
          📋 View vesting schedule
        </button>
      </div>

      {showVesting && (
        <VestingModal
          onClose={() => setShowVesting(false)}
          presaleEndTime={presaleEndTime ?? 0n}
        />
      )}
    </>
  );
}
