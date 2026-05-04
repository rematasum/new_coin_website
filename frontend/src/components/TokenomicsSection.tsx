const ALLOCATIONS = [
  { label: "Presale", percentage: 25, color: "bg-brand" },
  { label: "Liquidity", percentage: 30, color: "bg-purple-500" },
  { label: "Team", percentage: 15, color: "bg-pink-500" },
  { label: "Marketing", percentage: 15, color: "bg-blue-500" },
  { label: "Development", percentage: 10, color: "bg-cyan-500" },
  { label: "Reserve", percentage: 5, color: "bg-gray-500" },
];

export function TokenomicsSection() {
  return (
    <section id="tokenomics" className="py-24 border-t border-surface-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-extrabold mb-3">Tokenomics</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Designed for long-term sustainability. 25% presale allocation, strong liquidity, and no hidden team vesting cliffs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Visual bar */}
          <div className="space-y-4">
            {ALLOCATIONS.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-gray-400 font-mono">{item.percentage}%</span>
                </div>
                <div className="w-full bg-surface-border rounded-full h-3 overflow-hidden">
                  <div
                    className={`${item.color} h-3 rounded-full transition-all duration-700`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Total Supply", value: "1,000,000,000", sub: "Fixed — no additional minting" },
              { label: "Presale Tokens", value: "250,000,000", sub: "25% of total supply" },
              { label: "Unsold Tokens", value: "Burned", sub: "After presale ends" },
              { label: "Network", value: "Base (L2)", sub: "Low fees, fast finality" },
            ].map((item) => (
              <div key={item.label} className="glass rounded-xl p-4">
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className="text-lg font-bold mt-1 gradient-text">{item.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
