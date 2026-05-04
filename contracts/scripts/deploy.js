import hre from "hardhat";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── CONFIG — edit before deploying ─────────────────────────────────────────

const TOKEN_NAME = "YourToken";          // TODO: set token name
const TOKEN_SYMBOL = "YTK";             // TODO: set token symbol
const TOTAL_SUPPLY = hre.ethers.parseEther("1000000000"); // 1 billion

// Presale deadline: Unix timestamp (seconds)
// Example: Date.now()/1000 + 86400*30 = 30 days from now
const DEADLINE = BigInt(Math.floor(Date.now() / 1000) + 86400 * 30);

const REFERRAL_BPS = 500n; // 5% referral bonus

// Stage prices in wei (ETH per token * 1e18)
const STAGE_PRICES = [
  hre.ethers.parseEther("0.000001"),   // Stage 1
  hre.ethers.parseEther("0.0000015"),  // Stage 2
  hre.ethers.parseEther("0.000002"),   // Stage 3
];

// Token allocations per stage (25% total = 250M)
const STAGE_ALLOCATIONS = [
  hre.ethers.parseEther("75000000"),   // 75M  — Stage 1
  hre.ethers.parseEther("100000000"),  // 100M — Stage 2
  hre.ethers.parseEther("75000000"),   // 75M  — Stage 3
];

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  const presaleAllocation = STAGE_ALLOCATIONS.reduce((a, b) => a + b, 0n);
  console.log("\nPresale allocation:", hre.ethers.formatEther(presaleAllocation), "tokens");
  console.log("Total supply:", hre.ethers.formatEther(TOTAL_SUPPLY), "tokens");

  // 1. Deploy Token
  console.log("\n1. Deploying Token...");
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy(TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, deployer.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("   Token deployed at:", tokenAddress);

  // 2. Deploy Presale
  console.log("2. Deploying Presale...");
  const Presale = await hre.ethers.getContractFactory("Presale");
  const presale = await Presale.deploy(
    tokenAddress,
    DEADLINE,
    REFERRAL_BPS,
    STAGE_PRICES,
    STAGE_ALLOCATIONS,
    deployer.address
  );
  await presale.waitForDeployment();
  const presaleAddress = await presale.getAddress();
  console.log("   Presale deployed at:", presaleAddress);

  // 3. Transfer presale allocation to Presale contract
  console.log("3. Transferring presale tokens to Presale contract...");
  const tx = await token.transfer(presaleAddress, presaleAllocation);
  await tx.wait();
  console.log("   Transferred", hre.ethers.formatEther(presaleAllocation), "tokens to Presale");

  // 4. Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    tokenAddress,
    presaleAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    config: {
      tokenName: TOKEN_NAME,
      tokenSymbol: TOKEN_SYMBOL,
      totalSupply: hre.ethers.formatEther(TOTAL_SUPPLY),
      presaleAllocation: hre.ethers.formatEther(presaleAllocation),
      deadline: DEADLINE.toString(),
      referralBps: REFERRAL_BPS.toString(),
    },
  };

  const outPath = resolve(__dirname, `../deployments/${hre.network.name}.json`);
  writeFileSync(outPath.replace(/\/[^/]+$/, ""), ""); // ensure dir
  try {
    writeFileSync(outPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("\nDeployment info saved to:", outPath);
  } catch {
    // dir may not exist yet
    const { mkdirSync } = await import("fs");
    mkdirSync(resolve(__dirname, "../deployments"), { recursive: true });
    writeFileSync(outPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("\nDeployment info saved to:", outPath);
  }

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("Token:   ", tokenAddress);
  console.log("Presale: ", presaleAddress);
  console.log("\nNext steps:");
  console.log("  npx hardhat verify --network", hre.network.name, tokenAddress, `"${TOKEN_NAME}"`, `"${TOKEN_SYMBOL}"`, TOTAL_SUPPLY.toString(), deployer.address);
  console.log("  npx hardhat verify --network", hre.network.name, presaleAddress, tokenAddress, DEADLINE.toString(), REFERRAL_BPS.toString(), `[${STAGE_PRICES.join(",")}]`, `[${STAGE_ALLOCATIONS.join(",")}]`, deployer.address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
