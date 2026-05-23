/**
 * time-travel.js
 *
 * Advances local Hardhat node's block.timestamp by N days.
 *
 * Usage:
 *   DAYS=30 npx hardhat run scripts/time-travel.js --network localhost
 *   DAYS=720 npx hardhat run scripts/time-travel.js --network localhost  (24 months)
 *
 * After advancing, you may need to refresh the frontend to see new state.
 */

import hre from "hardhat";

async function main() {
  const days = Number(process.env.DAYS || "30");
  const seconds = days * 86400;

  const before = (await hre.ethers.provider.getBlock("latest")).timestamp;
  await hre.network.provider.send("evm_increaseTime", [seconds]);
  await hre.network.provider.send("evm_mine", []);
  const after = (await hre.ethers.provider.getBlock("latest")).timestamp;

  console.log(`Before: ${new Date(before * 1000).toISOString()}`);
  console.log(`After:  ${new Date(after * 1000).toISOString()}`);
  console.log(`Advanced ${days} days (${seconds} seconds)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
