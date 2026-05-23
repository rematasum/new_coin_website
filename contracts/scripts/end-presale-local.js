import hre from "hardhat";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const d = JSON.parse(readFileSync(resolve(__dirname, "../deployments/localhost.json"), "utf8"));
  const [owner, b1] = await hre.ethers.getSigners();

  const presale = await hre.ethers.getContractAt("Presale", d.presaleAddress);

  const already = await presale.presaleEnded();
  if (already) { console.log("Already ended."); return; }

  // small buy so endPresale doesn't revert (needs > 0 raised)
  await presale.connect(b1).buy({ value: hre.ethers.parseEther("0.5") });
  console.log("b1 bought 0.5 ETH");

  await presale.connect(owner).endPresale();
  console.log("presaleEnded:", await presale.presaleEnded());
  console.log("vestingStart:", new Date(Number(await presale.vestingStart()) * 1000).toISOString());
}

main().catch((e) => { console.error(e); process.exit(1); });
