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

  const stagePrices = cfg.stages.map((s) => hre.ethers.parseEther(s.priceEth));
  const stageAllocations = cfg.stages.map((s) => hre.ethers.parseEther(String(s.allocationM * 1_000_000)));

  const totalPresale = stageAllocations.reduce((a, b) => a + b, 0n);
  const expectedPresale = totalSupply / 4n;
  if (totalPresale !== expectedPresale) {
    console.warn(
      `⚠  Stage allocations sum (${hre.ethers.formatEther(totalPresale)}) ≠ 25% of supply (${hre.ethers.formatEther(expectedPresale)}). Continuing anyway.`
    );
  }

  return { totalSupply, deadlineTs, stagePrices, stageAllocations, totalPresale };
}

async function main() {
  const { totalSupply, deadlineTs, stagePrices, stageAllocations, totalPresale } = parseConfig();
  const [deployer] = await hre.ethers.getSigners();

  console.log("Network:  ", hre.network.name);
  console.log("Deployer: ", deployer.address);
  console.log("Balance:  ", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("");
  console.log("Token:    ", cfg.tokenName, `(${cfg.tokenSymbol})`);
  console.log("Supply:   ", cfg.totalSupply);
  console.log("Presale:  ", hre.ethers.formatEther(totalPresale), "tokens across", cfg.stages.length, "stages");
  console.log("Deadline: ", cfg.deadline, `(${deadlineTs})`);
  console.log("Referral: ", cfg.referralBps / 100, "%");
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
    BigInt(cfg.referralBps),
    stagePrices,
    stageAllocations,
    deployer.address
  );
  await presale.waitForDeployment();
  const presaleAddress = await presale.getAddress();
  console.log("   ✓ Presale:", presaleAddress);

  // 3. Transfer presale allocation
  console.log("3. Transferring", hre.ethers.formatEther(totalPresale), "tokens to Presale contract...");
  const tx = await token.transfer(presaleAddress, totalPresale);
  await tx.wait();
  console.log("   ✓ Done");

  // 4. Save deployment record
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    tokenAddress,
    presaleAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    config: {
      tokenName: cfg.tokenName,
      tokenSymbol: cfg.tokenSymbol,
      totalSupply: cfg.totalSupply,
      deadline: cfg.deadline,
      referralBps: cfg.referralBps,
      stages: cfg.stages,
    },
  };
  const outDir = resolve(__dirname, "../deployments");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `${hre.network.name}.json`);
  writeFileSync(outPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment saved →", outPath);

  console.log("\n═══════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════");
  console.log("  Token:  ", tokenAddress);
  console.log("  Presale:", presaleAddress);
  console.log("═══════════════════════════════════");
  console.log("\nNext — add to frontend/.env.local:");
  console.log(`  NEXT_PUBLIC_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`  NEXT_PUBLIC_PRESALE_ADDRESS=${presaleAddress}`);
  console.log(`  NEXT_PUBLIC_CHAIN_ID=${hre.network.name === "base_mainnet" ? 8453 : 84532}`);
  console.log("\nNext — verify on Basescan:");
  console.log(`  npx hardhat verify --network ${hre.network.name} ${tokenAddress} "${cfg.tokenName}" "${cfg.tokenSymbol}" ${totalSupply} ${deployer.address}`);
}

main().catch((err) => {
  console.error("\n✗", err.message);
  process.exit(1);
});
