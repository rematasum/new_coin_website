/**
 * batch-add-airdrop.js
 *
 * Post-presale operational script.
 * Reads a verified wallet list from airdrop-list.json and calls
 * addAirdropParticipants() on AirdropVault in batches of BATCH_SIZE.
 *
 * Steps:
 *   1. Export Google Sheet as CSV → convert to airdrop-list.json
 *      Format: ["0xABC...", "0xDEF...", ...]   (one address per entry)
 *   2. Filter list manually (remove unfollowers, duplicates, invalid addresses)
 *   3. Run this script:
 *        npx hardhat run scripts/batch-add-airdrop.js --network base_mainnet
 *
 * The contract enforces:
 *   - Exactly 10,000 FLZY per wallet (AMOUNT_PER_WALLET)
 *   - Max 10,000 total participants (MAX_PARTICIPANTS)
 *   - No duplicates (reverts with "Already added")
 *
 * If the script is interrupted mid-batch, re-run safely —
 * already-added addresses will cause that batch to revert.
 * Split the list to resume from where it stopped.
 */

import hre from "hardhat";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BATCH_SIZE = 200; // addresses per transaction (safe gas limit)

async function main() {
  const network = hre.network.name;
  const d = JSON.parse(readFileSync(resolve(__dirname, `../deployments/${network}.json`), "utf8"));
  const [owner] = await hre.ethers.getSigners();

  const vault = await hre.ethers.getContractAt("AirdropVault", d.airdropVaultAddress);
  const AMOUNT = await vault.AMOUNT_PER_WALLET();
  const MAX    = await vault.MAX_PARTICIPANTS();
  const currentCount = await vault.participantCount();

  console.log(`Network          : ${network}`);
  console.log(`AirdropVault     : ${d.airdropVaultAddress}`);
  console.log(`Owner            : ${owner.address}`);
  console.log(`AMOUNT_PER_WALLET: ${hre.ethers.formatEther(AMOUNT)} FLZY`);
  console.log(`MAX_PARTICIPANTS : ${MAX}`);
  console.log(`Current count    : ${currentCount}`);
  console.log("");

  // Load wallet list
  const listPath = resolve(__dirname, "../deployments/airdrop-list.json");
  let wallets;
  try {
    wallets = JSON.parse(readFileSync(listPath, "utf8"));
  } catch {
    console.error(`❌ airdrop-list.json not found at: ${listPath}`);
    console.error("Create it with an array of wallet addresses: [\"0xABC...\", \"0xDEF...\"]");
    process.exit(1);
  }

  // Basic validation
  const invalid = wallets.filter(w => !/^0x[0-9a-fA-F]{40}$/.test(w));
  if (invalid.length > 0) {
    console.error(`❌ Invalid addresses found: ${invalid.slice(0, 5).join(", ")}`);
    process.exit(1);
  }

  const remaining = Number(MAX) - Number(currentCount);
  if (wallets.length > remaining) {
    console.error(`❌ List has ${wallets.length} addresses but only ${remaining} slots remain (cap: ${MAX})`);
    process.exit(1);
  }

  console.log(`Addresses to add : ${wallets.length}`);
  console.log(`Batches          : ${Math.ceil(wallets.length / BATCH_SIZE)}`);
  console.log("");

  let totalAdded = 0;
  for (let i = 0; i < wallets.length; i += BATCH_SIZE) {
    const batch = wallets.slice(i, i + BATCH_SIZE);
    const amounts = Array(batch.length).fill(AMOUNT);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    process.stdout.write(`Batch ${batchNum}: ${batch.length} addresses... `);
    const tx = await vault.connect(owner).addAirdropParticipants(batch, amounts);
    await tx.wait();
    totalAdded += batch.length;
    console.log(`✓ (total: ${totalAdded})`);
  }

  console.log("");
  console.log(`✅ Done. participantCount: ${await vault.participantCount()}`);
  console.log(`   totalAllocated: ${hre.ethers.formatEther(await vault.totalAllocated())} FLZY`);
}

main().catch((e) => { console.error(e); process.exit(1); });
