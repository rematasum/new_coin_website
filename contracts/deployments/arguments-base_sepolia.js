// Verification arguments for Flozy contracts
// Generated: 2026-05-15T17:30:27.968Z
// Network: base_sepolia
// Format: ES Module (for "type": "module" in package.json)

export default [
  "Flozy", // name
  "FLZY", // symbol
  "1000000000000000000000000000", // totalSupply
  "0x31704306a11cEDdA1b9A3Cf10b5bEd3f44312f58", // presaleAddr
  "0xEeFF72510a01a0FCc49c32c54641EC575DF2D48C", // teamVestingAddr
  "0x6b43fCc42c35080BdeA80771E7FB653155c097B1", // airdropVaultAddr
  "0xCE0e20488Da66DE8ce8080412f9094d801f617C4", // liquidityAddr
  "250000000000000000000000000", // presaleAmount
  "250000000000000000000000000", // teamVestingAmount
  "250000000000000000000000000", // airdropAmount
  "250000000000000000000000000", // liquidityAmount
  "0x0773A2064Ee839ec5f25cfE090a08b57B87569c6" // owner
];

// USAGE FOR VERIFICATION:
//
// Token Contract:
// npx hardhat verify --network base_sepolia \
//   --constructor-args deployments/arguments-base_sepolia.js \
//   0xec41Ed3dc638f8d20c4da9A04b04059CeE64d58D
//
// For other contracts, use the individual constructor args below:
//
// Presale Constructor Args:
// [
//   "0x0000000000000000000000000000000000000000", // token (placeholder)
//   "1786752000", // deadline
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
//   "1794700800", // fixedUnlockDate
//   "0x0773A2064Ee839ec5f25cfE090a08b57B87569c6" // owner
// ]
