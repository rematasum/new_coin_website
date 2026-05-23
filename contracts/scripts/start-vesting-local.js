/**
 * start-vesting-local.js
 *
 * Calls TeamVesting.startVesting() on local Hardhat node.
 * Uses block.timestamp (not real wallclock) since Hardhat node time
 * may have been advanced via time-travel.js.
 *
 * Usage:
 *   npx hardhat run scripts/start-vesting-local.js --network localhost
 */

import hre from "hardhat";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const d = JSON.parse(readFileSync(resolve(__dirname, "../deployments/localhost.json"), "utf8"));
  const [owner] = await hre.ethers.getSigners();
  const TeamVesting = await hre.ethers.getContractFactory("TeamVesting");
  const tv = TeamVesting.attach(d.teamVestingAddress);

  if (await tv.vestingActive()) {
    const start = await tv.vestingStart();
    console.log("Already active. vestingStart =", new Date(Number(start) * 1000).toISOString());
    return;
  }

  // Use block.timestamp + 1 hour (safely future per contract require)
  const blockTime = (await hre.ethers.provider.getBlock("latest")).timestamp;
  const vestingStart = BigInt(blockTime) + 3600n;

  const tx = await tv.startVesting(vestingStart);
  await tx.wait();

  console.log("✓ vestingActive = true");
  console.log("  vestingStart =", new Date(Number(vestingStart) * 1000).toISOString());
}

main().catch((e) => { console.error(e); process.exit(1); });
