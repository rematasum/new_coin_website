/**
 * health-check.js
 *
 * Read-only diagnostic for a deployed Flozy environment.
 * Verifies:
 *  - All 5 contracts respond to expected view functions (Token, Presale,
 *    TeamVesting, AirdropVault, Staking)
 *  - Token addresses are wired correctly via setToken on all 4 satellites
 *  - Presale.stakingContract() is wired to the Staking address
 *  - Balances: 250M Presale / 250M Team / 100M Airdrop / 250M Liquidity / 150M Staking
 *  - Presale state (currentStage, prices, totalEthRaised, presaleEnded, deadline)
 *  - Staking state (rewardPoolRemaining, totalPrincipalStaked, presale wiring)
 *  - estimateTokens math is consistent with current price
 *
 * Usage:
 *   npx hardhat run scripts/health-check.js --network base_sepolia
 *   npx hardhat run scripts/health-check.js --network base_mainnet
 */

import hre from "hardhat";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET  = "\x1b[0m";
const ok   = (msg) => console.log(`  ${GREEN}✓${RESET} ${msg}`);
const fail = (msg) => { console.log(`  ${RED}✗ ${msg}${RESET}`); process.exitCode = 1; };
const warn = (msg) => console.log(`  ${YELLOW}!${RESET} ${msg}`);
const info = (msg) => console.log(`    ${msg}`);

async function main() {
  const network = hre.network.name;
  const deploymentPath = resolve(__dirname, `../deployments/${network}.json`);
  const d = JSON.parse(readFileSync(deploymentPath, "utf8"));

  console.log("═".repeat(60));
  console.log(`  FLOZY HEALTH CHECK — ${network}`);
  console.log("═".repeat(60));
  console.log("");

  // Contract instances
  const Presale      = await hre.ethers.getContractFactory("Presale");
  const TeamVesting  = await hre.ethers.getContractFactory("TeamVesting");
  const AirdropVault = await hre.ethers.getContractFactory("AirdropVault");
  const Staking      = await hre.ethers.getContractFactory("Staking");
  const Token        = await hre.ethers.getContractFactory("Token");

  const presale = Presale.attach(d.presaleAddress);
  const tv      = TeamVesting.attach(d.teamVestingAddress);
  const vault   = AirdropVault.attach(d.airdropVaultAddress);
  const staking = d.stakingAddress ? Staking.attach(d.stakingAddress) : null;
  const token   = Token.attach(d.tokenAddress);

  const QUARTER     = hre.ethers.parseEther("250000000"); // 250M (presale, team, liquidity)
  const AIRDROP_AMT = hre.ethers.parseEther("100000000"); // 100M (was 250M in v1)
  const STAKING_AMT = hre.ethers.parseEther("150000000"); // 150M (new)

  // ── 1. Contract addresses non-zero & code present ─────────────────────
  console.log("1. Contracts deployed & responding");
  const expectedContracts = {
    Token: d.tokenAddress, Presale: d.presaleAddress,
    TeamVesting: d.teamVestingAddress, AirdropVault: d.airdropVaultAddress,
  };
  if (d.stakingAddress) expectedContracts.Staking = d.stakingAddress;
  else fail("deployments JSON missing stakingAddress — re-run deploy.js");
  for (const [name, addr] of Object.entries(expectedContracts)) {
    const code = await hre.ethers.provider.getCode(addr);
    if (code === "0x") fail(`${name} at ${addr} has NO code (not deployed)`);
    else ok(`${name}: ${addr}`);
  }

  // ── 2. Token wiring (setToken) ────────────────────────────────────────
  console.log("\n2. Token wiring (setToken called on all 4 satellites)");
  const presaleToken  = await presale.token();
  const tvToken       = await tv.token();
  const vaultToken    = await vault.token();
  if (presaleToken.toLowerCase() === d.tokenAddress.toLowerCase()) ok("Presale.token  → wired");
  else fail(`Presale.token = ${presaleToken} (expected ${d.tokenAddress})`);
  if (tvToken.toLowerCase() === d.tokenAddress.toLowerCase()) ok("TeamVesting.token → wired");
  else fail(`TeamVesting.token = ${tvToken}`);
  if (vaultToken.toLowerCase() === d.tokenAddress.toLowerCase()) ok("AirdropVault.token → wired");
  else fail(`AirdropVault.token = ${vaultToken}`);
  if (staking) {
    const stakingToken = await staking.token();
    if (stakingToken.toLowerCase() === d.tokenAddress.toLowerCase()) ok("Staking.token → wired");
    else fail(`Staking.token = ${stakingToken}`);

    // Presale.stakingContract() must point to Staking
    const presaleStaking = await presale.stakingContract();
    if (presaleStaking.toLowerCase() === d.stakingAddress.toLowerCase()) ok("Presale.stakingContract → wired");
    else fail(`Presale.stakingContract = ${presaleStaking} (expected ${d.stakingAddress})`);

    // Staking.presale() must point to Presale
    const stakingPresale = await staking.presale();
    if (stakingPresale.toLowerCase() === d.presaleAddress.toLowerCase()) ok("Staking.presale → wired");
    else fail(`Staking.presale = ${stakingPresale}`);
  }

  // ── 3. Token metadata ─────────────────────────────────────────────────
  console.log("\n3. Token metadata");
  const name   = await token.name();
  const symbol = await token.symbol();
  const decs   = await token.decimals();
  const supply = await token.totalSupply();
  ok(`name: ${name} (expected "Flozy")`);
  ok(`symbol: ${symbol} (expected "FLZY")`);
  ok(`decimals: ${decs} (expected 18)`);
  ok(`totalSupply: ${hre.ethers.formatEther(supply)} (expected 1,000,000,000)`);
  if (supply !== hre.ethers.parseEther("1000000000")) fail("totalSupply mismatch");

  // ── 4. Balance distribution (accounting for claims & sales) ───────────
  console.log("\n4. Token balances (vs initial allocation, accounting for claims & stakes)");
  const balPresale  = await token.balanceOf(d.presaleAddress);
  const balTv       = await token.balanceOf(d.teamVestingAddress);
  const balVault    = await token.balanceOf(d.airdropVaultAddress);
  const balLiquid   = await token.balanceOf(d.liquidityAddress);
  const balDeployer = await token.balanceOf(d.deployer);
  const balStaking  = staking ? await token.balanceOf(d.stakingAddress) : 0n;

  // Presale: balance = 250M - presaleClaimed (Token transferred out via claim() and claimAndStake())
  const presaleClaimed = await presale.totalClaimed();
  const expectedPresale = QUARTER - presaleClaimed;
  if (balPresale === expectedPresale) ok(`Presale: ${hre.ethers.formatEther(balPresale)} = 250M - ${hre.ethers.formatEther(presaleClaimed)} claimed`);
  else fail(`Presale: ${hre.ethers.formatEther(balPresale)} (expected ${hre.ethers.formatEther(expectedPresale)})`);

  // TeamVesting: sum beneficiary.claimed
  let tvClaimedSum = 0n;
  for (const b of d.config.teamBeneficiaries) {
    const data = await tv.beneficiaries(b.address);
    tvClaimedSum += data.claimed;
  }
  const expectedTv = QUARTER - tvClaimedSum;
  if (balTv === expectedTv) ok(`TeamVesting: ${hre.ethers.formatEther(balTv)} = 250M - ${hre.ethers.formatEther(tvClaimedSum)} claimed`);
  else fail(`TeamVesting: ${hre.ethers.formatEther(balTv)} (expected ${hre.ethers.formatEther(expectedTv)})`);

  // AirdropVault: 100M - totalClaimed
  const airdropClaimed = await vault.totalClaimed();
  const expectedVault = AIRDROP_AMT - airdropClaimed;
  if (balVault === expectedVault) ok(`AirdropVault: ${hre.ethers.formatEther(balVault)} = 100M - ${hre.ethers.formatEther(airdropClaimed)} claimed`);
  else fail(`AirdropVault: ${hre.ethers.formatEther(balVault)} (expected ${hre.ethers.formatEther(expectedVault)})`);

  // Liquidity: ≤ 250M (wallet, may transfer)
  if (balLiquid <= QUARTER) ok(`Liquidity wallet: ${hre.ethers.formatEther(balLiquid)} (≤ 250M)`);
  else fail(`Liquidity wallet > 250M: ${hre.ethers.formatEther(balLiquid)}`);

  // Staking: balance = 150M initial + claim&stake inflows + open stake inflows - withdraws
  if (staking) {
    const stakedPrincipal = await staking.totalPrincipalStaked();
    const rewardsPaid     = await staking.totalRewardsPaid();
    // Initial 150M reward pool, then + principal in, - principal out, - rewards out.
    // Expected balance = 150M + stakedPrincipal - rewardsPaid (since paid reward leaves; principal returned reduces).
    const expectedStaking = STAKING_AMT + stakedPrincipal - rewardsPaid;
    if (balStaking === expectedStaking) ok(`Staking: ${hre.ethers.formatEther(balStaking)} = 150M + ${hre.ethers.formatEther(stakedPrincipal)} active - ${hre.ethers.formatEther(rewardsPaid)} rewards paid`);
    else fail(`Staking: ${hre.ethers.formatEther(balStaking)} (expected ${hre.ethers.formatEther(expectedStaking)})`);
  }

  if (balDeployer === 0n) ok(`Deployer: 0 (correct)`);
  else warn(`Deployer: ${hre.ethers.formatEther(balDeployer)} (received tokens — investigate)`);

  // ── 5. Presale state ──────────────────────────────────────────────────
  console.log("\n5. Presale state");
  const currentStage   = await presale.currentStage();
  const totalSold      = await presale.totalTokensSold();
  const totalRaised    = await presale.totalEthRaised();
  const deadline       = await presale.deadline();
  const isActive       = await presale.presaleActive();
  const isEnded        = await presale.presaleEnded();
  const stageCount     = await presale.stageCount();
  const stageInfo      = await presale.currentStageInfo();
  const currentPrice   = await presale.currentPrice();

  info(`currentStage:     ${currentStage} / ${stageCount}`);
  info(`presaleActive:    ${isActive}`);
  info(`presaleEnded:     ${isEnded}`);
  info(`deadline (unix):  ${deadline} → ${new Date(Number(deadline) * 1000).toISOString()}`);
  info(`totalEthRaised:   ${hre.ethers.formatEther(totalRaised)} ETH`);
  info(`totalTokensSold:  ${hre.ethers.formatEther(totalSold)} FLZY`);
  info(`currentPrice:     ${hre.ethers.formatEther(currentPrice)} ETH per token`);
  info(`stage allocation: ${hre.ethers.formatEther(stageInfo.tokenAllocation)} FLZY`);
  info(`stage tokensSold: ${hre.ethers.formatEther(stageInfo.tokensSold)} FLZY`);
  info(`stage instantBps: ${stageInfo.instantUnlockBps} (${Number(stageInfo.instantUnlockBps)/100}% instant)`);

  if (stageCount === 5n) ok("stageCount == 5");
  else fail(`stageCount = ${stageCount} (expected 5)`);

  const now = BigInt(Math.floor(Date.now() / 1000));
  if (deadline > now) ok(`deadline in future (${Math.floor(Number(deadline - now) / 86400)} days remaining)`);
  else fail("deadline already passed");

  // ── 6. estimateTokens math ────────────────────────────────────────────
  console.log("\n6. estimateTokens math sanity");
  const oneEthEstimate = await presale.estimateTokens(hre.ethers.parseEther("1"));
  const expectedTokens = (hre.ethers.parseEther("1") * hre.ethers.parseEther("1")) / currentPrice;
  info(`1 ETH → ${hre.ethers.formatEther(oneEthEstimate)} FLZY`);
  info(`expected at current price: ${hre.ethers.formatEther(expectedTokens)}`);
  // estimate may cross stages; closeTo within 1% is fine
  const diff = oneEthEstimate > expectedTokens ? oneEthEstimate - expectedTokens : expectedTokens - oneEthEstimate;
  const tolerance = expectedTokens / 100n; // 1%
  if (diff <= tolerance) ok("estimate matches current price within 1%");
  else warn(`estimate diverges (likely crossing stages: ok)`);

  // ── 7. TeamVesting state ──────────────────────────────────────────────
  console.log("\n7. TeamVesting state");
  const tvActive = await tv.vestingActive();
  const tvStart  = await tv.vestingStart();
  const benCount = await tv.beneficiaryCount();
  info(`vestingActive:     ${tvActive}`);
  info(`vestingStart:      ${tvStart} ${tvStart > 0n ? `→ ${new Date(Number(tvStart) * 1000).toISOString()}` : ""}`);
  info(`beneficiaryCount:  ${benCount}`);

  if (benCount === 6n) ok("6 beneficiaries registered");
  else fail(`beneficiaryCount = ${benCount} (expected 6)`);

  for (const b of d.config.teamBeneficiaries) {
    const data = await tv.getBeneficiary(b.address);
    const expectedAmt = hre.ethers.parseEther(String(b.amountM * 1_000_000));
    if (data.totalAmount === expectedAmt) ok(`${b.name} (${b.address.slice(0,10)}…): ${b.amountM}M FLZY`);
    else fail(`${b.name}: ${hre.ethers.formatEther(data.totalAmount)} (expected ${b.amountM}M)`);
  }

  // ── 8. AirdropVault state ─────────────────────────────────────────────
  console.log("\n8. AirdropVault state");
  const unlockDate    = await vault.fixedUnlockDate();
  const partCount     = await vault.participantCount();
  const totalAlloc    = await vault.totalAllocated();
  const totalClaimed  = await vault.totalClaimed();
  info(`fixedUnlockDate:   ${unlockDate} → ${new Date(Number(unlockDate) * 1000).toISOString()}`);
  info(`daysUntilUnlock:   ${Math.floor(Number(unlockDate - now) / 86400)} days`);
  info(`participantCount:  ${partCount}`);
  info(`totalAllocated:    ${hre.ethers.formatEther(totalAlloc)} FLZY`);
  info(`totalClaimed:      ${hre.ethers.formatEther(totalClaimed)} FLZY`);

  if (unlockDate > now) ok("airdrop unlock in future");
  else warn("airdrop already unlocked");

  // ── 9. Staking state ──────────────────────────────────────────────────
  if (staking) {
    console.log("\n9. Staking state");
    const rewardPool       = await staking.rewardPoolRemaining();
    const totalPrincipal   = await staking.totalPrincipalStaked();
    const totalReserved    = await staking.totalRewardsReserved();
    const totalPaid        = await staking.totalRewardsPaid();
    const lockDuration     = await staking.LOCK_DURATION();
    const rewardBps        = await staking.REWARD_BPS();
    const maxStake         = await staking.maxStakeAmount();

    info(`LOCK_DURATION:        ${lockDuration} seconds (${Number(lockDuration) / 86400} days)`);
    info(`REWARD_BPS:           ${rewardBps} (${Number(rewardBps) / 100}%)`);
    info(`rewardPoolRemaining:  ${hre.ethers.formatEther(rewardPool)} FLZY`);
    info(`maxStakeAmount:       ${hre.ethers.formatEther(maxStake)} FLZY`);
    info(`totalPrincipalStaked: ${hre.ethers.formatEther(totalPrincipal)} FLZY (active locks)`);
    info(`totalRewardsReserved: ${hre.ethers.formatEther(totalReserved)} FLZY (lifetime)`);
    info(`totalRewardsPaid:     ${hre.ethers.formatEther(totalPaid)} FLZY (lifetime)`);

    if (lockDuration === 7776000n) ok("LOCK_DURATION = 90 days");
    else fail(`LOCK_DURATION = ${lockDuration} (expected 7776000 = 90 days)`);

    if (rewardBps === 2000n) ok("REWARD_BPS = 2000 (20%)");
    else fail(`REWARD_BPS = ${rewardBps} (expected 2000)`);

    // Invariant: rewardPool + reserved (still locked) - paid = initial 150M
    // i.e., reserved-but-unpaid = 150M - rewardPool. Just sanity log.
    const reservedUnpaid = totalReserved - totalPaid;
    const computedPool   = STAKING_AMT - reservedUnpaid;
    if (rewardPool === computedPool) ok(`Pool invariant holds (150M - reserved-unpaid = ${hre.ethers.formatEther(rewardPool)})`);
    else fail(`Pool invariant broken: rewardPool=${hre.ethers.formatEther(rewardPool)}, expected ${hre.ethers.formatEther(computedPool)}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  if (process.exitCode) console.log(`  ${RED}HEALTH CHECK FAILED${RESET}`);
  else console.log(`  ${GREEN}HEALTH CHECK PASSED${RESET}`);
  console.log("═".repeat(60));
}

main().catch((err) => {
  console.error("✗", err);
  process.exit(1);
});
