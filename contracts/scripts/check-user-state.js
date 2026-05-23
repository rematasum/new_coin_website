import hre from "hardhat";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const d = JSON.parse(readFileSync(resolve(__dirname, "../deployments/localhost.json"), "utf8"));

  // Account #1 is the user MetaMask wallet
  const USER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  const token   = await hre.ethers.getContractAt("Token", d.tokenAddress);
  const presale = await hre.ethers.getContractAt("Presale", d.presaleAddress);
  const staking = await hre.ethers.getContractAt("Staking", d.stakingAddress);

  const userBal       = await token.balanceOf(USER);
  const presaleBal    = await token.balanceOf(d.presaleAddress);
  const stakingBal    = await token.balanceOf(d.stakingAddress);
  const totalClaimed  = await presale.totalClaimed();
  const totalSold     = await presale.totalTokensSold();
  const claimableNow  = await presale.getClaimableNow(USER);
  const stakePositions = await staking.getPositions(USER);
  const rewardPool    = await staking.rewardPoolRemaining();
  const totalPrincipal = await staking.totalPrincipalStaked();

  console.log("=== User wallet (Account #1) ===");
  console.log("Address:           ", USER);
  console.log("FLZY balance:      ", hre.ethers.formatEther(userBal));
  console.log("");
  console.log("=== Presale contract ===");
  console.log("Total tokens sold: ", hre.ethers.formatEther(totalSold));
  console.log("Total claimed:     ", hre.ethers.formatEther(totalClaimed));
  console.log("User claimable now:", hre.ethers.formatEther(claimableNow));
  console.log("Presale FLZY bal:  ", hre.ethers.formatEther(presaleBal));
  console.log("");
  console.log("=== Staking contract ===");
  console.log("Staking FLZY bal:  ", hre.ethers.formatEther(stakingBal));
  console.log("Reward pool left:  ", hre.ethers.formatEther(rewardPool));
  console.log("Total principal:   ", hre.ethers.formatEther(totalPrincipal));
  console.log("User positions:    ", stakePositions.length);
  for (let i = 0; i < stakePositions.length; i++) {
    const p = stakePositions[i];
    console.log(`  #${i}: principal=${hre.ethers.formatEther(p.amount)}, reward=${hre.ethers.formatEther(p.reward)}, withdrawn=${p.withdrawn}, unlocks=${new Date(Number(p.unlockTime) * 1000).toISOString()}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
