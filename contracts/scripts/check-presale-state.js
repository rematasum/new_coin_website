import hre from "hardhat";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const d = JSON.parse(readFileSync(resolve(__dirname, "../deployments/localhost.json"), "utf8"));
  const [, user1] = await hre.ethers.getSigners();

  const presale = await hre.ethers.getContractAt("Presale", d.presaleAddress);
  const token   = await hre.ethers.getContractAt("Token", d.tokenAddress);

  const block = await hre.ethers.provider.getBlock("latest");
  const now = BigInt(block.timestamp);
  const vestingStart = await presale.vestingStart();

  console.log("Block time   :", new Date(Number(now) * 1000).toISOString());
  console.log("vestingStart :", new Date(Number(vestingStart) * 1000).toISOString());
  console.log("Days elapsed :", Number((now - vestingStart) / 86400n));
  console.log("");
  console.log("contributions:", hre.ethers.formatEther(await presale.contributions(user1.address)), "FLZY");
  console.log("claimableNow :", hre.ethers.formatEther(await presale.getClaimableNow(user1.address)), "FLZY");
  console.log("tokenBalance :", hre.ethers.formatEther(await token.balanceOf(user1.address)), "FLZY");
}

main().catch((e) => { console.error(e); process.exit(1); });
