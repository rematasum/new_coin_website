/**
 * start-vesting.js
 *
 * Calls TeamVesting.startVesting() on the deployed contract.
 * Run this ONCE after deployment to activate vesting and allow claims.
 *
 * Usage:
 *   npx hardhat run scripts/start-vesting.js --network base_sepolia
 *   npx hardhat run scripts/start-vesting.js --network base_mainnet
 *
 * The script auto-calculates the next 15th of the month (UTC midnight) as
 * the vestingStart timestamp, matching the intended vesting schedule.
 */

import hre from "hardhat";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function nextFifteenth() {
  const now = new Date();
  const year  = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-indexed

  // Candidate: 15th of current month
  let candidate = new Date(Date.UTC(year, month, 15, 0, 0, 0));
  // If that's already past, use next month's 15th
  if (candidate.getTime() <= now.getTime()) {
    candidate = new Date(Date.UTC(year, month + 1, 15, 0, 0, 0));
  }
  return BigInt(Math.floor(candidate.getTime() / 1000));
}

async function main() {
  const networkName = hre.network.name;

  // Load deployment record
  const deploymentPath = resolve(__dirname, `../deployments/${networkName}.json`);
  let deployment;
  try {
    deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));
  } catch {
    throw new Error(`No deployment record found at ${deploymentPath}. Deploy first.`);
  }

  const teamVestingAddress = deployment.teamVestingAddress;
  if (!teamVestingAddress) throw new Error("teamVestingAddress missing from deployment record");

  const [signer] = await hre.ethers.getSigners();
  console.log("Network:  ", networkName);
  console.log("Signer:   ", signer.address);
  console.log("Contract: ", teamVestingAddress);

  const TeamVesting = await hre.ethers.getContractFactory("TeamVesting");
  const teamVesting = TeamVesting.attach(teamVestingAddress);

  // Check if already started
  const isActive = await teamVesting.vestingActive();
  if (isActive) {
    const start = await teamVesting.vestingStart();
    console.log("\n✓ Vesting already active.");
    console.log("  vestingStart:", new Date(Number(start) * 1000).toISOString());
    return;
  }

  // Calculate vestingStart = next 15th of month (UTC midnight)
  const vestingStart = nextFifteenth();
  const vestingStartDate = new Date(Number(vestingStart) * 1000).toISOString();
  console.log(`\nStarting vesting at: ${vestingStartDate} (unix: ${vestingStart})`);

  const tx = await teamVesting.startVesting(vestingStart);
  console.log("Tx hash:", tx.hash);
  await tx.wait();

  console.log("\n✓ vestingActive = true");
  console.log("  Beneficiaries can now claim their instant unlock portion immediately.");
  console.log("  Monthly vesting unlocks begin on:", vestingStartDate);
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
