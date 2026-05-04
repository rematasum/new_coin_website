"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What is the Base network?",
    a: "Base is a Layer 2 blockchain built on Ethereum by Coinbase. It offers the same security as Ethereum but with much lower transaction fees (typically < $0.01) and faster confirmation times.",
  },
  {
    q: "How do I participate in the presale?",
    a: "Connect your MetaMask wallet, make sure it's set to the Base network, and enter the amount of ETH you want to spend. Click 'Buy Now' and confirm the transaction. Your tokens will be locked until the presale ends.",
  },
  {
    q: "When can I claim my tokens?",
    a: "Tokens become claimable as soon as the presale ends — either when all allocations are sold out or when the deadline passes. Visit the website and click 'Claim Tokens'.",
  },
  {
    q: "What happens to unsold tokens?",
    a: "Any tokens not sold during the presale will be burned (sent to a dead address permanently). This ensures the token supply is reduced and existing holders benefit.",
  },
  {
    q: "How does the staged pricing work?",
    a: "The presale is divided into stages. Each stage has a fixed token allocation and price. When Stage 1 sells out, the price increases for Stage 2, and so on. Early buyers always get the best price.",
  },
  {
    q: "What is the referral program?",
    a: "When someone uses your referral link to buy tokens, they (or you — depending on the configuration) receive a bonus percentage of tokens on top of their purchase. Share your wallet address as a referral parameter: ?ref=0x...",
  },
  {
    q: "Is the smart contract audited?",
    a: "The contract code is open source and verified on Basescan. We strongly recommend reviewing the code yourself or having it audited by a trusted third party before participating.",
  },
  {
    q: "How do I add ETH to Base network?",
    a: "You can bridge ETH from Ethereum mainnet to Base using the official Base Bridge (bridge.base.org), or buy ETH directly on Base through Coinbase.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 border-t border-surface-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-extrabold mb-3">FAQ</h2>
          <p className="text-gray-400">Everything you need to know before buying.</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <div key={i} className="glass rounded-xl overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-medium pr-4">{item.q}</span>
                <span className={`text-brand-light text-lg flex-shrink-0 transition-transform duration-200 ${open === i ? "rotate-45" : ""}`}>
                  +
                </span>
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-gray-400 text-sm leading-relaxed border-t border-surface-border pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
