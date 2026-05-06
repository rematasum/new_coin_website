import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer style={{ borderTop: "4px solid #FFD43B", background: "#050F24" }} className="py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-meme-yellow"
                 style={{ boxShadow: "2px 2px 0 #000" }}>
              <Image src="/logo.png" alt="Flozy" fill style={{ objectFit: "cover" }} />
            </div>
            <span className="font-bangers text-2xl txt-yellow" style={{ letterSpacing: "3px", textShadow: "2px 2px 0 #000" }}>
              FLOZY
            </span>
          </Link>

          <p className="font-fredoka text-sm text-gray-400 text-center">
            $FLZY · Built on Base Network · ETH only
          </p>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link href="/" className="font-fredoka text-sm text-gray-400 hover:txt-yellow transition-colors">Home</Link>
            <Link href="/tokenomics" className="font-fredoka text-sm text-gray-400 hover:txt-yellow transition-colors">Tokenomics</Link>
            <Link href="/vesting" className="font-fredoka text-sm text-gray-400 hover:txt-yellow transition-colors">Vesting</Link>
            <Link href="/airdrop" className="font-fredoka text-sm text-gray-400 hover:txt-yellow transition-colors">Airdrop</Link>
            <a href="https://x.com/flozymeme" target="_blank" rel="noopener noreferrer"
               className="btn-meme-blue text-sm px-4 py-2">
              𝕏 Twitter
            </a>
          </div>
        </div>

        <div className="mt-6 pt-6 text-center font-fredoka text-xs text-gray-600"
             style={{ borderTop: "1px solid #1B5A9C" }}>
          Crypto investments are volatile and unregulated. Never invest more than you can afford to lose.
        </div>
      </div>
    </footer>
  );
}
