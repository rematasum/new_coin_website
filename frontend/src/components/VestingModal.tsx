"use client";

import { useAccount, useReadContract } from "wagmi";
import { zeroAddress } from "viem";
import { PRESALE_ADDRESS, PRESALE_ABI, STAGE_CONFIG } from "@/config/contracts";
import { formatTokenAmount } from "@/lib/format";

interface VestingModalProps {
  onClose: () => void;
  presaleEndTime: bigint;
}

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

  const hasAny = totalByStage?.some((v) => v > 0n);

  const endDate    = presaleEndTime > 0n ? new Date(Number(presaleEndTime) * 1000).toLocaleDateString() : "TBD";
  const vestEndDate = presaleEndTime > 0n
    ? new Date((Number(presaleEndTime) + 730 * 86400) * 1000).toLocaleDateString() : "TBD";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="meme-card w-full max-w-lg p-6" style={{ borderColor: "#4FB9E8", borderWidth: 3 }}
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bangers text-2xl txt-blue txt-shadow-sm" style={{ letterSpacing: "2px" }}>VESTING SCHEDULE</h2>
            <p className="font-fredoka text-xs text-gray-400 mt-0.5">730 days linear · starts at presale end</p>
          </div>
          <button onClick={onClose} className="btn-meme-orange w-10 h-10 p-0 text-xl rounded-full">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: "Vesting Start", value: endDate, color: "txt-blue" },
            { label: "Fully Vested",  value: vestEndDate, color: "txt-yellow" },
          ].map((s) => (
            <div key={s.label} className="meme-card p-3 text-center">
              <p className="font-fredoka text-xs text-gray-400">{s.label}</p>
              <p className={`font-bangers text-base mt-1 ${s.color}`} style={{ letterSpacing: "1px" }}>{s.value}</p>
            </div>
          ))}
        </div>

        {!address ? (
          <p className="font-fredoka text-center text-gray-400 py-6">Connect your wallet to see your schedule.</p>
        ) : !hasAny ? (
          <p className="font-fredoka text-center text-gray-400 py-6">No tokens purchased yet.</p>
        ) : (
          <div className="rounded-2xl overflow-hidden border-2 border-card-border">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(27,90,156,0.3)" }}>
                  <th className="text-left px-3 py-2 font-fredoka text-gray-400">Stage</th>
                  <th className="text-right px-3 py-2 font-fredoka text-gray-400">Total</th>
                  <th className="text-right px-3 py-2 font-fredoka text-gray-400">Instant</th>
                  <th className="text-right px-3 py-2 font-fredoka text-gray-400">Claimable</th>
                </tr>
              </thead>
              <tbody>
                {STAGE_CONFIG.map((cfg, i) => {
                  const total = totalByStage?.[i] ?? 0n;
                  if (total === 0n) return null;
                  const claimed   = claimedByStage?.[i] ?? 0n;
                  const claimable = claimableNow?.[i] ?? 0n;
                  return (
                    <tr key={i} className="border-t border-card-border">
                      <td className="px-3 py-2.5 font-fredoka font-bold txt-yellow">{cfg.label}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">{formatTokenAmount(total)}</td>
                      <td className="px-3 py-2.5 text-right font-fredoka font-bold txt-yellow">{cfg.instantPct}%</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-fredoka font-bold txt-green">{formatTokenAmount(claimable)}</span>
                        {claimed > 0n && <span className="text-gray-500 text-xs ml-1">+{formatTokenAmount(claimed)} claimed</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 space-y-1">
          {STAGE_CONFIG.map((cfg, i) => (
            <div key={i} className="flex justify-between font-fredoka text-xs text-gray-500">
              <span>{cfg.label}</span>
              <span>{cfg.instantPct}% instant · {100 - cfg.instantPct}% over 24 months</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
