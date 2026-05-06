import type { Metadata } from "next";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Tokenomics — FLOZY ($FLZY)",
  description: "FLOZY token distribution: Presale, Team & Dev, Community Airdrop, CEX/DEX Liquidity. 1 billion total supply on Base.",
};

const DISTRIBUTION = [
  {
    label: "Presale",
    amount: 250_000_000,
    pct: 25,
    color: "#FFD43B",
    icon: "🔥",
    desc: "5 stages · 50M per stage · Unsold tokens burned",
  },
  {
    label: "Team & Dev",
    amount: 250_000_000,
    pct: 25,
    color: "#4FB9E8",
    icon: "⚙️",
    desc: "Core team & ongoing development — locked with vesting",
  },
  {
    label: "Community (Airdrop)",
    amount: 250_000_000,
    pct: 25,
    color: "#00E676",
    icon: "🎁",
    desc: "Free airdrop campaign · 6-month lock after distribution",
  },
  {
    label: "CEX / DEX Liquidity",
    amount: 250_000_000,
    pct: 25,
    color: "#FF6B35",
    icon: "💧",
    desc: "Exchange listings & on-chain liquidity pools",
  },
];

const fmt = (n: number) => n.toLocaleString("en-US");

export default function TokenomicsPage() {
  return (
    <main>
      <section className="min-h-screen py-24 px-4 sm:px-6 relative" style={{ paddingTop: "140px" }}>
        {/* Glow blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
               style={{ background: "#4FB9E8", filter: "blur(100px)" }} />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-10"
               style={{ background: "#FFD43B", filter: "blur(80px)" }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 meme-badge mb-4">
              💎 TOKEN DISTRIBUTION
            </div>
            <h1 className="font-bangers txt-shadow-meme mb-3"
                style={{ fontSize: "clamp(3rem,8vw,5rem)", letterSpacing: "4px", color: "#FFD43B" }}>
              TOKENOMICS
            </h1>
            <p className="font-fredoka text-lg text-gray-300 max-w-xl mx-auto">
              Total supply of{" "}
              <span className="txt-yellow font-bold">1,000,000,000 $FLZY</span>{" "}
              split equally across four categories. Simple, transparent, fair.
            </p>
          </div>

          {/* Visual bar chart */}
          <div className="meme-card p-6 mb-10">
            <p className="font-fredoka text-sm text-gray-400 mb-4 text-center">Distribution overview</p>
            <div className="flex h-10 rounded-xl overflow-hidden border-2 border-card-border">
              {DISTRIBUTION.map((d) => (
                <div key={d.label} style={{ width: `${d.pct}%`, background: d.color }}
                     title={`${d.label} — ${d.pct}%`} />
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {DISTRIBUTION.map((d) => (
                <div key={d.label} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: d.color }} />
                  <span className="font-fredoka text-xs text-gray-300">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Distribution cards */}
          <div className="grid sm:grid-cols-2 gap-5 mb-10">
            {DISTRIBUTION.map((d) => (
              <div key={d.label} className="meme-card p-5"
                   style={{ borderColor: d.color, borderLeftWidth: 4 }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{d.icon}</span>
                  <div>
                    <h3 className="font-bangers text-xl" style={{ color: d.color, letterSpacing: "2px" }}>
                      {d.label.toUpperCase()}
                    </h3>
                    <p className="font-fredoka text-xs text-gray-400">{d.pct}% of total supply</p>
                  </div>
                </div>

                {/* Amount bar */}
                <div className="mb-3">
                  <div className="progress-track h-3">
                    <div className="progress-fill" style={{ width: `${d.pct}%`, height: "100%", background: d.color }} />
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <p className="font-bangers text-2xl" style={{ color: d.color, letterSpacing: "1px" }}>
                    {fmt(d.amount)}
                  </p>
                  <p className="font-fredoka text-xs text-gray-500">$FLZY</p>
                </div>
                <p className="font-fredoka text-xs text-gray-400 mt-2 border-t border-card-border pt-2">
                  {d.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Summary table */}
          <div className="meme-card overflow-hidden mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(27,90,156,0.3)" }}>
                  <th className="text-left px-4 py-3 font-fredoka text-gray-400">Category</th>
                  <th className="text-right px-4 py-3 font-fredoka text-gray-400">Tokens</th>
                  <th className="text-right px-4 py-3 font-fredoka text-gray-400">Share</th>
                </tr>
              </thead>
              <tbody>
                {DISTRIBUTION.map((d, i) => (
                  <tr key={d.label} className="border-t border-card-border"
                      style={{ background: i % 2 === 0 ? "transparent" : "rgba(27,90,156,0.05)" }}>
                    <td className="px-4 py-3 font-fredoka font-bold flex items-center gap-2">
                      <span>{d.icon}</span>
                      <span style={{ color: d.color }}>{d.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-white">{fmt(d.amount)}</td>
                    <td className="px-4 py-3 text-right font-bangers" style={{ color: d.color, letterSpacing: "1px" }}>
                      {d.pct}%
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-meme-yellow" style={{ background: "rgba(255,212,59,0.05)" }}>
                  <td className="px-4 py-3 font-bangers txt-yellow" style={{ letterSpacing: "2px" }}>TOTAL</td>
                  <td className="px-4 py-3 text-right font-bangers txt-yellow text-base" style={{ letterSpacing: "1px" }}>
                    1,000,000,000
                  </td>
                  <td className="px-4 py-3 text-right font-bangers txt-yellow" style={{ letterSpacing: "1px" }}>100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Burn notice */}
          <div className="meme-card p-5 border-orange-500 text-center" style={{ borderColor: "#FF6B35" }}>
            <p className="text-3xl mb-2">🔥</p>
            <p className="font-bangers text-xl txt-shadow-sm" style={{ color: "#FF6B35", letterSpacing: "2px" }}>
              UNSOLD TOKEN BURN
            </p>
            <p className="font-fredoka text-sm text-gray-300 mt-1">
              Any presale tokens that remain unsold after the presale deadline will be permanently burned — sent to{" "}
              <code className="text-xs bg-black/30 px-1 rounded">address(0)</code>. This reduces total supply and protects holders.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
