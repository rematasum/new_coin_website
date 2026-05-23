"use client";

import { StakingWidget } from "./StakingWidget";
import { STAKE_LOCK_DAYS, STAKE_REWARD_PCT } from "@/config/contracts";

export function StakingSection() {
  return (
    <section id="stake" className="py-16 px-4 bg-gradient-to-b from-black via-sky-900/10 to-black">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 meme-badge mb-4">🔒 STAKE</div>
          <h2 className="font-bangers grad-yellow txt-shadow-lg mb-3"
              style={{ fontSize: "clamp(2.5rem,6vw,4.5rem)", letterSpacing: "3px" }}>
            EARN +{STAKE_REWARD_PCT}% IN {STAKE_LOCK_DAYS} DAYS
          </h2>
          <p className="font-fredoka text-gray-300 max-w-2xl mx-auto">
            Lock your $FLZY for {STAKE_LOCK_DAYS} days and earn a fixed {STAKE_REWARD_PCT}% reward from a finite 150M pool.
            First-come, first-served — when the pool runs out, staking closes for new positions.
          </p>
        </div>

        <StakingWidget />

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="meme-card p-4 text-center" style={{ borderColor: "#FF6B9D" }}>
            <p className="font-bangers text-lg mb-1" style={{ color: "#FF6B9D", letterSpacing: "1px" }}>
              💰 FIXED REWARD
            </p>
            <p className="font-fredoka text-xs text-gray-400">
              Every stake earns exactly +{STAKE_REWARD_PCT}% of its principal over {STAKE_LOCK_DAYS} days — locked in
              when you stake, paid out at unlock.
            </p>
          </div>
          <div className="meme-card p-4 text-center" style={{ borderColor: "#FFD43B" }}>
            <p className="font-bangers text-lg txt-yellow mb-1" style={{ letterSpacing: "1px" }}>
              🔓 NO EARLY EXIT
            </p>
            <p className="font-fredoka text-xs text-gray-400">
              The lock is firm. You can&apos;t withdraw before {STAKE_LOCK_DAYS} days. Stake only what you can spare.
            </p>
          </div>
          <div className="meme-card p-4 text-center" style={{ borderColor: "#00E676" }}>
            <p className="font-bangers text-lg txt-green mb-1" style={{ letterSpacing: "1px" }}>
              🔁 STAKE MULTIPLE TIMES
            </p>
            <p className="font-fredoka text-xs text-gray-400">
              Each stake is an independent position with its own {STAKE_LOCK_DAYS}-day countdown. Stack them up.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
