import hre from "hardhat";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import cfg from "../deploy.config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseConfig() {
  const totalSupply = hre.ethers.parseEther(cfg.totalSupply);

  const deadlineTs = BigInt(Math.floor(new Date(cfg.deadline + "T00:00:00Z").getTime() / 1000));
  if (deadlineTs <= BigInt(Math.floor(Date.now() / 1000))) {
    throw new Error(`deadline "${cfg.deadline}" is in the past`);
  }

  const stagePrices      = cfg.stages.map((s) => hre.ethers.parseEther(s.priceEth));
  const stageAllocations = cfg.stages.map((s) => hre.ethers.parseEther(String(s.allocationM * 1_000_000)));
  const instantUnlockBps = cfg.stages.map((s) => BigInt(s.instantUnlockBps));
  const totalPresale     = stageAllocations.reduce((a, b) => a + b, 0n);

  const tv = cfg.teamVesting;
  const tvAddresses   = tv.beneficiaries.map((b) => b.address);
  const tvAmounts     = tv.beneficiaries.map((b) => hre.ethers.parseEther(String(b.amountM * 1_000_000)));
  const tvInstantBps  = tv.beneficiaries.map((b) => BigInt(b.instantUnlockBps));
  const totalTeam     = tvAmounts.reduce((a, b) => a + b, 0n);

  return { totalSupply, deadlineTs, stagePrices, stageAllocations, instantUnlockBps, totalPresale, tvAddresses, tvAmounts, tvInstantBps, totalTeam };
}

async function main() {
  const { totalSupply, deadlineTs, stagePrices, stageAllocations, instantUnlockBps, totalPresale, tvAddresses, tvAmounts, tvInstantBps, totalTeam } = parseConfig();
  const [deployer] = await hre.ethers.getSigners();

  console.log("Network:  ", hre.network.name);
  console.log("Deployer: ", deployer.address);
  console.log("Balance:  ", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("");
  console.log("Token:    ", cfg.tokenName, `(${cfg.tokenSymbol})`);
  console.log("Supply:   ", cfg.totalSupply);
  console.log("Presale:  ", hre.ethers.formatEther(totalPresale), "tokens across", cfg.stages.length, "stages");
  console.log("Team:     ", hre.ethers.formatEther(totalTeam), "tokens across", cfg.teamVesting.beneficiaries.length, "beneficiaries");
  console.log("Deadline: ", cfg.deadline, `(${deadlineTs})`);
  console.log("");

  // 1. Deploy Token
  console.log("1. Deploying Token...");
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy(cfg.tokenName, cfg.tokenSymbol, totalSupply, deployer.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("   ✓ Token:", tokenAddress);

  // 2. Deploy Presale
  console.log("2. Deploying Presale...");
  const Presale = await hre.ethers.getContractFactory("Presale");
  const presale = await Presale.deploy(
    tokenAddress,
    deadlineTs,
    stagePrices,
    stageAllocations,
    instantUnlockBps,
    deployer.address
  );
  await presale.waitForDeployment();
  const presaleAddress = await presale.getAddress();
  console.log("   ✓ Presale:", presaleAddress);

  // 3. Deploy TeamVesting
  console.log("3. Deploying TeamVesting...");
  const TeamVesting = await hre.ethers.getContractFactory("TeamVesting");
  const teamVesting = await TeamVesting.deploy(
    tokenAddress,
    tvAddresses,
    tvAmounts,
    tvInstantBps,
    deployer.address
  );
  await teamVesting.waitForDeployment();
  const teamVestingAddress = await teamVesting.getAddress();
  console.log("   ✓ TeamVesting:", teamVestingAddress);

  // 4. Transfer presale allocation to Presale
  console.log("4. Transferring", hre.ethers.formatEther(totalPresale), "tokens to Presale contract...");
  const tx1 = await token.transfer(presaleAddress, totalPresale);
  await tx1.wait();
  console.log("   ✓ Done");

  // 5. Transfer team allocation to TeamVesting
  console.log("5. Transferring", hre.ethers.formatEther(totalTeam), "tokens to TeamVesting contract...");
  const tx2 = await token.transfer(teamVestingAddress, totalTeam);
  await tx2.wait();
  console.log("   ✓ Done");

  // 6. Save deployment record
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    tokenAddress,
    presaleAddress,
    teamVestingAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    config: {
      tokenName: cfg.tokenName,
      tokenSymbol: cfg.tokenSymbol,
      totalSupply: cfg.totalSupply,
      deadline: cfg.deadline,
      stages: cfg.stages,
      teamVesting: cfg.teamVesting,
    },
  };
  const outDir = resolve(__dirname, "../deployments");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `${hre.network.name}.json`);
  writeFileSync(outPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment saved →", outPath);

  const chainId = hre.network.name === "base_mainnet" ? 8453 : 84532;
  console.log("\n═══════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════");
  console.log("  Token:       ", tokenAddress);
  console.log("  Presale:     ", presaleAddress);
  console.log("  TeamVesting: ", teamVestingAddress);
  console.log("═══════════════════════════════════");
  console.log("\nNext — add to frontend/.env.local:");
  console.log(`  NEXT_PUBLIC_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`  NEXT_PUBLIC_PRESALE_ADDRESS=${presaleAddress}`);
  console.log(`  NEXT_PUBLIC_TEAM_VESTING_ADDRESS=${teamVestingAddress}`);
  console.log(`  NEXT_PUBLIC_CHAIN_ID=${chainId}`);
  console.log("\nNext — call startVesting() on TeamVesting with the next 15th timestamp.");
  console.log("Next — verify on Basescan:");
  console.log(`  npx hardhat verify --network ${hre.network.name} ${tokenAddress} "${cfg.tokenName}" "${cfg.tokenSymbol}" ${totalSupply} ${deployer.address}`);
}

main().catch((err) => {
  console.error("\n✗", err.message);
  process.exit(1);
});
