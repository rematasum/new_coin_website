import { PresaleWidget } from "./PresaleWidget";
import { MascotDisplay } from "./MascotDisplay";

export function HeroSection() {
  return (
    <section className="sky-bg min-h-screen flex items-center pb-20 overflow-hidden relative" style={{ paddingTop: "110px" }} id="presale">

      {/* Animated clouds */}
      <div className="pointer-events-none" aria-hidden>
        <div className="cloud" style={{ width: 300, height: 80, top: "15%", left: "-10%", animation: "cloud1 35s linear infinite" }} />
        <div className="cloud" style={{ width: 200, height: 60, top: "60%", right: "-10%", animation: "cloud2 50s linear infinite" }} />
        <div className="cloud" style={{ width: 150, height: 50, top: "40%", left: "20%", animation: "cloud1 60s linear infinite 10s" }} />
      </div>

      {/* Floating decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <span className="absolute top-28 left-16 text-4xl" style={{ animation: "mascotFloat 4s ease-in-out infinite" }}>🌙</span>
        <span className="absolute top-40 right-20 text-3xl" style={{ animation: "mascotFloat 5s ease-in-out infinite 1s" }}>⭐</span>
        <span className="absolute bottom-28 left-24 text-2xl" style={{ animation: "mascotFloat 3.5s ease-in-out infinite 0.5s" }}>💫</span>
        <span className="absolute bottom-36 right-16 text-3xl" style={{ animation: "mascotFloat 4.5s ease-in-out infinite 2s" }}>🚀</span>
        {/* Glow blobs */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full opacity-10"
             style={{ background: "#4FB9E8", filter: "blur(80px)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-10"
             style={{ background: "#FFD43B", filter: "blur(60px)" }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full">

        {/* ── LEFT COLUMN ─────────────────────────────── */}
        <div className="text-center lg:text-left space-y-6 order-2 lg:order-1">

          {/* Live badge */}
          <div className="inline-flex items-center gap-2 meme-badge">
            <span className="w-2 h-2 rounded-full bg-meme-green" style={{ animation: "glowPulse 1.5s ease-in-out infinite" }} />
            🔥 PRESALE IS LIVE ON BASE
          </div>

          {/* Title */}
          <div>
            <h1 className="font-bangers leading-none txt-shadow-meme"
                style={{ fontSize: "clamp(4rem,10vw,7rem)", letterSpacing: "4px", color: "#FFD43B" }}>
              FLOZY
            </h1>
            <p className="font-bangers text-3xl sm:text-4xl txt-shadow-sm" style={{ color: "#4FB9E8", letterSpacing: "2px" }}>
              BIGGEST MEME ON BASE 🌊
            </p>
          </div>

          <p className="font-fredoka text-lg text-gray-300 max-w-md mx-auto lg:mx-0 leading-relaxed">
            5 presale stages · 250M tokens · Early buyers get up to{" "}
            <span className="txt-yellow font-bold">25% instant unlock</span>{" "}
            with 24-month vesting. Don't miss the wave! 🐶
          </p>

          {/* Mascot — MP4 animation with PNG fallback */}
          <div className="flex justify-center lg:justify-start">
            <MascotDisplay />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Network",  value: "Base L2",      icon: "🔵" },
              { label: "Supply",   value: "1,000,000,000", icon: "💎" },
              { label: "Presale",  value: "250,000,000",   icon: "🔥" },
              { label: "Payment",  value: "ETH only",      icon: "⚡" },
            ].map((s) => (
              <div key={s.label} className="meme-card p-3 text-center">
                <span className="text-xl">{s.icon}</span>
                <p className="font-fredoka text-xs text-gray-400 mt-1">{s.label}</p>
                <p className="font-fredoka text-xs font-bold text-white mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Social */}
          <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start">
            <a href="https://x.com/flozymeme" target="_blank" rel="noopener noreferrer"
               className="btn-meme-blue text-base px-5 py-2.5">
              𝕏 @flozymeme
            </a>
            <a href="#airdrop" className="btn-meme-orange text-base px-5 py-2.5">
              🎁 Free Airdrop
            </a>
          </div>
        </div>

        {/* ── RIGHT COLUMN — widget ────────────────────── */}
        <div className="flex justify-center lg:justify-end order-1 lg:order-2">
          <PresaleWidget />
        </div>
      </div>
    </section>
  );
}
