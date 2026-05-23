import hre from "hardhat";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const d = JSON.parse(readFileSync(resolve(__dirname, "../deployments/localhost.json"), "utf8"));
  const [, user1] = await hre.ethers.getSigners();

  const vault = await hre.ethers.getContractAt("AirdropVault", d.airdropVaultAddress);
  const token = await hre.ethers.getContractAt("Token", d.tokenAddress);

  const alloc = await vault.allocations(user1.address);
  const balance = await token.balanceOf(user1.address);

  console.log("User:", user1.address);
  console.log("totalAmount:", hre.ethers.formatEther(alloc.totalAmount), "FLZY");
  console.log("claimed:    ", hre.ethers.formatEther(alloc.claimed), "FLZY");
  console.log("Token balance:", hre.ethers.formatEther(balance), "FLZY");
  console.log("totalClaimed:", hre.ethers.formatEther(await vault.totalClaimed()), "FLZY");
}

main().catch((e) => { console.error(e); process.exit(1); });
