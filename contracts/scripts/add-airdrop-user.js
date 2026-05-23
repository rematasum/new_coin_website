/**
 * add-airdrop-user.js
 *
 * Simulates the post-presale flow: owner reads list from Sheets,
 * then calls addAirdropParticipants() on the AirdropVault contract.
 *
 * Amount is fixed at 10,000 FLZY per wallet (AMOUNT_PER_WALLET in contract).
 * Defaults: adds Hardhat account #1.
 *
 * Usage:
 *   npx hardhat run scripts/add-airdrop-user.js --network localhost
 *
 * Override address:
 *   USER=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
 *     npx hardhat run scripts/add-airdrop-user.js --network localhost
 */

import hre from "hardhat";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const d = JSON.parse(readFileSync(resolve(__dirname, "../deployments/localhost.json"), "utf8"));

  const signers = await hre.ethers.getSigners();
  const defaultUser = signers[1].address; // Account #1 — the MetaMask-imported test wallet
  const userAddr = process.env.USER || defaultUser;

  const AirdropVault = await hre.ethers.getContractFactory("AirdropVault");
  const vault = AirdropVault.attach(d.airdropVaultAddress);

  // Amount is fixed by contract — always 10,000 FLZY per wallet
  const amount = await vault.AMOUNT_PER_WALLET();

  const tx = await vault.addAirdropParticipants([userAddr], [amount]);
  await tx.wait();

  console.log(`✓ Added ${userAddr}`);
  console.log(`  Amount: ${hre.ethers.formatEther(amount)} FLZY`);
  console.log(`  participantCount: ${await vault.participantCount()}`);
  console.log(`  totalAllocated:   ${hre.ethers.formatEther(await vault.totalAllocated())} FLZY`);
}

main().catch((e) => { console.error(e); process.exit(1); });
