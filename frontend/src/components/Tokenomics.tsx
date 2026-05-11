export function Tokenomics() {
  const slices = [
    { label: "Presale",               pct: 25, amount: "250M", color: "#FFD43B", icon: "🔥" },
    { label: "Liquidity Pool",        pct: 20, amount: "200M", color: "#4FB9E8", icon: "💧" },
    { label: "Community & Marketing", pct: 20, amount: "200M", color: "#A855F7", icon: "📣" },
    { label: "Sponsors",              pct: 15, amount: "150M", color: "#FF6B00", icon: "🤝" },
    { label: "Team & Dev",            pct: 10, amount: "100M", color: "#00E676", icon: "👨‍💻" },
    { label: "Reserve",               pct: 10, amount: "100M", color: "#FF2D55", icon: "🔒" },
  ];

  return (
    <section id="tokenomics" className="sky-bg py-20 relative overflow-hidden">
      {/* Glow blobs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full opacity-10"
             style={{ background: "#FFD43B", filter: "blur(80px)" }} />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 rounded-full opacity-10"
             style={{ background: "#4FB9E8", filter: "blur(60px)" }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 meme-badge mb-4">💎 TOKENOMICS</div>
          <h2 className="font-bangers txt-shadow-meme mb-2"
              style={{ fontSize: "clamp(2.5rem,7vw,5rem)", color: "#FFD43B", letterSpacing: "3px" }}>
            1,000,000,000 $FLZY
          </h2>
          <p className="font-fredoka text-gray-300 text-lg">Total Supply — Fixed Forever 🔒</p>
        </div>

        {/* Distribution grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
          {slices.map((s) => (
            <div key={s.label} className="meme-card p-5 text-center relative overflow-hidden group">
              {/* Color bar at top */}
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: s.color }} />
              <span className="text-3xl">{s.icon}</span>
              <p className="font-bangers text-3xl mt-2" style={{ color: s.color, letterSpacing: "1px" }}>
                {s.pct}%
              </p>
              <p className="font-fredoka font-bold text-white text-sm mt-0.5">{s.amount}</p>
              <p className="font-fredoka text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Vesting info table */}
        <div className="meme-card p-6">
          <h3 className="font-bangers text-2xl txt-yellow mb-4 text-center" style={{ letterSpacing: "2px" }}>
            📅 VESTING SCHEDULE
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(27,90,156,0.4)" }}>
                  <th className="text-left px-4 py-3 font-fredoka text-gray-300 rounded-tl-xl">Allocation</th>
                  <th className="text-center px-4 py-3 font-fredoka text-gray-300">Instant Unlock</th>
                  <th className="text-right px-4 py-3 font-fredoka text-gray-300 rounded-tr-xl">Vesting</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Presale — Stage 1", instant: "25%", vesting: "75% over 24 months" },
                  { name: "Presale — Stage 2", instant: "20%", vesting: "80% over 24 months" },
                  { name: "Presale — Stage 3", instant: "15%", vesting: "85% over 24 months" },
                  { name: "Presale — Stage 4", instant: "10%", vesting: "90% over 24 months" },
                  { name: "Presale — Stage 5", instant: "5%",  vesting: "95% over 24 months" },
                  { name: "Team & Dev",         instant: "0%",  vesting: "100% over 24 months" },
                  { name: "Sponsors",           instant: "0%",  vesting: "100% over 24 months" },
                  { name: "Liquidity Pool",     instant: "100%",vesting: "No vesting" },
                ].map((row, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="px-4 py-3 font-fredoka font-semibold text-white">{row.name}</td>
                    <td className="px-4 py-3 font-fredoka font-bold text-center txt-green">{row.instant}</td>
                    <td className="px-4 py-3 font-fredoka text-right text-gray-400">{row.vesting}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="font-fredoka text-xs text-gray-500 text-center mt-4">
            Monthly unlocks happen on the <span className="txt-yellow font-bold">15th of each month</span> starting from the first 15th after presale ends.
          </p>
        </div>
      </div>
    </section>
  );
}
