"use client";

import { useState, useEffect } from "react";
import { useAccount, useBlock, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther, zeroAddress } from "viem";
import {
  STAKING_ADDRESS, STAKING_ABI, TOKEN_ADDRESS, TOKEN_ABI,
  STAKE_LOCK_DAYS, STAKE_REWARD_PCT,
} from "@/config/contracts";
import { targetChain } from "@/config/wagmi";
import { formatTokenAmount, formatCountdown } from "@/lib/format";
import { WalletButton } from "./WalletButton";
import { notifyWebhook } from "@/lib/notify";

const stakingContract = { address: STAKING_ADDRESS, abi: STAKING_ABI } as const;
const tokenContract   = { address: TOKEN_ADDRESS, abi: TOKEN_ABI } as const;

const STAKING_POOL_TOTAL = parseEther("150000000"); // 150M

type Position = {
  amount: bigint;
  reward: bigint;
  unlockTime: bigint;
  withdrawn: boolean;
};

export function StakingWidget() {
  const { address, isConnected, chainId } = useAccount();
  const [amount, setAmount] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const isCorrectChain = chainId === targetChain.id;

  // Use the chain's latest block timestamp (not Date.now()) so countdowns
  // reflect the same clock the contract uses. On mainnet this differs from
  // wall-clock by at most ~15s; in local Hardhat with time-travel it can
  // differ by years, which is the case we need to handle correctly.
  const { data: latestBlock } = useBlock({ watch: true });
  const chainNow = latestBlock ? Number(latestBlock.timestamp) : Math.floor(Date.now() / 1000);

  // Pool & user reads
  const { data: poolData, refetch: refetchPool } = useReadContracts({
    contracts: [
      { ...stakingContract, functionName: "rewardPoolRemaining" },
      { ...stakingContract, functionName: "maxStakeAmount" },
      { ...stakingContract, functionName: "totalPrincipalStaked" },
    ],
    query: { refetchInterval: 15_000 },
  });
  const rewardPoolRemaining = (poolData?.[0]?.result as bigint | undefined) ?? 0n;
  const maxStake            = (poolData?.[1]?.result as bigint | undefined) ?? 0n;
  const totalStaked         = (poolData?.[2]?.result as bigint | undefined) ?? 0n;

  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    ...tokenContract,
    functionName: "balanceOf",
    args: [address ?? zeroAddress],
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    ...tokenContract,
    functionName: "allowance",
    args: [address ?? zeroAddress, STAKING_ADDRESS],
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const { data: positions, refetch: refetchPositions } = useReadContract({
    ...stakingContract,
    functionName: "getPositions",
    args: [address ?? zeroAddress],
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  // Writes
  const { writeContract: writeApprove, data: approveTxHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });

  const { writeContract: writeStake, data: stakeTxHash, isPending: isStaking } = useWriteContract();
  const { isLoading: isStakeConfirming, isSuccess: isStakeSuccess } = useWaitForTransactionReceipt({ hash: stakeTxHash });

  const { writeContract: writeWithdraw, data: withdrawTxHash, isPending: isWithdrawing } = useWriteContract();
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawTxHash });

  const { writeContract: writeWithdrawAll, data: withdrawAllTxHash, isPending: isWithdrawingAll } = useWriteContract();
  const { isLoading: isWithdrawAllConfirming, isSuccess: isWithdrawAllSuccess } = useWaitForTransactionReceipt({ hash: withdrawAllTxHash });

  useEffect(() => {
    if (isApproveSuccess) refetchAllowance();
  }, [isApproveSuccess]);

  useEffect(() => {
    if (isStakeSuccess) {
      refetchPool(); refetchBalance(); refetchAllowance(); refetchPositions();
      setAmount("");
      notifyWebhook({ type: "stake", wallet: address, amount, txHash: stakeTxHash });
    }
  }, [isStakeSuccess]);

  useEffect(() => {
    if (isWithdrawSuccess || isWithdrawAllSuccess) {
      refetchPool(); refetchBalance(); refetchPositions();
    }
  }, [isWithdrawSuccess, isWithdrawAllSuccess]);

  // Derived
  const amountWei = amount ? parseEther(amount) : 0n;
  const userBal   = (userBalance as bigint | undefined) ?? 0n;
  const userAllow = (allowance as bigint | undefined) ?? 0n;
  const positionList = (positions as Position[] | undefined) ?? [];

  const stakeMaxForUser = userBal < maxStake ? userBal : maxStake;
  const needsApproval   = amountWei > 0n && userAllow < amountWei;
  const amountTooBig    = amountWei > userBal || amountWei > maxStake;
  const canStake        = isMounted && isConnected && isCorrectChain && amountWei > 0n && !amountTooBig && !needsApproval;
  const canApprove      = isMounted && isConnected && isCorrectChain && amountWei > 0n && needsApproval && amountWei <= userBal;

  const poolUsedPct = STAKING_POOL_TOTAL > 0n
    ? Math.min(Number((STAKING_POOL_TOTAL - rewardPoolRemaining) * 10000n / STAKING_POOL_TOTAL) / 100, 100)
    : 0;

  const expectedReward = amountWei > 0n ? (amountWei * BigInt(STAKE_REWARD_PCT * 100)) / 10000n : 0n;
  const expectedPayout = amountWei + expectedReward;

  function setMax() {
    setAmount(formatEther(stakeMaxForUser));
  }

  return (
    <div className="meme-card-glow p-6 w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-5">
        <h2 className="font-bangers text-3xl grad-yellow txt-shadow-sm" style={{ letterSpacing: "2px" }}>
          🔒 STAKE $FLZY
        </h2>
        <p className="font-fredoka text-sm text-gray-300 mt-1">
          Lock for <span className="txt-yellow font-bold">{STAKE_LOCK_DAYS} days</span>, earn a fixed{" "}
          <span className="txt-green font-bold">+{STAKE_REWARD_PCT}%</span> reward
        </p>
      </div>

      {/* Pool stats */}
      <div className="meme-card p-4 mb-5">
        <div className="flex justify-between text-xs font-fredoka text-gray-400 mb-1">
          <span>Reward pool</span>
          <span>{poolUsedPct.toFixed(1)}% reserved</span>
        </div>
        <div className="progress-track h-3">
          <div className="progress-fill" style={{ width: `${poolUsedPct}%`, height: "100%" }} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div>
            <p className="font-fredoka text-[10px] text-gray-400">Remaining</p>
            <p className="font-bangers text-base txt-green" style={{ letterSpacing: "1px" }}>
              {formatTokenAmount(rewardPoolRemaining)}
            </p>
          </div>
          <div>
            <p className="font-fredoka text-[10px] text-gray-400">Max single stake</p>
            <p className="font-bangers text-base txt-yellow" style={{ letterSpacing: "1px" }}>
              {formatTokenAmount(maxStake)}
            </p>
          </div>
          <div>
            <p className="font-fredoka text-[10px] text-gray-400">Total staked</p>
            <p className="font-bangers text-base txt-blue" style={{ letterSpacing: "1px" }}>
              {formatTokenAmount(totalStaked)}
            </p>
          </div>
        </div>
      </div>

      {/* Stake form */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            min="0"
            className="meme-input pr-20 font-mono text-lg"
          />
          <button
            onClick={setMax}
            disabled={!isConnected}
            className="absolute right-3 top-1/2 -translate-y-1/2 font-bangers text-xs px-2 py-1 rounded border border-meme-yellow text-meme-yellow hover:bg-meme-yellow hover:text-black transition-colors disabled:opacity-30"
            style={{ letterSpacing: "1px" }}
          >
            MAX
          </button>
        </div>

        {amountWei > 0n && (
          <div className="meme-card p-3 text-center text-sm font-fredoka">
            <span className="text-gray-400">In {STAKE_LOCK_DAYS}d you'll receive </span>
            <span className="font-bangers txt-green text-lg" style={{ letterSpacing: "1px" }}>
              {formatTokenAmount(expectedPayout)}
            </span>
            <span className="text-gray-400"> FLZY</span>
            <span className="block text-[11px] text-gray-500 mt-0.5">
              {formatTokenAmount(amountWei)} principal + {formatTokenAmount(expectedReward)} reward
            </span>
          </div>
        )}

        {!isMounted || !isConnected ? (
          <div className="flex justify-center"><WalletButton /></div>
        ) : needsApproval ? (
          <button
            onClick={() => { if (canApprove) writeApprove({ ...tokenContract, functionName: "approve", args: [STAKING_ADDRESS, amountWei] }); }}
            disabled={!canApprove || isApproving || isApproveConfirming}
            className="btn-meme-yellow w-full py-3.5 text-lg"
          >
            {isApproving || isApproveConfirming ? "Approving…" : `1️⃣ Approve ${amount} FLZY`}
          </button>
        ) : (
          <button
            onClick={() => { if (canStake) writeStake({ ...stakingContract, functionName: "stake", args: [amountWei] }); }}
            disabled={!canStake || isStaking || isStakeConfirming}
            className="btn-meme-green w-full py-3.5 text-lg"
            style={{ boxShadow: canStake ? "0 0 16px rgba(0,230,118,0.4), 4px 4px 0 #000" : undefined }}
          >
            {isStaking || isStakeConfirming
              ? "Staking…"
              : amountTooBig
                ? amountWei > maxStake ? "Exceeds pool cap" : "Exceeds balance"
                : `🚀 Stake for ${STAKE_LOCK_DAYS} days`}
          </button>
        )}

        {amountTooBig && amountWei > maxStake && (
          <p className="text-center font-fredoka text-[11px] text-yellow-300/80">
            ⚠️ Pool can only cover up to {formatTokenAmount(maxStake)} FLZY right now.
          </p>
        )}

        {isStakeSuccess && (
          <p className="text-center font-fredoka text-sm text-meme-green">✅ Stake created! See your position below.</p>
        )}
      </div>

      {/* Positions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bangers text-xl txt-yellow" style={{ letterSpacing: "2px" }}>
            YOUR POSITIONS ({positionList.length})
          </h3>
          {positionList.some((p) => !p.withdrawn && Number(p.unlockTime) <= chainNow) && (
            <button
              onClick={() => writeWithdrawAll({ ...stakingContract, functionName: "withdrawAll" })}
              disabled={isWithdrawingAll || isWithdrawAllConfirming}
              className="btn-meme-blue text-xs px-3 py-1.5"
            >
              {isWithdrawingAll || isWithdrawAllConfirming ? "Withdrawing…" : "Withdraw All Matured"}
            </button>
          )}
        </div>

        {positionList.length === 0 ? (
          <p className="font-fredoka text-sm text-gray-500 text-center py-6">
            No active stakes yet. Stake $FLZY above to start earning +{STAKE_REWARD_PCT}%.
          </p>
        ) : (
          <div className="space-y-2">
            {positionList.map((p, i) => {
              const matured = !p.withdrawn && Number(p.unlockTime) <= chainNow;
              const secondsLeft = Number(p.unlockTime) - chainNow;
              return (
                <div
                  key={i}
                  className="meme-card p-3 flex items-center justify-between"
                  style={{
                    opacity: p.withdrawn ? 0.4 : 1,
                    borderColor: matured ? "#00E676" : undefined,
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bangers txt-yellow text-sm" style={{ letterSpacing: "1px" }}>
                        #{i + 1}
                      </span>
                      <span className="font-bangers text-base text-white">
                        {formatTokenAmount(p.amount)} FLZY
                      </span>
                      <span className="font-fredoka text-xs text-gray-400">
                        + {formatTokenAmount(p.reward)} reward
                      </span>
                    </div>
                    <p className="font-fredoka text-[11px] text-gray-500 mt-0.5">
                      {p.withdrawn ? (
                        <span>✓ Withdrawn</span>
                      ) : matured ? (
                        <span className="txt-green">✓ Ready to withdraw</span>
                      ) : (
                        <span>🔒 Unlocks in {formatCountdown(secondsLeft)}</span>
                      )}
                    </p>
                  </div>
                  {!p.withdrawn && matured && (
                    <button
                      onClick={() => writeWithdraw({ ...stakingContract, functionName: "withdraw", args: [BigInt(i)] })}
                      disabled={isWithdrawing || isWithdrawConfirming}
                      className="btn-meme-green text-xs px-3 py-1.5"
                    >
                      {isWithdrawing || isWithdrawConfirming ? "…" : "Withdraw"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
