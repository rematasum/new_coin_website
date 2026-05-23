export const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const PRESALE_ADDRESS = (process.env.NEXT_PUBLIC_PRESALE_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const TEAM_VESTING_ADDRESS = (process.env.NEXT_PUBLIC_TEAM_VESTING_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const AIRDROP_VAULT_ADDRESS = (process.env.NEXT_PUBLIC_AIRDROP_VAULT_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const STAKING_ADDRESS = (process.env.NEXT_PUBLIC_STAKING_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const STAGE_COUNT = 5;

// Per-stage vesting rules (mirrors deploy.config.js)
export const STAGE_CONFIG = [
  { priceEth: "0.000002",  instantPct: 25, label: "Stage 1" },
  { priceEth: "0.0000022", instantPct: 20, label: "Stage 2" },
  { priceEth: "0.0000025", instantPct: 15, label: "Stage 3" },
  { priceEth: "0.000003",  instantPct: 10, label: "Stage 4" },
  { priceEth: "0.000004",  instantPct:  5, label: "Stage 5" },
] as const;

// Staking constants (mirrors Staking.sol)
export const STAKE_LOCK_DAYS  = 90;
export const STAKE_REWARD_PCT = 20;        // total return for the 90-day period
export const STAKE_REWARD_BPS = 2000;

export const PRESALE_ABI = [
  // ── Read ──────────────────────────────────────────────────────────
  { name: "currentStage",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "currentPrice",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "currentStageInfo",type: "function", stateMutability: "view", inputs: [], outputs: [{ components: [{ name: "tokenPrice", type: "uint256" }, { name: "tokenAllocation", type: "uint256" }, { name: "tokensSold", type: "uint256" }, { name: "instantUnlockBps", type: "uint256" }], type: "tuple" }] },
  { name: "stageCount",      type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalAllocation", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalTokensSold", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalEthRaised",  type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "startTime",       type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "deadline",        type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "presaleActive",   type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { name: "presaleEnded",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { name: "presaleEndTime",  type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "vestingStart",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "isEnded",         type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { name: "stakingContract", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
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
  { name: "buy",           type: "function", stateMutability: "payable",    inputs: [], outputs: [] },
  { name: "claim",         type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "claimAndStake", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

export const TEAM_VESTING_ABI = [
  // ── Read ──────────────────────────────────────────────────────────
  { name: "vestingStart",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "vestingActive",   type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { name: "getClaimableNow", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "getBeneficiary",  type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "totalAmount", type: "uint256" },
      { name: "claimed", type: "uint256" },
      { name: "instantUnlockBps", type: "uint256" },
      { name: "claimableNow", type: "uint256" },
      { name: "nextUnlockAt", type: "uint256" },
    ],
  },
  { name: "beneficiaryCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  // ── Write ─────────────────────────────────────────────────────────
  { name: "claim", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

export const AIRDROP_VAULT_ABI = [
  // ── Read ──────────────────────────────────────────────────────────
  { name: "fixedUnlockDate", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "getClaimableNow", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "getAllocation",   type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "totalAmount", type: "uint256" },
      { name: "claimed", type: "uint256" },
      { name: "claimableNow", type: "uint256" },
      { name: "daysUntilUnlock", type: "uint256" },
    ],
  },
  { name: "participantCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalAllocated",  type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalClaimed",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  // ── Write ─────────────────────────────────────────────────────────
  { name: "claim", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

export const STAKING_ABI = [
  // ── Read ──────────────────────────────────────────────────────────
  { name: "rewardPoolRemaining",  type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalPrincipalStaked", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalRewardsReserved", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalRewardsPaid",     type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "LOCK_DURATION",        type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "REWARD_BPS",           type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "maxStakeAmount",       type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "positionCount",        type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "getWithdrawableNow",   type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "getActiveStakeValue",  type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "principal", type: "uint256" },
      { name: "reward",    type: "uint256" },
    ],
  },
  { name: "getPositions", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{
      type: "tuple[]",
      components: [
        { name: "amount",     type: "uint256" },
        { name: "reward",     type: "uint256" },
        { name: "unlockTime", type: "uint256" },
        { name: "withdrawn",  type: "bool"    },
      ],
    }],
  },
  // ── Write ─────────────────────────────────────────────────────────
  { name: "stake",       type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "withdraw",    type: "function", stateMutability: "nonpayable", inputs: [{ name: "positionIndex", type: "uint256" }], outputs: [] },
  { name: "withdrawAll", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

export const TOKEN_ABI = [
  { name: "name",        type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol",      type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "balanceOf",   type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "allowance",   type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "approve",     type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "transfer",    type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;
