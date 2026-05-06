/**
 * Deployment configuration for Flozy (FLZY).
 * Edit this file before running the deploy script.
 * These values are written to the blockchain and CANNOT be changed after deploy.
 */

export default {
  // ── Token ──────────────────────────────────────────────────────────────────
  tokenName: "Flozy",
  tokenSymbol: "FLZY",
  totalSupply: "1000000000", // 1 billion

  // ── Presale ────────────────────────────────────────────────────────────────

  // Presale end date. Format: "YYYY-MM-DD" (midnight UTC).
  deadline: "2026-08-01", // TODO: confirm exact date before mainnet deploy

  // Referral bonus in basis points. 500 = 5%, 0 = disabled.
  referralBps: 500,

  // ── Stages ─────────────────────────────────────────────────────────────────
  // priceEth         — price per 1 full token in ETH
  // allocationM      — millions of tokens in this stage (5 × 50M = 250M = 25% of 1B)
  // instantUnlockBps — % unlocked immediately when presale ends (basis points: 2500 = 25%)
  //                    Remaining % vests linearly over 24 months from presale end.
  stages: [
    { priceEth: "0.000002",  allocationM: 50, instantUnlockBps: 2500 }, // Stage 1 — 25% instant
    { priceEth: "0.0000022", allocationM: 50, instantUnlockBps: 2000 }, // Stage 2 — 20% instant
    { priceEth: "0.0000025", allocationM: 50, instantUnlockBps: 1500 }, // Stage 3 — 15% instant
    { priceEth: "0.000003",  allocationM: 50, instantUnlockBps: 1000 }, // Stage 4 — 10% instant
    { priceEth: "0.000004",  allocationM: 50, instantUnlockBps:  500 }, // Stage 5 —  5% instant
  ],
};
