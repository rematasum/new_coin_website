// Contract Verification Arguments Template
// Bu dosya, deployment sonrası deployment/arguments-base_sepolia.js
// dosyasından oluşturulur. Hardhat verify komutunda kullanın.

// KULLANIM:
// npx hardhat verify --network base_sepolia --constructor-args arguments-template.js <CONTRACT_ADDRESS>

module.exports = [
  // ═══════════════════════════════════════════════════════════════
  // Presale Constructor Arguments
  // ═══════════════════════════════════════════════════════════════
  // tokenAddress: "0x0000000000000000000000000000000000000000", // placeholder during deploy
  // deadline: BigInt("1724083200"), // Unix timestamp
  // stagePrices: ["2000000000000", "2200000000000", ...], // wei per token
  // stageAllocations: ["50000000000000000000000000", ...], // tokens with 18 decimals
  // instantUnlockBps: ["2500", "2000", "1500", "1000", "500"], // basis points
  // owner: "0xDeployerAddress"

  // ═══════════════════════════════════════════════════════════════
  // TeamVesting Constructor Arguments
  // ═══════════════════════════════════════════════════════════════
  // tokenAddress: "0x0000000000000000000000000000000000000000", // placeholder
  // beneficiaryAddresses: [
  //   "0x7375821d0bAC0AC21A3BA81F5804aAE717108C61", // Team & Dev
  //   "0xF632473935138bcbBdcAC33a6fC88E771C966490", // Sponsor 1
  //   "0x07cC193314BC474AaA92D56325AEA0C30A698E5E", // Sponsor 2
  //   "0x492eE2Cc5806Aa5E679Aa19d6deb1cd00cFc43A5", // Sponsor 3
  //   "0x7a1A48B0f14Cf606a4B320dbD6591c4858F5588e", // Sponsor 4
  //   "0xb1AB86421AB02cbf87d28b654dF4e4ea52355517"  // Sponsor 5
  // ],
  // beneficiaryAmounts: [
  //   "100000000000000000000000000", // 100M (18 decimals)
  //   "30000000000000000000000000",  // 30M
  //   "30000000000000000000000000",  // 30M
  //   "30000000000000000000000000",  // 30M
  //   "30000000000000000000000000",  // 30M
  //   "30000000000000000000000000"   // 30M
  // ],
  // instantUnlockBps: ["2500", "2500", "2500", "2500", "2500", "2500"], // 25% instant
  // owner: "0xDeployerAddress"

  // ═══════════════════════════════════════════════════════════════
  // AirdropVault Constructor Arguments
  // ═══════════════════════════════════════════════════════════════
  // tokenAddress: "0x0000000000000000000000000000000000000000", // placeholder
  // fixedUnlockDate: BigInt("1789641600"), // Nov 15, 2026 midnight UTC
  // owner: "0xDeployerAddress"

  // ═══════════════════════════════════════════════════════════════
  // Token Constructor Arguments (12 parameters)
  // ═══════════════════════════════════════════════════════════════
  // name: "Flozy",
  // symbol: "FLZY",
  // totalSupply: "1000000000000000000000000000", // 1B with 18 decimals
  // presaleAddress: "0xPresaleContractAddress",
  // teamVestingAddress: "0xTeamVestingContractAddress",
  // airdropVaultAddress: "0xAirdropVaultContractAddress",
  // liquidityAddress: "0xCE0e20488Da66DE8ce8080412f9094d801f617C4",
  // presaleAmount: "250000000000000000000000000", // 250M
  // teamVestingAmount: "250000000000000000000000000", // 250M
  // airdropAmount: "250000000000000000000000000", // 250M
  // liquidityAmount: "250000000000000000000000000", // 250M
  // owner: "0xDeployerAddress"
];

// ═══════════════════════════════════════════════════════════════
// DEPLOYMENT SCRIPT TARAFINDAN OTOMATIK OLUŞTURMA
// ═══════════════════════════════════════════════════════════════
// npx hardhat run scripts/deploy.js --network base_sepolia
// → Otomatik oluşturur: deployments/arguments-base_sepolia.js
//
// Bu dosya deploy script'inden çıktı olarak generate edilen
// gerçek constructor arguments'ları içerir.

// ═══════════════════════════════════════════════════════════════
// VERIFICATION KULLANIM
// ═══════════════════════════════════════════════════════════════

// 1. Deploy et:
//    npx hardhat run scripts/deploy.js --network base_sepolia

// 2. deployment/arguments-base_sepolia.js dosyasını kopyala

// 3. Her kontrat için doğrula:
//    npx hardhat verify --network base_sepolia \
//      --constructor-args deployments/arguments-base_sepolia.js \
//      <CONTRACT_ADDRESS>

// ═══════════════════════════════════════════════════════════════
// NOTLAR
// ═══════════════════════════════════════════════════════════════
// - BigInt değerleri string olarak passed edilir
// - 18 decimal places (ERC20 standard)
// - Basescan'de doğrulama otomatik yapılır
// - Constructor arguments exact match olmalı
