// Verification arguments for Flozy contracts
// Generated: 2026-05-23T10:46:57.523Z
// Network: base_sepolia
// Format: ES Module (for "type": "module" in package.json)

export default [
  "Flozy", // name
  "FLZY", // symbol
  "1000000000000000000000000000", // totalSupply
  "0xd8ea1D5415D03da56da6d12CD6b05c113FD583Bc", // presaleAddr
  "0x811b613a4FE3B9D376ff1378d58bDf08612a4B0B", // teamVestingAddr
  "0xFEBc13B2aC11502f59114372bd90f36740e239F7", // airdropVaultAddr
  "0xCE0e20488Da66DE8ce8080412f9094d801f617C4", // liquidityAddr
  "0x31d229891fC330849759Be770C0d3868650f015C", // stakingAddr
  "250000000000000000000000000", // presaleAmount
  "250000000000000000000000000", // teamVestingAmount
  "100000000000000000000000000", // airdropAmount
  "250000000000000000000000000", // liquidityAmount
  "150000000000000000000000000", // stakingAmount
  "0x0773A2064Ee839ec5f25cfE090a08b57B87569c6" // owner
];

// USAGE FOR VERIFICATION:
//
// Token Contract:
// npx hardhat verify --network base_sepolia \
//   --constructor-args deployments/arguments-base_sepolia.js \
//   0x1D3eaF9678F769CF3ade3B85d8bDc02C731233B2
//
// For other contracts, use the individual constructor args below:
//
// Presale Constructor Args:
// [
//   "0x0000000000000000000000000000000000000000", // token (placeholder)
//   "1782864000", // deadline
//   ["2000000000000","2200000000000","2500000000000","3000000000000","4000000000000"], // stagePrices
//   ["50000000000000000000000000","50000000000000000000000000","50000000000000000000000000","50000000000000000000000000","50000000000000000000000000"], // stageAllocations
//   ["2500","2000","1500","1000","500"], // instantUnlockBps
//   "0x0773A2064Ee839ec5f25cfE090a08b57B87569c6" // owner
// ]
//
// TeamVesting Constructor Args:
// [
//   "0x0000000000000000000000000000000000000000", // token (placeholder)
//   ["0x7375821d0bAC0AC21A3BA81F5804aAE717108C61","0xF632473935138bcbBdcAC33a6fC88E771C966490","0x07cC193314BC474AaA92D56325AEA0C30A698E5E","0x492eE2Cc5806Aa5E679Aa19d6deb1cd00cFc43A5","0x7a1A48B0f14Cf606a4B320dbD6591c4858F5588e","0xb1AB86421AB02cbf87d28b654dF4e4ea52355517"], // addresses
//   ["100000000000000000000000000","30000000000000000000000000","30000000000000000000000000","30000000000000000000000000","30000000000000000000000000","30000000000000000000000000"], // amounts
//   ["2500","2500","2500","2500","2500","2500"], // instantUnlockBps
//   "0x0773A2064Ee839ec5f25cfE090a08b57B87569c6" // owner
// ]
//
// AirdropVault Constructor Args:
// [
//   "0x0000000000000000000000000000000000000000", // token (placeholder)
//   "1785369600", // fixedUnlockDate
//   "0x0773A2064Ee839ec5f25cfE090a08b57B87569c6" // owner
// ]
//
// Staking Constructor Args:
// [
//   "0x0000000000000000000000000000000000000000", // token (placeholder)
//   "0xd8ea1D5415D03da56da6d12CD6b05c113FD583Bc", // presale
//   "150000000000000000000000000", // rewardPool (150M)
//   "0x0773A2064Ee839ec5f25cfE090a08b57B87569c6" // owner
// ]
