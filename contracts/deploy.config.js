/**
 * Deployment configuration for Flozy (FLZY).
 * Edit this file before running the deploy script.
 * Values written to the blockchain CANNOT be changed after deploy.
 */

export default {
  // ── Token ──────────────────────────────────────────────────────────────────
  tokenName:   "Flozy",
  tokenSymbol: "FLZY",
  totalSupply: "1000000000", // 1 billion

  // ── Presale ────────────────────────────────────────────────────────────────

  // Presale deadline. Format: "YYYY-MM-DD" (midnight UTC).
  deadline: "2025-08-01",

  // ── Stages (5 × 50M = 250M = 25% of supply) ───────────────────────────────
  // priceEth         — price per 1 full token in ETH
  // allocationM      — millions of tokens in this stage
  // instantUnlockBps — % unlocked immediately when presale ends (basis points)
  //                    Remaining % vests monthly over 24 months from first 15th.
  stages: [
    { priceEth: "0.000002",  allocationM: 50, instantUnlockBps: 2500 }, // Stage 1 — 25% instant
    { priceEth: "0.0000022", allocationM: 50, instantUnlockBps: 2000 }, // Stage 2 — 20% instant
    { priceEth: "0.0000025", allocationM: 50, instantUnlockBps: 1500 }, // Stage 3 — 15% instant
    { priceEth: "0.000003",  allocationM: 50, instantUnlockBps: 1000 }, // Stage 4 — 10% instant
    { priceEth: "0.000004",  allocationM: 50, instantUnlockBps:  500 }, // Stage 5 —  5% instant
  ],

  // ── Team & Sponsor Vesting (250M total) ────────────────────────────────────
  // Replace placeholder addresses with real wallet addresses before mainnet deploy.
  // instantUnlockBps: 2500 = 25% instant unlock, remaining 75% monthly over 24 months.
  teamVesting: {
    beneficiaries: [
      { name: "Team & Dev", address: "0x0000000000000000000000000000000000000001", amountM: 100, instantUnlockBps: 2500 },
      { name: "Sponsor 1",  address: "0x0000000000000000000000000000000000000002", amountM: 30,  instantUnlockBps: 2500 },
      { name: "Sponsor 2",  address: "0x0000000000000000000000000000000000000003", amountM: 30,  instantUnlockBps: 2500 },
      { name: "Sponsor 3",  address: "0x0000000000000000000000000000000000000004", amountM: 30,  instantUnlockBps: 2500 },
      { name: "Sponsor 4",  address: "0x0000000000000000000000000000000000000005", amountM: 30,  instantUnlockBps: 2500 },
      { name: "Sponsor 5",  address: "0x0000000000000000000000000000000000000006", amountM: 30,  instantUnlockBps: 2500 },
    ],
  },
};
