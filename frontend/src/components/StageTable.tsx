import { STAGE_CONFIG } from "@/config/contracts";

interface StageTableProps {
  currentStage: number;
}

export function StageTable({ currentStage }: StageTableProps) {
  const indices = [currentStage - 1, currentStage, currentStage + 1].filter(
    (i) => i >= 0 && i < STAGE_CONFIG.length
  );

  return (
    <div className="rounded-2xl overflow-hidden border border-surface-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-light/50">
            <th className="text-left px-3 py-2 text-gray-400 font-semibold">Stage</th>
            <th className="text-right px-3 py-2 text-gray-400 font-semibold">Price (ETH)</th>
            <th className="text-right px-3 py-2 text-gray-400 font-semibold">Instant</th>
          </tr>
        </thead>
        <tbody>
          {indices.map((i) => {
            const s = STAGE_CONFIG[i];
            const isActive = i === currentStage;
            const isPast = i < currentStage;
            return (
              <tr
                key={i}
                className={`border-t border-surface-border ${
                  isActive
                    ? "bg-brand/10"
                    : isPast
                    ? "opacity-40"
                    : ""
                }`}
              >
                <td className="px-3 py-2.5 font-semibold flex items-center gap-2">
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-brand animate-pulse-slow inline-block" />
                  )}
                  {!isActive && <span className="w-2 h-2 inline-block" />}
                  <span className={isActive ? "text-brand-light" : ""}>{s.label}</span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  <span className={isActive ? "text-accent-yellow font-bold" : ""}>
                    {s.priceEth}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`font-semibold ${isActive ? "text-accent-green" : "text-gray-400"}`}>
                    {s.instantPct}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
