"use client";

import { PresaleWidget } from "./PresaleWidget";
import { TeamClaimSection } from "./TeamClaimSection";
import { AirdropClaimSection } from "./AirdropClaimSection";

export function ClaimsSection() {
  return (
    <section id="claims" className="py-16 px-4 bg-gradient-to-b from-black via-sky-900/10 to-black">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-bangers text-5xl grad-yellow txt-shadow-lg mb-3" style={{ letterSpacing: "3px" }}>
            💰 CLAIM YOUR TOKENS
          </h2>
          <p className="font-fredoka text-gray-300 max-w-xl mx-auto">
            Manage your claims for presale, team vesting, and airdrop allocations. Connect your wallet to see your eligibility and claim your tokens when they unlock.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Presale Widget */}
          <div>
            <h3 className="font-bangers text-2xl txt-yellow mb-4 text-center" style={{ letterSpacing: "2px" }}>
              🚀 PRESALE
            </h3>
            <PresaleWidget />
          </div>

          {/* Team & Sponsors */}
          <div>
            <h3 className="font-bangers text-2xl txt-purple mb-4 text-center" style={{ letterSpacing: "2px" }}>
              👥 TEAM & SPONSORS
            </h3>
            <TeamClaimSection />
          </div>

          {/* Airdrop */}
          <div>
            <h3 className="font-bangers text-2xl txt-green mb-4 text-center" style={{ letterSpacing: "2px" }}>
              🎁 AIRDROP
            </h3>
            <AirdropClaimSection />
          </div>
        </div>

        {/* Info cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="meme-card p-4 text-center border-sky-400" style={{ borderColor: "#00BCD4" }}>
            <p className="font-bangers text-lg txt-blue mb-2" style={{ letterSpacing: "1px" }}>📊 VESTING SCHEDULE</p>
            <p className="font-fredoka text-xs text-gray-400">
              Tokens unlock monthly on the 15th of each month starting after presale ends. Check your schedule in each claim section.
            </p>
          </div>

          <div className="meme-card p-4 text-center border-purple-400" style={{ borderColor: "#9C27B0" }}>
            <p className="font-bangers text-lg txt-purple mb-2" style={{ letterSpacing: "1px" }}>🔐 WALLET REQUIRED</p>
            <p className="font-fredoka text-xs text-gray-400">
              You must connect your wallet to see your allocations and claim tokens. We support MetaMask and other Web3 wallets.
            </p>
          </div>

          <div className="meme-card p-4 text-center border-yellow-400" style={{ borderColor: "#FFC107" }}>
            <p className="font-bangers text-lg txt-yellow mb-2" style={{ letterSpacing: "1px" }}>💎 BASE NETWORK</p>
            <p className="font-fredoka text-xs text-gray-400">
              Make sure you're on the Base network (or Base Sepolia for testnet). Wrong network? Switch to claim.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
