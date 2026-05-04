// Contract addresses — set via .env.local after deployment
export const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const PRESALE_ADDRESS = (process.env.NEXT_PUBLIC_PRESALE_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const PRESALE_ABI = [
  // Read
  { name: "currentStage", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "currentPrice", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "currentStageInfo", type: "function", stateMutability: "view", inputs: [], outputs: [{ components: [{ name: "tokenPrice", type: "uint256" }, { name: "tokensSold", type: "uint256" }, { name: "tokenAllocation", type: "uint256" }], type: "tuple" }] },
  { name: "stageCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalAllocation", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalTokensSold", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalEthRaised", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "deadline", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "presaleActive", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { name: "presaleEnded", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { name: "isEnded", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { name: "contributions", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "estimateTokens", type: "function", stateMutability: "view", inputs: [{ name: "ethAmount", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "referralBonusBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  // Write
  { name: "buy", type: "function", stateMutability: "payable", inputs: [{ name: "referrer", type: "address" }], outputs: [] },
  { name: "claim", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

export const TOKEN_ABI = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
