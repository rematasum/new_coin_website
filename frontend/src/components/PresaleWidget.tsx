"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther, zeroAddress } from "viem";
import { formatMonthlyVestingDates } from "@/lib/format";
import { PRESALE_ADDRESS, PRESALE_ABI, STAKING_ADDRESS, STAKING_ABI, STAKE_LOCK_DAYS, STAKE_REWARD_PCT, STAGE_CONFIG } from "@/config/contracts";
import { targetChain } from "@/config/wagmi";
import { formatTokenAmount, formatCountdown } from "@/lib/format";
import { WalletButton } from "./WalletButton";
import { StageTable } from "./StageTable";
import { VestingModal } from "./VestingModal";
import { AddTokenButton } from "./AddTokenButton";
import { notifyWebhook } from "@/lib/notify";

const presaleContract = { address: PRESALE_ADDRESS, abi: PRESALE_ABI } as const;

export function PresaleWidget() {
  const { address, isConnected, chainId } = useAccount();
  const [ethInput, setEthInput] = useState("");
  const [countdown, setCountdown] = useState("");
  const [showVesting, setShowVesting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

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
      { ...presaleContract, functionName: "vestingStart" },
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
  const vestingStart   = data?.[9]?.result as bigint | undefined;
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

  const { writeContract: writeClaimStake, data: claimStakeTxHash, isPending: isClaimStaking } = useWriteContract();
  const { isLoading: isClaimStakeConfirming, isSuccess: isClaimStakeSuccess } = useWaitForTransactionReceipt({ hash: claimStakeTxHash });

  // Stake pool cap — disables Claim & Stake when claimable exceeds pool capacity
  const { data: maxStakeAmount } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: "maxStakeAmount",
    query: { refetchInterval: 15_000 },
  });

  useEffect(() => {
    if (isBuySuccess) {
      refetch(); refetchClaimable(); setEthInput("");
      notifyWebhook({ type: "buy", wallet: address, ethAmount: ethInput, txHash: buyTxHash });
    }
  }, [isBuySuccess]);

  useEffect(() => {
    if (isClaimSuccess) {
      refetch(); refetchClaimable();
      notifyWebhook({ type: "claim", wallet: address, amount: formatEther(claimableAmount), txHash: claimTxHash });
    }
  }, [isClaimSuccess]);

  useEffect(() => {
    if (isClaimStakeSuccess) {
      refetch(); refetchClaimable();
      notifyWebhook({ type: "claim_and_stake", wallet: address, amount: formatEther(claimableAmount), txHash: claimStakeTxHash });
    }
  }, [isClaimStakeSuccess]);


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

  const claimableAmount: bigint = (claimable as bigint) ?? 0n;
  const maxStake: bigint = (maxStakeAmount as bigint) ?? 0n;
  const stakePoolFits = claimableAmount > 0n && claimableAmount <= maxStake;
  const canBuy        = isMounted && isConnected && isCorrectChain && presaleActive && !isEnded && ethInputWei > 0n;
  const canClaim      = isMounted && isConnected && isCorrectChain && isEnded && claimableAmount > 0n;
  const canClaimStake = canClaim && stakePoolFits && STAKING_ADDRESS !== "0x0000000000000000000000000000000000000000";
  // currentStage can equal stageCount (e.g. 5) once the presale auto-ends — clamp
  // for display purposes so the header doesn't say "Stage 6 of 5".
  const stageCountNum = stageCount !== undefined ? Number(stageCount) : 5;
  const rawStageIdx   = currentStage !== undefined ? Number(currentStage) : 0;
  const stageIdx      = Math.min(rawStageIdx, stageCountNum - 1);

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
              {isEnded
                ? "🔴 Presale ended — Claim is live"
                : <>Stage {stageIdx + 1} of {stageCount?.toString() ?? "–"} &nbsp;·&nbsp; 🟢 Live</>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 font-fredoka">{isEnded ? "Final Price" : "Price / Token"}</p>
            <p className="font-bangers text-xl txt-yellow" style={{ letterSpacing: "1px" }}>
              {isEnded
                ? `${STAGE_CONFIG[stageIdx]?.priceEth ?? "–"} ETH`
                : stageInfo ? `${parseFloat(formatEther(stageInfo.tokenPrice)).toFixed(7)} ETH` : "–"}
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

        {/* Stage progress — hidden once presale ends (Total Sold is at 100%) */}
        {!isEnded && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1 font-fredoka text-gray-400">
              <span>Stage {stageIdx + 1} progress</span>
              <span>{stagePct.toFixed(1)}%</span>
            </div>
            <div className="progress-track h-2.5">
              <div className="progress-fill" style={{ width: `${stagePct}%`, height: "100%" }} />
            </div>
          </div>
        )}

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

            {isMounted && isConnected ? (
              <button
                onClick={() => { if (!canBuy) return; writeBuy({ ...presaleContract, functionName: "buy", args: [], value: ethInputWei }); }}
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
            ) : (
              <div className="flex justify-center">
                <WalletButton />
              </div>
            )}

            {isBuySuccess && <p className="text-center font-fredoka text-sm text-meme-green">✅ Purchase confirmed! Claim after presale ends.</p>}
            {buyError && <p className="text-center font-fredoka text-xs text-red-400">{buyError.message.slice(0, 80)}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="meme-card p-4 text-center border-meme-green" style={{ borderColor: "#00E676" }}>
              <p className="font-fredoka text-xs text-gray-400 mb-1">Claimable Now</p>
              <p className="font-bangers text-3xl txt-green" style={{ letterSpacing: "2px" }}>
                {formatTokenAmount(claimableAmount)} FLZY
              </p>
              <p className="font-fredoka text-xs text-gray-500 mt-1">Instant unlock + vested portion</p>
            </div>

            {isMounted && isConnected ? (
              <div className="space-y-2">
                {/* Primary: Claim & Stake — eye-catching */}
                <button
                  onClick={() => { if (canClaimStake) writeClaimStake({ ...presaleContract, functionName: "claimAndStake" }); }}
                  disabled={!canClaimStake || isClaimStaking || isClaimStakeConfirming}
                  className="btn-meme-green w-full py-4 text-xl relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: canClaimStake ? "linear-gradient(135deg, #00E676 0%, #FFD43B 100%)" : undefined,
                    boxShadow: canClaimStake ? "0 0 24px rgba(0,230,118,0.4), 4px 4px 0 #000" : undefined,
                  }}
                  title={!stakePoolFits && claimableAmount > 0n ? "Stake pool can't cover the reward — use Claim Now, then partial-stake from the Staking widget." : undefined}
                >
                  <span className="absolute top-1 right-2 bg-black text-meme-yellow text-[10px] font-bangers px-2 py-0.5 rounded-full" style={{ letterSpacing: "1px" }}>
                    +{STAKE_REWARD_PCT}%
                  </span>
                  {isClaimStaking || isClaimStakeConfirming
                    ? "Claiming & Staking…"
                    : `💎 CLAIM & STAKE — earn +${STAKE_REWARD_PCT}% in ${STAKE_LOCK_DAYS}d`}
                </button>

                {/* Secondary: Claim Now — neutral */}
                <button
                  onClick={() => { if (canClaim) writeClaim({ ...presaleContract, functionName: "claim" }); }}
                  disabled={!canClaim || isClaiming || isClaimConfirming}
                  className="w-full py-2.5 text-sm font-fredoka font-semibold border-2 border-white/20 rounded-2xl text-white enabled:hover:border-meme-yellow enabled:hover:text-meme-yellow transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isClaiming || isClaimConfirming ? "Claiming…" : "Claim now (no stake)"}
                </button>

                {!stakePoolFits && claimableAmount > 0n && (
                  <p className="text-center font-fredoka text-[11px] text-yellow-300/80">
                    ⚠️ Stake pool too small for full amount — use Claim Now, then partial-stake from the Staking widget.
                  </p>
                )}
              </div>
            ) : (
              <WalletButton />
            )}

            {isClaimSuccess && (
              <p className="text-center font-fredoka text-sm text-meme-green">✅ Tokens claimed successfully!</p>
            )}
            {isClaimStakeSuccess && (
              <p className="text-center font-fredoka text-sm text-meme-green">✅ Claimed and staked! Track your position in the Staking section.</p>
            )}
          </div>
        )}

        {/* Always-visible add token + vesting links */}
        <div className="mt-3 flex flex-col gap-1">
          <AddTokenButton />
          <button onClick={() => setShowVesting(true)}
            className="w-full font-fredoka text-xs text-gray-500 hover:text-sky-base transition-colors underline underline-offset-2">
            📋 View your vesting schedule
          </button>
        </div>
      </div>

      {showVesting && <VestingModal onClose={() => setShowVesting(false)} vestingStart={vestingStart ?? 0n} />}
    </>
  );
}
