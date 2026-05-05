import { PresaleWidget } from "./PresaleWidget";

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center pt-24 pb-16 stars-bg relative overflow-hidden" id="presale">
      {/* Floating space decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 text-4xl animate-float opacity-60">🌙</div>
        <div className="absolute top-32 right-16 text-3xl animate-float-slow opacity-50">⭐</div>
        <div className="absolute bottom-32 left-20 text-2xl animate-float opacity-40">💫</div>
        <div className="absolute bottom-20 right-24 text-4xl animate-bounce-slow opacity-50">🚀</div>
        <div className="absolute top-1/2 left-8 text-xl animate-twinkle opacity-30">✦</div>
        <div className="absolute top-1/3 right-8 text-xl animate-twinkle opacity-40" style={{animationDelay:"1s"}}>✦</div>
        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-blue/8 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left — copy */}
        <div className="space-y-7 text-center lg:text-left">
          {/* Mascot / Logo area */}
          <div className="flex justify-center lg:justify-start">
            <div className="w-28 h-28 rounded-3xl bg-surface-card border-2 border-brand/40 flex items-center justify-center text-7xl animate-float shadow-glow">
              🌊
            </div>
          </div>

          {/* Live badge */}
          <div className="inline-flex items-center gap-2 bg-brand/15 border border-brand/40 rounded-full px-4 py-1.5 text-sm font-bold text-brand-light">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-slow" />
            Presale Live on Base Network
          </div>

          <div>
            <h1 className="text-6xl sm:text-7xl font-black leading-none tracking-tight">
              <span className="gradient-text">FLOZY</span>
            </h1>
            <p className="text-2xl font-bold text-gray-300 mt-2">
              The Wave is Coming 🌊
            </p>
          </div>

          <p className="text-gray-400 text-lg max-w-md mx-auto lg:mx-0 leading-relaxed">
            5 stages. 250M tokens. Early buyers get up to{" "}
            <span className="text-accent-yellow font-bold">25% instant unlock</span>{" "}
            with 24-month vesting. Don't miss the wave.
          </p>

          {/* Social */}
          <div className="flex items-center gap-3 justify-center lg:justify-start">
            <a
              href="https://x.com/flozymeme"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-bubble bg-surface-card border-2 border-surface-border hover:border-accent-blue transition-colors font-bold text-sm"
            >
              𝕏 @flozymeme
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Network",  value: "Base L2" },
              { label: "Supply",   value: "1,000,000,000" },
              { label: "Presale",  value: "250,000,000" },
              { label: "Payment",  value: "ETH only" },
            ].map((s) => (
              <div key={s.label} className="bg-surface-card border border-surface-border rounded-2xl p-3 text-center">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-sm font-black mt-0.5 text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — widget */}
        <div className="flex justify-center lg:justify-end">
          <PresaleWidget />
        </div>
      </div>
    </section>
  );
}
