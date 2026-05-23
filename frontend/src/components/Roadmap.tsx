export function Roadmap() {
  const phases = [
    {
      phase: "Phase 1",
      title: "Launch & Presale",
      period: "Q2–Q3 2025",
      status: "active",
      items: [
        "Smart contract deployment on Base",
        "5-stage presale launch",
        "Community building & social media",
        "Airdrop campaign",
        "Website & branding",
      ],
    },
    {
      phase: "Phase 2",
      title: "DEX Listing",
      period: "Q3 2025",
      status: "upcoming",
      items: [
        "Uniswap V3 listing on Base",
        "Liquidity pool creation",
        "Token claim opens for presale buyers",
        "First monthly vesting unlock",
        "CoinGecko & CoinMarketCap listing",
      ],
    },
    {
      phase: "Phase 3",
      title: "Growth & Expansion",
      period: "Q4 2025",
      status: "upcoming",
      items: [
        "CEX listings (Tier-2 exchanges)",
        "Marketing partnerships",
        "Influencer campaigns",
        "Community governance proposals",
        "Cross-chain bridge exploration",
      ],
    },
    {
      phase: "Phase 4",
      title: "Ecosystem",
      period: "2026",
      status: "future",
      items: [
        "Tier-1 CEX applications",
        "NFT collection launch",
        "FLZY utility expansion",
        "DAO governance launch",
        "Major exchange listings 🚀",
      ],
    },
  ];

  const statusStyle: Record<string, { border: string; badge: string; dot: string; label: string }> = {
    active:   { border: "#FFD43B", badge: "bg-meme-yellow text-black",  dot: "bg-meme-yellow", label: "🔥 Active" },
    upcoming: { border: "#4FB9E8", badge: "bg-sky-base text-black",     dot: "bg-sky-base",    label: "⏳ Soon" },
    future:   { border: "#A855F7", badge: "bg-meme-purple text-white",  dot: "bg-meme-purple", label: "🔭 Future" },
  };

  return (
    <section id="roadmap" className="sky-bg py-20 relative overflow-hidden" style={{ scrollMarginTop: "110px" }}>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full opacity-10"
             style={{ background: "#A855F7", filter: "blur(80px)" }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 meme-badge mb-4">🗺️ ROADMAP</div>
          <h2 className="font-bangers txt-shadow-meme mb-2"
              style={{ fontSize: "clamp(2.5rem,7vw,5rem)", color: "#FFD43B", letterSpacing: "3px" }}>
            THE JOURNEY
          </h2>
          <p className="font-fredoka text-gray-300 text-lg">From presale to the moon 🚀</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {phases.map((phase) => {
            const style = statusStyle[phase.status];
            return (
              <div key={phase.phase} className="meme-card p-6 relative"
                   style={{ borderColor: style.border, borderWidth: 2 }}>
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: style.border }} />
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className={`inline-block font-fredoka text-xs font-bold px-2 py-1 rounded-full ${style.badge} mb-2`}>
                      {style.label}
                    </span>
                    <p className="font-bangers text-xl txt-yellow" style={{ letterSpacing: "1px" }}>{phase.phase}</p>
                    <p className="font-fredoka font-bold text-white text-lg">{phase.title}</p>
                  </div>
                  <span className="font-fredoka text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-lg mt-1">
                    {phase.period}
                  </span>
                </div>
                <ul className="space-y-2">
                  {phase.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${style.dot}`} />
                      <span className="font-fredoka text-sm text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
