"use client";

import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
import { zeroAddress } from "viem";
import { PRESALE_ADDRESS, PRESALE_ABI, STAGE_CONFIG } from "@/config/contracts";
import { formatTokenAmount } from "@/lib/format";

interface VestingModalProps {
  onClose: () => void;
  presaleEndTime: bigint;
}

const VESTING_DURATION_DAYS = 730;

export function VestingModal({ onClose, presaleEndTime }: VestingModalProps) {
  const { address } = useAccount();

  const { data: schedule } = useReadContract({
    address: PRESALE_ADDRESS,
    abi: PRESALE_ABI,
    functionName: "getVestingSchedule",
    args: [address ?? zeroAddress],
    query: { enabled: !!address },
  });

  const totalByStage   = schedule?.[0] as bigint[] | undefined;
  const claimedByStage = schedule?.[1] as bigint[] | undefined;
  const claimableNow   = schedule?.[2] as bigint[] | undefined;
  const fullyVestedAt  = schedule?.[3] as bigint[] | undefined;

  const hasAny = totalByStage?.some((v) => v > 0n);

  const endDate = presaleEndTime > 0n
    ? new Date(Number(presaleEndTime) * 1000).toLocaleDateString()
    : "TBD";

  const vestingEndDate = presaleEndTime > 0n
    ? new Date((Number(presaleEndTime) + VESTING_DURATION_DAYS * 86400) * 1000).toLocaleDateString()
    : "TBD";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="glass rounded-3xl w-full max-w-lg p-6 border border-accent-blue/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-black gradient-text-blue">Vesting Schedule</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Vesting starts at presale end · {VESTING_DURATION_DAYS} days linear
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center text-gray-400 hover:text-white transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Timeline */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-surface-card rounded-xl p-3 border border-surface-border">
            <p className="text-xs text-gray-400">Vesting Start</p>
            <p className="font-bold text-accent-blue mt-1">{endDate}</p>
          </div>
          <div className="bg-surface-card rounded-xl p-3 border border-surface-border">
            <p className="text-xs text-gray-400">Fully Vested</p>
            <p className="font-bold text-accent-green mt-1">{vestingEndDate}</p>
          </div>
        </div>

        {/* Per-stage table */}
        {!address ? (
          <p className="text-center text-gray-400 py-6">Connect your wallet to see your vesting schedule.</p>
        ) : !hasAny ? (
          <p className="text-center text-gray-400 py-6">You have no tokens purchased yet.</p>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-surface-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-light/50">
                  <th className="text-left px-3 py-2 text-gray-400 font-semibold">Stage</th>
                  <th className="text-right px-3 py-2 text-gray-400 font-semibold">Total</th>
                  <th className="text-right px-3 py-2 text-gray-400 font-semibold">Instant</th>
                  <th className="text-right px-3 py-2 text-gray-400 font-semibold">Claimable</th>
                </tr>
              </thead>
              <tbody>
                {STAGE_CONFIG.map((cfg, i) => {
                  const total = totalByStage?.[i] ?? 0n;
                  if (total === 0n) return null;
                  const instant = (total * BigInt(cfg.instantPct)) / 100n;
                  const claimable = claimableNow?.[i] ?? 0n;
                  const claimed = claimedByStage?.[i] ?? 0n;
                  return (
                    <tr key={i} className="border-t border-surface-border">
                      <td className="px-3 py-2.5 font-semibold text-brand-light">{cfg.label}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{formatTokenAmount(total)}</td>
                      <td className="px-3 py-2.5 text-right text-accent-yellow font-semibold">{cfg.instantPct}%</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-accent-green font-semibold">{formatTokenAmount(claimable)}</span>
                        {claimed > 0n && (
                          <span className="text-gray-500 text-xs ml-1">(+{formatTokenAmount(claimed)} claimed)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rules */}
        <div className="mt-4 space-y-1.5">
          {STAGE_CONFIG.map((cfg, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-500">
              <span>{cfg.label}</span>
              <span>{cfg.instantPct}% instant · {100 - cfg.instantPct}% over 24 months</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
