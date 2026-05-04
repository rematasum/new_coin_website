import { PresaleWidget } from "./PresaleWidget";

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center pt-16" id="presale">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left — copy */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/30 rounded-full px-4 py-1.5 text-sm text-brand-light">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-slow" />
            Presale is Live on Base Network
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight">
            The Future of{" "}
            <span className="gradient-text">DeFi Starts</span>{" "}
            Here
          </h1>

          <p className="text-lg text-gray-400 leading-relaxed max-w-lg">
            Get in early at the lowest possible price. Our staged presale rewards early believers
            with the best entry points before the public launch.
          </p>

          <div className="flex flex-wrap gap-4 text-sm">
            {[
              { label: "Network", value: "Base (L2)" },
              { label: "Payment", value: "ETH only" },
              { label: "Total Supply", value: "1,000,000,000" },
              { label: "Presale Allocation", value: "25%" },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-card border border-surface-border rounded-xl px-4 py-2.5">
                <p className="text-gray-500 text-xs">{stat.label}</p>
                <p className="font-semibold mt-0.5">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — presale widget */}
        <div className="flex justify-center lg:justify-end">
          <PresaleWidget />
        </div>
      </div>
    </section>
  );
}
