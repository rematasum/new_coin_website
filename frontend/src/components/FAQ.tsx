"use client";

import { useState } from "react";
import { AddTokenButton } from "./AddTokenButton";

const FAQS = [
  {
    q: "What is $FLZY?",
    a: "$FLZY is the native token of Flozy — the biggest meme coin launching on Base network. It combines the viral energy of meme culture with real utility and a transparent vesting system.",
  },
  {
    q: "How do I buy $FLZY in the presale?",
    a: "Connect your MetaMask wallet to the Base network (or Base Sepolia for testnet). Enter the amount of ETH you want to spend in the presale widget and click 'BUY $FLZY NOW'. Tokens are credited to your wallet address and can be claimed after presale ends.",
  },
  {
    q: "What is the vesting schedule?",
    a: "Each presale stage has an instant unlock percentage (Stage 1: 25%, Stage 2: 20%, Stage 3: 15%, Stage 4: 10%, Stage 5: 5%). The remaining tokens vest monthly over 24 months. Unlocks happen monthly (every ~30 days) starting from the first 15th after presale ends.",
  },
  {
    q: "When can I claim my tokens?",
    a: "You can claim your instant unlock portion as soon as the presale ends. Monthly vesting unlocks become available approximately every 30 days. Choose between 'Claim & Stake' (earn +20% over 90 days) or 'Claim Now' from the presale widget.",
  },
  {
    q: "How does staking work?",
    a: "Lock your $FLZY for 90 days and receive a fixed +20% reward when you withdraw. Rewards come from a finite 150M FLZY pool reserved at staking time. You can stake multiple times — each position has its own 90-day countdown.",
  },
  {
    q: "Can I unstake my $FLZY early?",
    a: "No. The 90-day lock is firm — there's no early-withdrawal option. Only stake what you're comfortable locking for the full period.",
  },
  {
    q: "What happens when the staking pool runs out?",
    a: "Each stake reserves its 20% reward up-front. When the 150M pool is fully reserved, new stakes are rejected. The 'Max single stake' figure in the widget shows the largest amount the pool can still accept.",
  },
  {
    q: "What network is $FLZY on?",
    a: "Flozy is deployed on Base — Coinbase's Layer 2 network built on Ethereum. Base offers fast transactions and very low fees. Make sure your MetaMask is connected to the Base network before buying.",
  },
  {
    q: "How many presale stages are there?",
    a: "There are 5 presale stages, each with 50,000,000 FLZY (50M) tokens. The price increases with each stage: Stage 1 is the cheapest at 0.000002 ETH/token, up to Stage 5 at 0.000004 ETH/token. Early buyers get the best price AND the highest instant unlock.",
  },
  {
    q: "How is the 1B supply distributed?",
    a: "250M Presale, 250M Team & Sponsors, 250M Liquidity, 150M Staking Rewards Pool, 100M Airdrop. All distributed atomically at deploy — the deployer keeps 0 tokens.",
  },
  {
    q: "Is the smart contract audited?",
    a: "The Flozy smart contracts are written in Solidity with security best practices (OpenZeppelin's ReentrancyGuard, Ownable). Contracts are verified on Basescan for full transparency. Community audit is ongoing.",
  },
  {
    q: "What happens to unsold tokens?",
    a: "Any unsold presale tokens are burned (sent to 0xdead address) after the presale ends. This ensures the token supply remains fair and deflationary.",
  },
];

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="sky-bg py-20 relative overflow-hidden" style={{ scrollMarginTop: "110px" }}>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 rounded-full opacity-10"
             style={{ background: "#FF6B00", filter: "blur(70px)" }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 meme-badge mb-4">❓ FAQ</div>
          <h2 className="font-bangers txt-shadow-meme mb-2"
              style={{ fontSize: "clamp(2.5rem,7vw,5rem)", color: "#FFD43B", letterSpacing: "3px" }}>
            GOT QUESTIONS?
          </h2>
          <p className="font-fredoka text-gray-300 text-lg">We got answers 🐶</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="meme-card overflow-hidden"
                 style={{ borderColor: openIdx === i ? "#FFD43B" : undefined, borderWidth: openIdx === i ? 2 : 2 }}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-fredoka font-bold text-white text-base pr-4">{faq.q}</span>
                <span className="font-bangers text-xl txt-yellow flex-shrink-0"
                      style={{ transform: openIdx === i ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>
                  +
                </span>
              </button>
              {openIdx === i && (
                <div className="px-5 pb-5">
                  <div className="border-t border-white/10 pt-3">
                    <p className="font-fredoka text-gray-300 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add to wallet card */}
        <div className="meme-card p-5 mt-4" style={{ borderColor: "#FFD43B", borderWidth: 2 }}>
          <p className="font-fredoka font-bold text-white text-base mb-1">
            🪙 How do I add $FLZY to my wallet?
          </p>
          <p className="font-fredoka text-gray-300 text-sm leading-relaxed mb-4">
            After claiming your tokens, click the button below to instantly add $FLZY to MetaMask, Coinbase Wallet, or any EIP-747 compatible wallet — no manual contract address needed.
          </p>
          <AddTokenButton className="border border-meme-yellow/60 rounded-lg py-2 px-4 hover:border-meme-yellow hover:text-meme-yellow" />
        </div>

        <div className="text-center mt-8">
          <p className="font-fredoka text-gray-400 text-sm mb-3">Still have questions?</p>
          <a href="https://x.com/flozymeme" target="_blank" rel="noopener noreferrer"
             className="btn-meme-blue text-base px-6 py-3">
            Ask on 𝕏 Twitter
          </a>
        </div>
      </div>
    </section>
  );
}
