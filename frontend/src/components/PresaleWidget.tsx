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

  const currentStage   = data?.[0]?.result as bigint | undefined;
  const stageInfo      = data?.[1]?.result as { tokenPrice: bigint; tokenAllocation: bigint; tokensSold: bigint; instantUnlockBps: bigint } | undefined;
  const totalSold      = data?.[2]?.result as bigint | undefined;
  const totalAlloc     = data?.[3]?.result as bigint | undefined;
  const deadline       = data?.[4]?.result as bigint | undefined;
  const presaleActive  = data?.[5]?.result as boolean | undefined;
  const isEnded        = data?.[6]?.result as boolean | undefined;
  const totalEthRaised = data?.[7]?.result as bigint | undefined;
  const stageCount     = data?.[8]?.result as bigint | undefined;
  const presaleEndTime = data?.[10]?.result as bigint | undefined;

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

  const overallPct = totalAlloc && totalAlloc > 0n
    ? Math.min(Number((totalSold ?? 0n) * 10000n / totalAlloc) / 100, 100) : 0;

  const stagePct = stageInfo && stageInfo.tokenAllocation > 0n
    ? Math.min(Number(stageInfo.tokensSold * 10000n / stageInfo.tokenAllocation) / 100, 100) : 0;

  const canBuy   = isConnected && isCorrectChain && presaleActive && !isEnded && ethInputWei > 0n;
  const canClaim = isConnected && isCorrectChain && isEnded && (claimable as bigint ?? 0n) > 0n;
  const stageIdx = currentStage !== undefined ? Number(currentStage) : 0;

  return (
    <>
      <div className="meme-card-glow p-6 w-full max-w-md mx-auto relative">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bangers text-3xl grad-yellow txt-shadow-sm" style={{ letterSpacing: "2px" }}>
              $FLZY PRESALE
            </h2>
            <p className="font-fredoka text-sky-base text-sm mt-0.5">
              Stage {stageIdx + 1} of {stageCount?.toString() ?? "–"} &nbsp;·&nbsp; {isEnded ? "🔴 Ended" : "🟢 Live"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 font-fredoka">Price / Token</p>
            <p className="font-bangers text-xl txt-yellow" style={{ letterSpacing: "1px" }}>
              {stageInfo ? parseFloat(formatEther(stageInfo.tokenPrice)).toFixed(7) : "–"} ETH
            </p>
          </div>
        </div>

        {/* Overall progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-fredoka text-gray-300">Total Sold</span>
            <span className="font-bangers txt-yellow text-sm" style={{ letterSpacing: "1px" }}>
              {overallPct.toFixed(1)}% SOLD
            </span>
          </div>
          <div className="progress-track h-5">
            <div className="progress-fill" style={{ width: `${overallPct}%`, height: "100%" }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 font-fredoka mt-1">
            <span>{formatTokenAmount(totalSold ?? 0n)} FLZY</span>
            <span>{formatTokenAmount(totalAlloc ?? 0n)} FLZY total</span>
          </div>
        </div>

        {/* Stage progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1 font-fredoka text-gray-400">
            <span>Stage {stageIdx + 1} progress</span>
            <span>{stagePct.toFixed(1)}%</span>
          </div>
          <div className="progress-track h-2.5">
            <div className="progress-fill" style={{ width: `${stagePct}%`, height: "100%" }} />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="meme-card p-3 text-center">
            <p className="font-fredoka text-xs text-gray-400">ETH Raised</p>
            <p className="font-bangers txt-blue text-lg" style={{ letterSpacing: "1px" }}>
              {parseFloat(formatEther(totalEthRaised ?? 0n)).toFixed(4)} ETH
            </p>
          </div>
          <div className="meme-card p-3 text-center">
            <p className="font-fredoka text-xs text-gray-400">Ends In</p>
            <p className="font-bangers txt-yellow text-lg" style={{ letterSpacing: "1px" }}>
              {isEnded ? "ENDED ✓" : countdown || "–"}
            </p>
          </div>
        </div>

        {/* Stage table */}
        <div className="mb-4">
          <StageTable currentStage={stageIdx} />
        </div>

        {/* Buy / Claim */}
        {!isEnded ? (
          <div className="space-y-3">
            <div className="relative">
              <input
                type="number" value={ethInput} onChange={(e) => setEthInput(e.target.value)}
                placeholder="0.0" min="0" step="0.001"
                className="meme-input pr-16 font-mono text-lg"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bangers txt-yellow text-sm" style={{ letterSpacing: "1px" }}>ETH</span>
            </div>

            {estimatedTokens !== undefined && ethInputWei > 0n && (
              <div className="text-center font-fredoka text-sm text-gray-300">
                ≈ <span className="font-bangers txt-yellow text-xl" style={{ letterSpacing: "1px" }}>{formatTokenAmount(estimatedTokens as bigint)}</span> FLZY
              </div>
            )}

            {!isConnected ? (
              <div className="flex justify-center">
                <WalletButton />
              </div>
            ) : (
              <button
                onClick={() => { if (!canBuy) return; writeBuy({ ...presaleContract, functionName: "buy", args: [referrer], value: ethInputWei }); }}
                disabled={!canBuy || isBuying || isBuyConfirming}
                className="btn-meme-yellow w-full py-3.5 text-xl"
              >
                {isBuying || isBuyConfirming ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-3 border-black/30 border-t-black rounded-full animate-spin" />
                    {isBuying ? "Confirm in wallet…" : "Processing…"}
                  </span>
                ) : "🚀 BUY $FLZY NOW"}
              </button>
            )}

            {isBuySuccess && <p className="text-center font-fredoka text-sm text-meme-green">✅ Purchase confirmed! Claim after presale ends.</p>}
            {buyError && <p className="text-center font-fredoka text-xs text-red-400">{buyError.message.slice(0, 80)}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="meme-card p-4 text-center border-meme-green" style={{ borderColor: "#00E676" }}>
              <p className="font-fredoka text-xs text-gray-400 mb-1">Claimable Now</p>
              <p className="font-bangers text-3xl txt-green" style={{ letterSpacing: "2px" }}>
                {formatTokenAmount(claimable as bigint ?? 0n)} FLZY
              </p>
              <p className="font-fredoka text-xs text-gray-500 mt-1">Instant unlock + vested portion</p>
            </div>

            {!isConnected ? <WalletButton /> : (
              <button
                onClick={() => { if (canClaim) writeClaim({ ...presaleContract, functionName: "claim" }); }}
                disabled={!canClaim || isClaiming || isClaimConfirming}
                className="btn-meme-blue w-full py-3.5 text-xl"
              >
                {isClaiming || isClaimConfirming ? "Claiming…" : "💎 CLAIM $FLZY"}
              </button>
            )}

            {isClaimSuccess && <p className="text-center font-fredoka text-sm text-meme-green">✅ Tokens claimed successfully!</p>}
          </div>
        )}

        {/* Vesting link */}
        <button onClick={() => setShowVesting(true)}
          className="w-full mt-3 font-fredoka text-xs text-gray-500 hover:text-sky-base transition-colors underline underline-offset-2">
          📋 View your vesting schedule
        </button>
      </div>

      {showVesting && <VestingModal onClose={() => setShowVesting(false)} presaleEndTime={presaleEndTime ?? 0n} />}
    </>
  );
}
