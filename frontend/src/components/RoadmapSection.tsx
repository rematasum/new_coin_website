const PHASES = [
  {
    phase: "Phase 1",
    title: "Foundation",
    status: "active",
    items: [
      "Smart contract development & audit",
      "Website & presale platform launch",
      "Community building",
      "Base network deployment",
    ],
  },
  {
    phase: "Phase 2",
    title: "Growth",
    status: "upcoming",
    items: [
      "DEX listing (Uniswap on Base)",
      "Token claim opens",
      "Liquidity pool launch",
      "Marketing campaign",
    ],
  },
  {
    phase: "Phase 3",
    title: "Expansion",
    status: "upcoming",
    items: [
      "CEX listings",
      "Partnerships & integrations",
      "Governance launch",
      "Cross-chain bridge",
    ],
  },
  {
    phase: "Phase 4",
    title: "Ecosystem",
    status: "upcoming",
    items: [
      "DeFi protocol integrations",
      "NFT utility launch",
      "DAO formation",
      "Full decentralization",
    ],
  },
];

export function RoadmapSection() {
  return (
    <section id="roadmap" className="py-24 border-t border-surface-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-extrabold mb-3">Roadmap</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            A clear path from presale to a fully decentralized ecosystem.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PHASES.map((phase) => (
            <div
              key={phase.phase}
              className={`glass rounded-2xl p-5 relative overflow-hidden ${
                phase.status === "active" ? "border-brand/50 glow" : ""
              }`}
            >
              {phase.status === "active" && (
                <div className="absolute top-3 right-3">
                  <span className="flex items-center gap-1 bg-green-900/50 border border-green-700/50 text-green-400 text-xs px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-slow" />
                    Active
                  </span>
                </div>
              )}

              <p className="text-xs text-brand-light font-semibold mb-1">{phase.phase}</p>
              <h3 className="text-lg font-bold mb-4">{phase.title}</h3>

              <ul className="space-y-2">
                {phase.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      phase.status === "active" ? "bg-brand" : "bg-surface-border"
                    }`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
