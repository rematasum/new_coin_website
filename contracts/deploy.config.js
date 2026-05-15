/**
 * Deployment configuration for Flozy (FLZY).
 * Edit this file before running the deploy script.
 * Values written to the blockchain CANNOT be changed after deploy.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TOKEN DISTRIBUTION (1 Billion = 1000M)
 * ─────────────────────────────────────────────────────────────────────────────
 * 250M → Presale Contract          (25% of supply, staged purchase + vesting)
 * 250M → TeamVesting Contract      (25% of supply, team + 5 sponsors)
 * 250M → AirdropVault Contract     (25% of supply, fixed unlock date)
 * 250M → Liquidity Wallet Address  (25% of supply, direct transfer)
 *
 * All tokens distributed at Token contract deployment; deployer receives 0.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export default {
  // ── Token ──────────────────────────────────────────────────────────────────
  tokenName:   "Flozy",
  tokenSymbol: "FLZY",
  totalSupply: "1000000000", // 1 billion

  // ── Distributions (must sum to totalSupply) ────────────────────────────────
  distributionM: {
    presale: 250,          // 250M → Presale contract
    teamVesting: 250,      // 250M → TeamVesting contract
    airdrop: 250,          // 250M → AirdropVault contract
    liquidity: 250,        // 250M → Liquidity wallet
  },

  // ── Presale ────────────────────────────────────────────────────────────────
  // Presale deadline. Format: "YYYY-MM-DD" (midnight UTC). Must be in future!
  deadline: "2026-08-15",

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
  // 25% instant unlock, remaining 75% vests monthly over 24 months starting 15th of month.
  teamBeneficiaries: [
    { name: "Team & Dev", address: "0x7375821d0bAC0AC21A3BA81F5804aAE717108C61", amountM: 100, instantUnlockBps: 2500 },
    { name: "Sponsor 1",  address: "0xF632473935138bcbBdcAC33a6fC88E771C966490", amountM: 30,  instantUnlockBps: 2500 },
    { name: "Sponsor 2",  address: "0x07cC193314BC474AaA92D56325AEA0C30A698E5E", amountM: 30,  instantUnlockBps: 2500 },
    { name: "Sponsor 3",  address: "0x492eE2Cc5806Aa5E679Aa19d6deb1cd00cFc43A5", amountM: 30,  instantUnlockBps: 2500 },
    { name: "Sponsor 4",  address: "0x7a1A48B0f14Cf606a4B320dbD6591c4858F5588e", amountM: 30,  instantUnlockBps: 2500 },
    { name: "Sponsor 5",  address: "0xb1AB86421AB02cbf87d28b654dF4e4ea52355517", amountM: 30,  instantUnlockBps: 2500 },
  ],

  // ── Airdrop Vault (250M total) ────────────────────────────────────────────
  // Fixed unlock date: tokens locked until this date, then claimable by whitelisted users.
  fixedAirdropDate: "2026-11-15", // Format: "YYYY-MM-DD"

  // ── Liquidity & Admin ──────────────────────────────────────────────────────
  // Liquidity wallet receives 250M tokens (direct transfer, no vesting).
  liquidityAddress: "0xCE0e20488Da66DE8ce8080412f9094d801f617C4",
};
