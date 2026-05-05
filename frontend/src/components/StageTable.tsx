import { STAGE_CONFIG } from "@/config/contracts";

interface StageTableProps {
  currentStage: number;
}

export function StageTable({ currentStage }: StageTableProps) {
  const indices = [currentStage - 1, currentStage, currentStage + 1].filter(
    (i) => i >= 0 && i < STAGE_CONFIG.length
  );

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-card-border">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "rgba(27,90,156,0.3)" }}>
            <th className="text-left px-3 py-2 font-fredoka text-gray-400">Stage</th>
            <th className="text-right px-3 py-2 font-fredoka text-gray-400">ETH / Token</th>
            <th className="text-right px-3 py-2 font-fredoka text-gray-400">Instant</th>
          </tr>
        </thead>
        <tbody>
          {indices.map((i) => {
            const s = STAGE_CONFIG[i];
            const isActive = i === currentStage;
            const isPast = i < currentStage;
            return (
              <tr key={i} className="border-t border-card-border"
                  style={{ background: isActive ? "rgba(255,212,59,0.08)" : "transparent" }}>
                <td className="px-3 py-2.5 flex items-center gap-2">
                  {isActive
                    ? <span className="w-2 h-2 rounded-full bg-meme-yellow animate-pulse inline-block" />
                    : <span className="w-2 h-2 inline-block" />}
                  <span className={`font-fredoka font-bold ${isActive ? "txt-yellow" : isPast ? "text-gray-600" : "text-gray-400"}`}>
                    {s.label}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">
                  <span className={isActive ? "font-bold txt-yellow" : isPast ? "text-gray-600" : "text-gray-400"}>
                    {s.priceEth}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`font-fredoka font-bold ${isActive ? "txt-green" : isPast ? "text-gray-600" : "text-gray-400"}`}>
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
