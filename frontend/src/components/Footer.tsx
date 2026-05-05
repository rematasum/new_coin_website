export function Footer() {
  return (
    <footer className="border-t border-surface-border py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-lg shadow-glow">🌊</div>
            <span className="font-black text-lg gradient-text">FLOZY</span>
          </div>

          <p className="text-sm text-gray-500 text-center">
            Built on Base Network · ETH only · $FLZY
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <a href="#presale" className="hover:text-white transition-colors">Buy FLZY</a>
            <a href="#airdrop" className="hover:text-accent-yellow transition-colors">Airdrop</a>
            <a
              href="https://x.com/flozymeme"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent-blue transition-colors"
            >
              𝕏 Twitter
            </a>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-surface-border text-center text-xs text-gray-600">
          Presale participation involves risk. Cryptocurrency investments are volatile and unregulated in many jurisdictions. Never invest more than you can afford to lose.
        </div>
      </div>
    </footer>
  );
}
