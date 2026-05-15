import hre from "hardhat";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import cfg from "../deploy.config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function dateToUnixTimestamp(dateStr) {
  return BigInt(Math.floor(new Date(dateStr + "T00:00:00Z").getTime() / 1000));
}

function parseConfig() {
  const totalSupply = hre.ethers.parseEther(cfg.totalSupply);

  // Presale deadline
  const deadlineTs = dateToUnixTimestamp(cfg.deadline);
  if (deadlineTs <= BigInt(Math.floor(Date.now() / 1000))) {
    throw new Error(`deadline "${cfg.deadline}" is in the past`);
  }

  // Airdrop unlock date
  const airdropUnlockTs = dateToUnixTimestamp(cfg.fixedAirdropDate);
  if (airdropUnlockTs <= BigInt(Math.floor(Date.now() / 1000))) {
    throw new Error(`fixedAirdropDate "${cfg.fixedAirdropDate}" is in the past`);
  }

  // Presale stages
  const stagePrices      = cfg.stages.map((s) => hre.ethers.parseEther(s.priceEth));
  const stageAllocations = cfg.stages.map((s) => hre.ethers.parseEther(String(s.allocationM * 1_000_000)));
  const instantUnlockBps = cfg.stages.map((s) => BigInt(s.instantUnlockBps));
  const totalPresale     = stageAllocations.reduce((a, b) => a + b, 0n);

  // Team vesting beneficiaries
  const tvAddresses   = cfg.teamBeneficiaries.map((b) => b.address);
  const tvAmounts     = cfg.teamBeneficiaries.map((b) => hre.ethers.parseEther(String(b.amountM * 1_000_000)));
  const tvInstantBps  = cfg.teamBeneficiaries.map((b) => BigInt(b.instantUnlockBps));
  const totalTeam     = tvAmounts.reduce((a, b) => a + b, 0n);

  // Distributions
  const totalAirdrop  = hre.ethers.parseEther(String(cfg.distributionM.airdrop * 1_000_000));
  const totalLiquidity = hre.ethers.parseEther(String(cfg.distributionM.liquidity * 1_000_000));

  return {
    totalSupply,
    deadlineTs,
    airdropUnlockTs,
    stagePrices,
    stageAllocations,
    instantUnlockBps,
    totalPresale,
    tvAddresses,
    tvAmounts,
    tvInstantBps,
    totalTeam,
    totalAirdrop,
    totalLiquidity,
  };
}

async function main() {
  const {
    totalSupply,
    deadlineTs,
    airdropUnlockTs,
    stagePrices,
    stageAllocations,
    instantUnlockBps,
    totalPresale,
    tvAddresses,
    tvAmounts,
    tvInstantBps,
    totalTeam,
    totalAirdrop,
    totalLiquidity,
  } = parseConfig();

  const [deployer] = await hre.ethers.getSigners();

  console.log("═══════════════════════════════════════════════════════");
  console.log("  FLOZY DEPLOYMENT");
  console.log("═══════════════════════════════════════════════════════");
  console.log("Network:  ", hre.network.name);
  console.log("Deployer: ", deployer.address);
  console.log("Balance:  ", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("");
  console.log("Token Config:");
  console.log("  Name:            ", cfg.tokenName);
  console.log("  Symbol:          ", cfg.tokenSymbol);
  console.log("  Total Supply:    ", cfg.totalSupply);
  console.log("");
  console.log("Token Distribution (Automatic at Mint):");
  console.log("  → Presale:       ", hre.ethers.formatEther(totalPresale), "tokens");
  console.log("  → TeamVesting:   ", hre.ethers.formatEther(totalTeam), "tokens");
  console.log("  → AirdropVault:  ", hre.ethers.formatEther(totalAirdrop), "tokens");
  console.log("  → Liquidity:     ", hre.ethers.formatEther(totalLiquidity), "tokens");
  console.log("");
  console.log("Presale:");
  console.log("  Deadline:        ", cfg.deadline, `(${deadlineTs})`);
  console.log("  Stages:          ", cfg.stages.length);
  console.log("");
  console.log("Team & Sponsors:");
  console.log("  Beneficiaries:   ", cfg.teamBeneficiaries.length);
  console.log("");
  console.log("Airdrop:");
  console.log("  Unlock Date:     ", cfg.fixedAirdropDate, `(${airdropUnlockTs})`);
  console.log("");

  // 1. Deploy Presale (needs token address but will receive tokens from Token constructor)
  console.log("1. Deploying Presale...");
  const Presale = await hre.ethers.getContractFactory("Presale");
  const presale = await Presale.deploy(
    hre.ethers.ZeroAddress, // placeholder token address (will not be used in constructor)
    deadlineTs,
    stagePrices,
    stageAllocations,
    instantUnlockBps,
    deployer.address
  );
  await presale.waitForDeployment();
  const presaleAddress = await presale.getAddress();
  console.log("   ✓ Presale:", presaleAddress);

  // 2. Deploy TeamVesting
  console.log("2. Deploying TeamVesting...");
  const TeamVesting = await hre.ethers.getContractFactory("TeamVesting");
  const teamVesting = await TeamVesting.deploy(
    hre.ethers.ZeroAddress, // placeholder token address
    tvAddresses,
    tvAmounts,
    tvInstantBps,
    deployer.address
  );
  await teamVesting.waitForDeployment();
  const teamVestingAddress = await teamVesting.getAddress();
  console.log("   ✓ TeamVesting:", teamVestingAddress);

  // 3. Deploy AirdropVault
  console.log("3. Deploying AirdropVault...");
  const AirdropVault = await hre.ethers.getContractFactory("AirdropVault");
  const airdropVault = await AirdropVault.deploy(
    hre.ethers.ZeroAddress, // placeholder token address
    airdropUnlockTs,
    deployer.address
  );
  await airdropVault.waitForDeployment();
  const airdropVaultAddress = await airdropVault.getAddress();
  console.log("   ✓ AirdropVault:", airdropVaultAddress);

  // 4. Deploy Token with all distributions
  console.log("4. Deploying Token (distributing to all contracts)...");
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy(
    cfg.tokenName,
    cfg.tokenSymbol,
    totalSupply,
    presaleAddress,
    teamVestingAddress,
    airdropVaultAddress,
    cfg.liquidityAddress,
    totalPresale,
    totalTeam,
    totalAirdrop,
    totalLiquidity,
    deployer.address
  );
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("   ✓ Token:", tokenAddress);

  // 5. Save deployment record and verification arguments
  console.log("\n5. Saving deployment record and verification arguments...");
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    tokenAddress,
    presaleAddress,
    teamVestingAddress,
    airdropVaultAddress,
    liquidityAddress: cfg.liquidityAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    config: {
      tokenName: cfg.tokenName,
      tokenSymbol: cfg.tokenSymbol,
      totalSupply: cfg.totalSupply,
      deadline: cfg.deadline,
      fixedAirdropDate: cfg.fixedAirdropDate,
      stages: cfg.stages,
      teamBeneficiaries: cfg.teamBeneficiaries,
      distribution: cfg.distributionM,
    },
  };
  const outDir = resolve(__dirname, "../deployments");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `${hre.network.name}.json`);
  writeFileSync(outPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("   ✓ Saved →", outPath);

  // Save verification arguments (ES module format)
  console.log("\n   Saving contract verification arguments...");
  const argumentsContent = `// Verification arguments for Flozy contracts
// Generated: ${new Date().toISOString()}
// Network: ${hre.network.name}
// Format: ES Module (for "type": "module" in package.json)

export default [
  "${cfg.tokenName}", // name
  "${cfg.tokenSymbol}", // symbol
  "${totalSupply}", // totalSupply
  "${presaleAddress}", // presaleAddr
  "${teamVestingAddress}", // teamVestingAddr
  "${airdropVaultAddress}", // airdropVaultAddr
  "${cfg.liquidityAddress}", // liquidityAddr
  "${totalPresale}", // presaleAmount
  "${totalTeam}", // teamVestingAmount
  "${totalAirdrop}", // airdropAmount
  "${totalLiquidity}", // liquidityAmount
  "${deployer.address}" // owner
];

// USAGE FOR VERIFICATION:
//
// Token Contract:
// npx hardhat verify --network ${hre.network.name} \\
//   --constructor-args deployments/arguments-${hre.network.name}.js \\
//   ${tokenAddress}
//
// For other contracts, use the individual constructor args below:
//
// Presale Constructor Args:
// [
//   "${hre.ethers.ZeroAddress}", // token (placeholder)
//   "${deadlineTs}", // deadline
//   ${JSON.stringify(stagePrices.map(p => p.toString()))}, // stagePrices
//   ${JSON.stringify(stageAllocations.map(a => a.toString()))}, // stageAllocations
//   ${JSON.stringify(instantUnlockBps.map(b => b.toString()))}, // instantUnlockBps
//   "${deployer.address}" // owner
// ]
//
// TeamVesting Constructor Args:
// [
//   "${hre.ethers.ZeroAddress}", // token (placeholder)
//   ${JSON.stringify(tvAddresses)}, // addresses
//   ${JSON.stringify(tvAmounts.map(a => a.toString()))}, // amounts
//   ${JSON.stringify(tvInstantBps.map(b => b.toString()))}, // instantUnlockBps
//   "${deployer.address}" // owner
// ]
//
// AirdropVault Constructor Args:
// [
//   "${hre.ethers.ZeroAddress}", // token (placeholder)
//   "${airdropUnlockTs}", // fixedUnlockDate
//   "${deployer.address}" // owner
// ]
`;
  const argsPath = resolve(outDir, `arguments-${hre.network.name}.js`);
  writeFileSync(argsPath, argumentsContent);
  console.log("   ✓ Arguments saved →", argsPath);

  // Summary
  const chainId = hre.network.name === "base_mainnet" ? 8453 : 84532;
  console.log("\n" + "═".repeat(55));
  console.log("  DEPLOYMENT COMPLETE ✓");
  console.log("═".repeat(55));
  console.log("\n  Contracts:");
  console.log(`    Token:           ${tokenAddress}`);
  console.log(`    Presale:         ${presaleAddress}`);
  console.log(`    TeamVesting:     ${teamVestingAddress}`);
  console.log(`    AirdropVault:    ${airdropVaultAddress}`);
  console.log(`    Liquidity (Wallet): ${cfg.liquidityAddress}`);
  console.log("\n  Token Distribution:");
  console.log(`    ✓ Presale received ${hre.ethers.formatEther(totalPresale)} tokens`);
  console.log(`    ✓ TeamVesting received ${hre.ethers.formatEther(totalTeam)} tokens`);
  console.log(`    ✓ AirdropVault received ${hre.ethers.formatEther(totalAirdrop)} tokens`);
  console.log(`    ✓ Liquidity wallet received ${hre.ethers.formatEther(totalLiquidity)} tokens`);
  console.log("\n" + "═".repeat(55));
  console.log("  NEXT STEPS");
  console.log("═".repeat(55));
  console.log("\n  1. Add to frontend/.env.local:");
  console.log(`     NEXT_PUBLIC_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`     NEXT_PUBLIC_PRESALE_ADDRESS=${presaleAddress}`);
  console.log(`     NEXT_PUBLIC_TEAM_VESTING_ADDRESS=${teamVestingAddress}`);
  console.log(`     NEXT_PUBLIC_AIRDROP_VAULT_ADDRESS=${airdropVaultAddress}`);
  console.log(`     NEXT_PUBLIC_CHAIN_ID=${chainId}`);
  console.log("\n  2. Call startVesting() on TeamVesting contract");
  console.log("     with Unix timestamp of next 15th of month.");
  console.log("\n  3. Add airdrop participants to AirdropVault:");
  console.log("     addAirdropParticipants(address[] users, uint256[] amounts)");
  console.log("\n  4. Verify contracts on Basescan (if mainnet):");
  console.log(`     npx hardhat verify --network ${hre.network.name} ${tokenAddress}`);
  console.log(`     npx hardhat verify --network ${hre.network.name} ${presaleAddress}`);
  console.log(`     npx hardhat verify --network ${hre.network.name} ${teamVestingAddress}`);
  console.log(`     npx hardhat verify --network ${hre.network.name} ${airdropVaultAddress}`);
}

main().catch((err) => {
  console.error("\n✗", err.message);
  process.exit(1);
});
