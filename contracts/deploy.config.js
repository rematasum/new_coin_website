/**
 * Deployment configuration.
 * Edit this file before running the deploy script.
 * These values are written to the blockchain and CANNOT be changed after deploy.
 */

export default {
  // ── Token ──────────────────────────────────────────────────────────────────
  tokenName: "YourToken",     // TODO: set before deploy
  tokenSymbol: "YTK",         // TODO: set before deploy
  totalSupply: "1000000000",  // 1 billion — as a plain number string (no decimals)

  // ── Presale ────────────────────────────────────────────────────────────────

  // Presale end date. Format: "YYYY-MM-DD" — the script converts to Unix timestamp (midnight UTC).
  deadline: "2025-08-01",     // TODO: set before deploy

  // Referral bonus in basis points. 500 = 5%, 0 = disabled.
  referralBps: 500,

  // ── Stages ─────────────────────────────────────────────────────────────────
  // Each stage needs:
  //   priceEth      — price per 1 full token in ETH (e.g. "0.000001")
  //   allocationM   — how many million tokens to sell in this stage (e.g. 75 = 75,000,000)
  //
  // Total of all allocationM values must equal totalSupply * 0.25 (25% presale rule).
  // Default below: 75M + 100M + 75M = 250M = 25% of 1B ✓
  stages: [
    { priceEth: "0.000001",  allocationM: 75  },  // Stage 1 — cheapest
    { priceEth: "0.0000015", allocationM: 100 },  // Stage 2
    { priceEth: "0.000002",  allocationM: 75  },  // Stage 3
  ],
};
