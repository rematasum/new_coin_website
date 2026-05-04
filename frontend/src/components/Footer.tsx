export function Footer() {
  return (
    <footer className="border-t border-surface-border py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center font-bold text-xs">T</div>
            <span className="font-bold gradient-text">TOKEN</span>
          </div>

          <p className="text-sm text-gray-500 text-center">
            Built on Base Network · ETH only · No financial advice — DYOR
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <a href="#presale" className="hover:text-white transition-colors">Buy</a>
            <a href="#tokenomics" className="hover:text-white transition-colors">Tokenomics</a>
            <a href="#roadmap" className="hover:text-white transition-colors">Roadmap</a>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-surface-border text-center text-xs text-gray-600">
          Presale participation involves risk. Cryptocurrency investments are volatile and unregulated in many jurisdictions. Never invest more than you can afford to lose.
        </div>
      </div>
    </footer>
  );
}
