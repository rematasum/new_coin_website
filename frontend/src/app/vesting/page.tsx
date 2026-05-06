import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { STAGE_CONFIG } from "@/config/contracts";

export const metadata: Metadata = {
  title: "Vesting Schedule — FLOZY ($FLZY)",
  description: "FLOZY presale vesting: stage-based instant unlock from 25% to 5%, with 24-month linear vesting for the remainder.",
};

export default function VestingPage() {
  return (
    <main>
      <section className="min-h-screen py-24 px-4 sm:px-6 relative" style={{ paddingTop: "140px" }}>
        {/* Glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full opacity-10"
               style={{ background: "#4FB9E8", filter: "blur(100px)" }} />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 meme-badge mb-4">
              📋 UNLOCK SCHEDULE
            </div>
            <h1 className="font-bangers txt-shadow-meme mb-3"
                style={{ fontSize: "clamp(3rem,8vw,5rem)", letterSpacing: "4px", color: "#4FB9E8" }}>
              VESTING
            </h1>
            <p className="font-fredoka text-lg text-gray-300 max-w-xl mx-auto">
              Tokens purchased in earlier stages unlock faster. All remaining tokens vest{" "}
              <span className="txt-blue font-bold">linearly over 24 months</span>{" "}
              starting from presale end.
            </p>
          </div>

          {/* How it works */}
          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            {[
              { icon: "🛒", title: "Buy in Presale", desc: "Purchase $FLZY in any stage. Stage determines your instant unlock %" },
              { icon: "⏳", title: "Presale Ends", desc: "Instant unlock % is claimable immediately when presale ends" },
              { icon: "📈", title: "24-Month Vest", desc: "Remaining tokens unlock linearly every second for 730 days" },
            ].map((s) => (
              <div key={s.title} className="meme-card p-5 text-center">
                <p className="text-3xl mb-2">{s.icon}</p>
                <p className="font-bangers txt-blue mb-1" style={{ letterSpacing: "1px" }}>{s.title.toUpperCase()}</p>
                <p className="font-fredoka text-xs text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Stage breakdown */}
          <div className="meme-card overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-card-border flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h2 className="font-bangers txt-yellow text-xl" style={{ letterSpacing: "2px" }}>
                STAGE-BY-STAGE BREAKDOWN
              </h2>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(27,90,156,0.3)" }}>
                  <th className="text-left px-4 py-3 font-fredoka text-gray-400">Stage</th>
                  <th className="text-right px-4 py-3 font-fredoka text-gray-400">Price / FLZY</th>
                  <th className="text-right px-4 py-3 font-fredoka text-gray-400">Instant Unlock</th>
                  <th className="text-right px-4 py-3 font-fredoka text-gray-400">Vested (24 mo)</th>
                </tr>
              </thead>
              <tbody>
                {STAGE_CONFIG.map((s, i) => {
                  const vestedPct = 100 - s.instantPct;
                  return (
                    <tr key={i} className="border-t border-card-border"
                        style={{ background: i === 0 ? "rgba(255,212,59,0.05)" : "transparent" }}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {i === 0 && (
                            <span className="text-xs font-fredoka bg-meme-yellow text-black px-1.5 py-0.5 rounded font-bold">
                              BEST
                            </span>
                          )}
                          <span className="font-fredoka font-bold txt-yellow">{s.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-gray-300">
                        {s.priceEth} ETH
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-bangers txt-green text-lg" style={{ letterSpacing: "1px" }}>
                          {s.instantPct}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-fredoka text-gray-300">{vestedPct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Visual bars */}
            <div className="px-5 py-5 space-y-3 border-t border-card-border">
              <p className="font-fredoka text-xs text-gray-400 mb-4">Instant vs. Vested proportion per stage</p>
              {STAGE_CONFIG.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="font-fredoka text-xs text-gray-400 w-16 flex-shrink-0">{s.label}</span>
                  <div className="flex-1 flex h-5 rounded overflow-hidden">
                    <div style={{ width: `${s.instantPct}%`, background: "#00E676" }}
                         className="flex items-center justify-center">
                      <span className="font-fredoka text-[10px] font-bold text-black">{s.instantPct}%</span>
                    </div>
                    <div style={{ width: `${100 - s.instantPct}%`, background: "rgba(79,185,232,0.3)" }}
                         className="flex items-center justify-center">
                      <span className="font-fredoka text-[10px] text-sky-300">{100 - s.instantPct}%</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block bg-green-400" />
                  <span className="font-fredoka text-xs text-gray-400">Instant unlock</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "rgba(79,185,232,0.3)" }} />
                  <span className="font-fredoka text-xs text-gray-400">24-month linear vest</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key facts */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {[
              { icon: "🔓", label: "Vesting Start", value: "Presale end date", color: "txt-blue" },
              { icon: "📅", label: "Vesting Duration", value: "24 months (730 days)", color: "txt-yellow" },
              { icon: "⚡", label: "Vest Frequency", value: "Continuous (per second)", color: "txt-green" },
              { icon: "🎯", label: "Best Instant Unlock", value: "25% — Stage 1", color: "txt-yellow" },
            ].map((f) => (
              <div key={f.label} className="meme-card p-4 flex items-center gap-4">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <p className="font-fredoka text-xs text-gray-400">{f.label}</p>
                  <p className={`font-bangers text-lg ${f.color}`} style={{ letterSpacing: "1px" }}>{f.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Note */}
          <div className="meme-card p-5 text-center" style={{ borderColor: "#4FB9E8" }}>
            <p className="font-fredoka text-sm text-gray-300">
              💡 You can buy across <span className="txt-yellow font-bold">multiple stages</span>. Each purchase tracks
              its own vesting schedule independently — your wallet can hold tokens from different stages,
              each with its respective unlock rate.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
