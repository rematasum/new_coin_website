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

  // Presale start & deadline
  const startDateTs = dateToUnixTimestamp(cfg.startDate);
  const deadlineTs = dateToUnixTimestamp(cfg.deadline);
  if (deadlineTs <= startDateTs) {
    throw new Error(`deadline "${cfg.deadline}" must be after startDate "${cfg.startDate}"`);
  }

  // Airdrop unlock date
  const airdropUnlockTs = dateToUnixTimestamp(cfg.fixedAirdropDate);
  if (airdropUnlockTs <= BigInt(Math.floor(Date.now() / 1000))) {
    throw new Error(`fixedAirdropDate "${cfg.fixedAirdropDate}" is in the past`);
  }

  // Team vesting start (first 15th of month after presale ends)
  const teamVestingStartTs = dateToUnixTimestamp(cfg.teamVestingStartDate);
  if (teamVestingStartTs <= BigInt(Math.floor(Date.now() / 1000))) {
    throw new Error(`teamVestingStartDate "${cfg.teamVestingStartDate}" is in the past`);
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
  const totalAirdrop   = hre.ethers.parseEther(String(cfg.distributionM.airdrop * 1_000_000));
  const totalLiquidity = hre.ethers.parseEther(String(cfg.distributionM.liquidity * 1_000_000));
  const totalStaking   = hre.ethers.parseEther(String(cfg.distributionM.staking * 1_000_000));

  // Sanity: sum must equal totalSupply
  const sum = totalPresale + totalTeam + totalAirdrop + totalLiquidity + totalStaking;
  if (sum !== totalSupply) {
    throw new Error(`Distribution sum (${sum}) does not equal totalSupply (${totalSupply})`);
  }

  return {
    totalSupply,
    startDateTs,
    deadlineTs,
    airdropUnlockTs,
    teamVestingStartTs,
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
    totalStaking,
  };
}

async function main() {
  const {
    totalSupply,
    startDateTs,
    deadlineTs,
    airdropUnlockTs,
    teamVestingStartTs,
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
    totalStaking,
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
  console.log("  → Staking:       ", hre.ethers.formatEther(totalStaking), "tokens");
  console.log("");
  console.log("Presale:");
  console.log("  Deadline:        ", cfg.deadline, `(${deadlineTs})`);
  console.log("  Stages:          ", cfg.stages.length);
  console.log("");
  console.log("Team & Sponsors:");
  console.log("  Beneficiaries:   ", cfg.teamBeneficiaries.length);
  console.log("  Vesting Start:   ", cfg.teamVestingStartDate, `(${teamVestingStartTs})`);
  console.log("");
  console.log("Airdrop:");
  console.log("  Unlock Date:     ", cfg.fixedAirdropDate, `(${airdropUnlockTs})`);
  console.log("");

  // 1. Deploy Presale (needs token address but will receive tokens from Token constructor)
  console.log("1. Deploying Presale...");
  const Presale = await hre.ethers.getContractFactory("Presale");
  const presale = await Presale.deploy(
    hre.ethers.ZeroAddress, // placeholder token address
    startDateTs,
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
    teamVestingStartTs,
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

  // 4. Deploy Staking (needs presale address, ZeroAddress for token)
  console.log("4. Deploying Staking...");
  const Staking = await hre.ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(
    hre.ethers.ZeroAddress,
    presaleAddress,
    totalStaking,
    deployer.address
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("   ✓ Staking:", stakingAddress);

  // 5. Deploy Token with all distributions
  console.log("5. Deploying Token (distributing to all contracts)...");
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy(
    cfg.tokenName,
    cfg.tokenSymbol,
    totalSupply,
    presaleAddress,
    teamVestingAddress,
    airdropVaultAddress,
    cfg.liquidityAddress,
    stakingAddress,
    totalPresale,
    totalTeam,
    totalAirdrop,
    totalLiquidity,
    totalStaking,
    deployer.address
  );
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("   ✓ Token:", tokenAddress);

  // 6. Wire token address into satellite contracts (one-shot setToken).
  //    Required because satellites were deployed with ZeroAddress placeholder
  //    above (circular dependency: Token needs satellite addresses to mint).
  console.log("\n6. Wiring token address into satellite contracts...");
  const setTokenTx1 = await presale.setToken(tokenAddress);
  await setTokenTx1.wait();
  console.log("   ✓ Presale.setToken");
  const setTokenTx2 = await teamVesting.setToken(tokenAddress);
  await setTokenTx2.wait();
  console.log("   ✓ TeamVesting.setToken");
  const setTokenTx3 = await airdropVault.setToken(tokenAddress);
  await setTokenTx3.wait();
  console.log("   ✓ AirdropVault.setToken");
  const setTokenTx4 = await staking.setToken(tokenAddress);
  await setTokenTx4.wait();
  console.log("   ✓ Staking.setToken");

  // 7. Wire staking contract into Presale (enables claimAndStake)
  const setStakingTx = await presale.setStakingContract(stakingAddress);
  await setStakingTx.wait();
  console.log("   ✓ Presale.setStakingContract");

  // 8. Save deployment record and verification arguments
  console.log("\n8. Saving deployment record and verification arguments...");
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    tokenAddress,
    presaleAddress,
    teamVestingAddress,
    airdropVaultAddress,
    stakingAddress,
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
      staking: cfg.staking,
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
  "${stakingAddress}", // stakingAddr
  "${totalPresale}", // presaleAmount
  "${totalTeam}", // teamVestingAmount
  "${totalAirdrop}", // airdropAmount
  "${totalLiquidity}", // liquidityAmount
  "${totalStaking}", // stakingAmount
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
//   "${teamVestingStartTs}", // vestingStart (${cfg.teamVestingStartDate})
//   "${deployer.address}" // owner
// ]
//
// AirdropVault Constructor Args:
// [
//   "${hre.ethers.ZeroAddress}", // token (placeholder)
//   "${airdropUnlockTs}", // fixedUnlockDate
//   "${deployer.address}" // owner
// ]
//
// Staking Constructor Args:
// [
//   "${hre.ethers.ZeroAddress}", // token (placeholder)
//   "${presaleAddress}", // presale
//   "${totalStaking}", // rewardPool (150M)
//   "${deployer.address}" // owner
// ]
`;
  const argsPath = resolve(outDir, `arguments-${hre.network.name}.js`);
  writeFileSync(argsPath, argumentsContent);
  console.log("   ✓ Arguments saved →", argsPath);

  // Standalone Staking verification args (4-arg constructor)
  const stakingArgsContent = `// Staking verification arguments
// Generated: ${new Date().toISOString()}
// Network: ${hre.network.name}

export default [
  "${hre.ethers.ZeroAddress}",
  "${presaleAddress}",
  "${totalStaking}",
  "${deployer.address}"
];

// USAGE:
// npx hardhat verify --network ${hre.network.name} \\
//   --constructor-args deployments/arguments-staking-${hre.network.name}.js \\
//   ${stakingAddress}
`;
  const stakingArgsPath = resolve(outDir, `arguments-staking-${hre.network.name}.js`);
  writeFileSync(stakingArgsPath, stakingArgsContent);
  console.log("   ✓ Staking args saved →", stakingArgsPath);

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
  console.log(`    Staking:         ${stakingAddress}`);
  console.log(`    Liquidity (Wallet): ${cfg.liquidityAddress}`);
  console.log("\n  Token Distribution:");
  console.log(`    ✓ Presale received ${hre.ethers.formatEther(totalPresale)} tokens`);
  console.log(`    ✓ TeamVesting received ${hre.ethers.formatEther(totalTeam)} tokens`);
  console.log(`    ✓ AirdropVault received ${hre.ethers.formatEther(totalAirdrop)} tokens`);
  console.log(`    ✓ Liquidity wallet received ${hre.ethers.formatEther(totalLiquidity)} tokens`);
  console.log(`    ✓ Staking received ${hre.ethers.formatEther(totalStaking)} tokens (reward pool)`);
  console.log("\n" + "═".repeat(55));
  console.log("  NEXT STEPS");
  console.log("═".repeat(55));
  console.log("\n  1. Add to frontend/.env.local:");
  console.log(`     NEXT_PUBLIC_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`     NEXT_PUBLIC_PRESALE_ADDRESS=${presaleAddress}`);
  console.log(`     NEXT_PUBLIC_TEAM_VESTING_ADDRESS=${teamVestingAddress}`);
  console.log(`     NEXT_PUBLIC_AIRDROP_VAULT_ADDRESS=${airdropVaultAddress}`);
  console.log(`     NEXT_PUBLIC_STAKING_ADDRESS=${stakingAddress}`);
  console.log(`     NEXT_PUBLIC_CHAIN_ID=${chainId}`);
  console.log(`\n  TeamVesting vesting starts automatically on: ${cfg.teamVestingStartDate} (${teamVestingStartTs})`);
  console.log("  No startVesting() call needed.\n");
  console.log("  2. Add airdrop participants to AirdropVault:");
  console.log("     addAirdropParticipants(address[] users, uint256[] amounts)");
  console.log("\n  Note: setToken() was called automatically on all satellite contracts");
  console.log("        during deploy (step 6). No manual action required.");
  console.log("\n  3. Verify contracts on Basescan (if mainnet):");
  console.log(`     npx hardhat verify --network ${hre.network.name} --constructor-args deployments/arguments-${hre.network.name}.js ${tokenAddress}`);
  console.log(`     npx hardhat verify --network ${hre.network.name} ${presaleAddress}`);
  console.log(`     npx hardhat verify --network ${hre.network.name} ${teamVestingAddress}`);
  console.log(`     npx hardhat verify --network ${hre.network.name} ${airdropVaultAddress}`);
  console.log(`     npx hardhat verify --network ${hre.network.name} --constructor-args deployments/arguments-staking-${hre.network.name}.js ${stakingAddress}`);
}

main().catch((err) => {
  console.error("\n✗", err.message);
  process.exit(1);
});
