/**
 * update-deadline.js
 *
 * Calls Presale.updateDeadline(newDeadline). Requires:
 *  - new date set in deploy.config.js (cfg.deadline)
 *  - signer = owner (PRIVATE_KEY in .env)
 *  - presale not ended
 *
 * Usage:
 *   npx hardhat run scripts/update-deadline.js --network base_sepolia
 */

import hre from "hardhat";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import cfg from "../deploy.config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const network = hre.network.name;
  const d = JSON.parse(readFileSync(resolve(__dirname, `../deployments/${network}.json`), "utf8"));

  const newDeadlineTs = BigInt(Math.floor(new Date(cfg.deadline + "T00:00:00Z").getTime() / 1000));
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (newDeadlineTs <= now) throw new Error(`Config deadline ${cfg.deadline} is in the past`);

  const [signer] = await hre.ethers.getSigners();
  const Presale = await hre.ethers.getContractFactory("Presale");
  const presale = Presale.attach(d.presaleAddress);

  const currentDeadline = await presale.deadline();
  const ended = await presale.presaleEnded();

  console.log("Network:        ", network);
  console.log("Presale:        ", d.presaleAddress);
  console.log("Signer:         ", signer.address);
  console.log("Current deadline:", new Date(Number(currentDeadline) * 1000).toISOString());
  console.log("New deadline:    ", new Date(Number(newDeadlineTs) * 1000).toISOString());
  console.log("Presale ended:  ", ended);
  console.log();

  if (ended) throw new Error("Presale already ended — cannot update deadline");
  if (currentDeadline === newDeadlineTs) {
    console.log("✓ Deadline already correct, no change needed.");
    return;
  }

  console.log("Sending updateDeadline tx...");
  const tx = await presale.updateDeadline(newDeadlineTs);
  console.log("Tx hash:", tx.hash);
  await tx.wait();

  const finalDeadline = await presale.deadline();
  console.log("\n✓ Updated. New on-chain deadline:", new Date(Number(finalDeadline) * 1000).toISOString());
}

main().catch((err) => {
  console.error("✗", err);
  process.exit(1);
});
