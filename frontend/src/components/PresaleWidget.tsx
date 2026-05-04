"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther, zeroAddress } from "viem";
import { PRESALE_ADDRESS, PRESALE_ABI } from "@/config/contracts";
import { targetChain } from "@/config/wagmi";
import { formatTokenAmount, formatCountdown } from "@/lib/format";
import { WalletButton } from "./WalletButton";

const presaleContract = { address: PRESALE_ADDRESS, abi: PRESALE_ABI } as const;

export function PresaleWidget() {
  const { address, isConnected, chainId } = useAccount();
  const [ethInput, setEthInput] = useState("");
  const [referrer, setReferrer] = useState<`0x${string}`>(zeroAddress);
  const [countdown, setCountdown] = useState("");

  const isCorrectChain = chainId === targetChain.id;

  // Read all presale state in one call
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
    ],
    query: { refetchInterval: 10_000 },
  });

  const currentStage = data?.[0]?.result as bigint | undefined;
  const stageInfo = data?.[1]?.result as { tokenPrice: bigint; tokensSold: bigint; tokenAllocation: bigint } | undefined;
  const totalSold = data?.[2]?.result as bigint | undefined;
  const totalAlloc = data?.[3]?.result as bigint | undefined;
  const deadline = data?.[4]?.result as bigint | undefined;
  const presaleActive = data?.[5]?.result as boolean | undefined;
  const isEnded = data?.[6]?.result as boolean | undefined;
  const totalEthRaised = data?.[7]?.result as bigint | undefined;
  const stageCount = data?.[8]?.result as bigint | undefined;
  const referralBps = data?.[9]?.result as bigint | undefined;

  // User's claimable balance
  const { data: claimable, refetch: refetchClaimable } = useReadContract({
    ...presaleContract,
    functionName: "contributions",
    args: [address ?? zeroAddress],
    query: { enabled: !!address },
  });

  // Estimate tokens for ETH input
  const ethInputWei = ethInput ? parseEther(ethInput) : 0n;
  const { data: estimatedTokens } = useReadContract({
    ...presaleContract,
    functionName: "estimateTokens",
    args: [ethInputWei],
    query: { enabled: ethInputWei > 0n },
  });

  // Buy transaction
  const { writeContract: writeBuy, data: buyTxHash, isPending: isBuying, error: buyError } = useWriteContract();
  const { isLoading: isBuyConfirming, isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyTxHash });

  // Claim transaction
  const { writeContract: writeClaim, data: claimTxHash, isPending: isClaiming } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimTxHash });

  useEffect(() => {
    if (isBuySuccess || isClaimSuccess) {
      refetch();
      refetchClaimable();
      setEthInput("");
    }
  }, [isBuySuccess, isClaimSuccess]);

  // Parse referrer from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref?.startsWith("0x") && ref.length === 42) {
      setReferrer(ref as `0x${string}`);
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const left = Number(deadline) - now;
      setCountdown(formatCountdown(left));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const overallProgress = totalAlloc && totalAlloc > 0n
    ? Number((totalSold ?? 0n) * 10000n / totalAlloc) / 100
    : 0;

  const stageProgress = stageInfo && stageInfo.tokenAllocation > 0n
    ? Number(stageInfo.tokensSold * 10000n / stageInfo.tokenAllocation) / 100
    : 0;

  const canBuy = isConnected && isCorrectChain && presaleActive && !isEnded && ethInputWei > 0n;
  const canClaim = isConnected && isCorrectChain && isEnded && (claimable ?? 0n) > 0n;

  const handleBuy = () => {
    if (!canBuy) return;
    writeBuy({
      ...presaleContract,
      functionName: "buy",
      args: [referrer],
      value: ethInputWei,
    });
  };

  const handleClaim = () => {
    if (!canClaim) return;
    writeClaim({ ...presaleContract, functionName: "claim" });
  };

  return (
    <div className="glass rounded-2xl p-6 w-full max-w-md mx-auto glow animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Token Presale</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Stage {currentStage !== undefined ? Number(currentStage) + 1 : "–"} of {stageCount?.toString() ?? "–"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Price</p>
          <p className="text-lg font-mono font-bold text-brand-light">
            {stageInfo ? formatEther(stageInfo.tokenPrice) : "–"} ETH
          </p>
        </div>
      </div>

      {/* Overall progress */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Overall Progress</span>
          <span>{overallProgress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-surface-border rounded-full h-2.5 overflow-hidden">
          <div
            className="progress-shimmer h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(overallProgress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatTokenAmount(totalSold ?? 0n)} sold</span>
          <span>{formatTokenAmount(totalAlloc ?? 0n)} total</span>
        </div>
      </div>

      {/* Stage progress */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Stage {currentStage !== undefined ? Number(currentStage) + 1 : "–"} Progress</span>
          <span>{stageProgress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-surface-border rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-brand-light h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(stageProgress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatTokenAmount(stageInfo?.tokensSold ?? 0n)} sold</span>
          <span>{formatTokenAmount(stageInfo?.tokenAllocation ?? 0n)} cap</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-surface-card rounded-xl p-3 border border-surface-border">
          <p className="text-xs text-gray-400">ETH Raised</p>
          <p className="text-sm font-mono font-semibold mt-0.5">
            {formatEther(totalEthRaised ?? 0n).slice(0, 8)} ETH
          </p>
        </div>
        <div className="bg-surface-card rounded-xl p-3 border border-surface-border">
          <p className="text-xs text-gray-400">Ends In</p>
          <p className="text-sm font-mono font-semibold mt-0.5 text-brand-light">
            {isEnded ? "Ended" : countdown || "–"}
          </p>
        </div>
      </div>

      {/* Referral bonus badge */}
      {referralBps && referralBps > 0n && referrer !== zeroAddress && (
        <div className="bg-green-900/30 border border-green-700/50 rounded-lg px-3 py-2 text-xs text-green-400 mb-4">
          Referral active — {Number(referralBps) / 100}% bonus for your referrer
        </div>
      )}

      {/* Buy / Claim */}
      {!isEnded ? (
        <div className="space-y-3">
          <div className="relative">
            <input
              type="number"
              value={ethInput}
              onChange={(e) => setEthInput(e.target.value)}
              placeholder="0.0"
              min="0"
              step="0.001"
              className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 pr-16 text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors font-mono text-lg"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">ETH</span>
          </div>

          {estimatedTokens !== undefined && ethInputWei > 0n && (
            <div className="text-center text-sm text-gray-300">
              ≈ <span className="text-brand-light font-semibold font-mono">{formatTokenAmount(estimatedTokens as bigint)}</span> tokens
            </div>
          )}

          {!isConnected ? (
            <div className="w-full">
              <WalletButton />
            </div>
          ) : (
            <button
              onClick={handleBuy}
              disabled={!canBuy || isBuying || isBuyConfirming}
              className="w-full py-3.5 rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed font-bold text-white transition-all text-lg"
            >
              {isBuying || isBuyConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isBuying ? "Confirm in wallet…" : "Processing…"}
                </span>
              ) : (
                "Buy Now"
              )}
            </button>
          )}

          {isBuySuccess && (
            <p className="text-center text-sm text-green-400">Purchase confirmed! Your tokens will be claimable after the presale ends.</p>
          )}
          {buyError && (
            <p className="text-center text-sm text-red-400">
              {buyError.message.slice(0, 80)}…
            </p>
          )}
        </div>
      ) : (
        /* Claim section */
        <div className="space-y-3">
          <div className="bg-surface-card border border-surface-border rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Your Claimable Tokens</p>
            <p className="text-2xl font-bold font-mono text-brand-light">
              {formatTokenAmount(claimable as bigint ?? 0n)}
            </p>
          </div>

          {!isConnected ? (
            <WalletButton />
          ) : (
            <button
              onClick={handleClaim}
              disabled={!canClaim || isClaiming || isClaimConfirming}
              className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-white transition-all text-lg"
            >
              {isClaiming || isClaimConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Claiming…
                </span>
              ) : (
                "Claim Tokens"
              )}
            </button>
          )}

          {isClaimSuccess && (
            <p className="text-center text-sm text-green-400">Tokens claimed successfully!</p>
          )}
        </div>
      )}

      {/* Claimable balance during active presale */}
      {!isEnded && isConnected && (claimable as bigint) > 0n && (
        <div className="mt-3 text-center text-xs text-gray-500">
          You have <span className="text-brand-light">{formatTokenAmount(claimable as bigint)}</span> tokens locked — claimable after presale ends
        </div>
      )}
    </div>
  );
}
