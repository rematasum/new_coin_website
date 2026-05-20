/**
 * end-presale.js
 *
 * Calls Presale.endPresale() to set presaleEnded = true.
 * After this, buyers can claim their tokens (instant unlock portion immediately,
 * monthly vesting tranches starting from the next 15th of the month).
 *
 * Usage:
 *   npx hardhat run scripts/end-presale.js --network base_sepolia
 *
 * WARNING: This is irreversible. Only use on testnet, or on mainnet when the
 * presale is genuinely complete (or you want to end it early before deadline).
 */

import hre from "hardhat";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const networkName = hre.network.name;

  const deploymentPath = resolve(__dirname, `../deployments/${networkName}.json`);
  let deployment;
  try {
    deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));
  } catch {
    throw new Error(`No deployment record found at ${deploymentPath}. Deploy first.`);
  }

  const presaleAddress = deployment.presaleAddress;
  if (!presaleAddress) throw new Error("presaleAddress missing from deployment record");

  const [signer] = await hre.ethers.getSigners();
  console.log("Network:  ", networkName);
  console.log("Signer:   ", signer.address);
  console.log("Contract: ", presaleAddress);

  const Presale = await hre.ethers.getContractFactory("Presale");
  const presale = Presale.attach(presaleAddress);

  // Check current state
  const alreadyEnded = await presale.presaleEnded();
  if (alreadyEnded) {
    console.log("\n✓ Presale already ended.");
    const vestingStart = await presale.vestingStart();
    if (vestingStart > 0n) {
      console.log("  vestingStart:", new Date(Number(vestingStart) * 1000).toISOString());
    }
    return;
  }

  const totalSold   = await presale.totalTokensSold();
  const totalRaised = await presale.totalEthRaised();
  console.log(`\nCurrent state:`);
  console.log(`  totalTokensSold: ${hre.ethers.formatEther(totalSold)} FLZY`);
  console.log(`  totalEthRaised:  ${hre.ethers.formatEther(totalRaised)} ETH`);
  console.log(`\nCalling endPresale()...`);

  const tx = await presale.endPresale();
  console.log("Tx hash:", tx.hash);
  await tx.wait();

  const newEnded       = await presale.presaleEnded();
  const newVestingStart = await presale.vestingStart();
  console.log("\n✓ presaleEnded = ", newEnded);
  console.log("  vestingStart:  ", new Date(Number(newVestingStart) * 1000).toISOString());
  console.log("\n  Buyers can now claim their instant unlock portion.");
  console.log("  Monthly vesting (24 tranches × 30 days) begins on the vestingStart date above.");
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
