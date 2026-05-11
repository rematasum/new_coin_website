export const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const PRESALE_ADDRESS = (process.env.NEXT_PUBLIC_PRESALE_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const TEAM_VESTING_ADDRESS = (process.env.NEXT_PUBLIC_TEAM_VESTING_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const STAGE_COUNT = 5;

// Per-stage vesting rules (mirrors deploy.config.js)
export const STAGE_CONFIG = [
  { priceEth: "0.000002",  instantPct: 25, label: "Stage 1" },
  { priceEth: "0.0000022", instantPct: 20, label: "Stage 2" },
  { priceEth: "0.0000025", instantPct: 15, label: "Stage 3" },
  { priceEth: "0.000003",  instantPct: 10, label: "Stage 4" },
  { priceEth: "0.000004",  instantPct:  5, label: "Stage 5" },
] as const;

export const PRESALE_ABI = [
  // ── Read ──────────────────────────────────────────────────────────
  { name: "currentStage",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "currentPrice",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "currentStageInfo",type: "function", stateMutability: "view", inputs: [], outputs: [{ components: [{ name: "tokenPrice", type: "uint256" }, { name: "tokenAllocation", type: "uint256" }, { name: "tokensSold", type: "uint256" }, { name: "instantUnlockBps", type: "uint256" }], type: "tuple" }] },
  { name: "stageCount",      type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalAllocation", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalTokensSold", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalEthRaised",  type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "deadline",        type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "presaleActive",   type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { name: "presaleEnded",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { name: "presaleEndTime",  type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "vestingStart",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "isEnded",         type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { name: "estimateTokens",  type: "function", stateMutability: "view", inputs: [{ name: "ethAmount", type: "uint256" }], outputs: [{ type: "uint256" }] },
  // Vesting
  { name: "contributions",   type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "getClaimableNow", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "getVestingSchedule", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "totalByStage",   type: "uint256[]" },
      { name: "claimedByStage", type: "uint256[]" },
      { name: "claimableNow",   type: "uint256[]" },
      { name: "fullyVestedAt",  type: "uint256[]" },
    ],
  },
  { name: "vestingRecords", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }, { name: "stageIndex", type: "uint256" }],
    outputs: [{ name: "totalAmount", type: "uint256" }, { name: "claimed", type: "uint256" }],
  },
  // ── Write ─────────────────────────────────────────────────────────
  { name: "buy",   type: "function", stateMutability: "payable",    inputs: [], outputs: [] },
  { name: "claim", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

export const TOKEN_ABI = [
  { name: "name",        type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol",      type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
