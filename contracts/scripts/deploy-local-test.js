/**
 * deploy-local-test.js
 *
 * Local deploy for UI testing. Uses Hardhat test accounts as team & sponsor
 * beneficiaries so a single MetaMask-imported test key can claim from every
 * contract. Adds 3 airdrop participants out of the box.
 *
 * Hardhat accounts used:
 *   #0 deployer / owner
 *   #1 team & dev (100M FLZY) — IMPORT THIS PRIVATE KEY INTO METAMASK FOR TESTING
 *   #2-#6 sponsors (30M each)
 *   #7 liquidity wallet (receives 250M direct)
 *   #1, #2, #8 → also airdrop participants (5M / 3M / 1M FLZY)
 *
 * Usage:
 *   1. Start node:  npx hardhat node
 *   2. Deploy:      npx hardhat run scripts/deploy-local-test.js --network localhost
 */

import hre from "hardhat";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const signers = await hre.ethers.getSigners();
  const owner       = signers[0];
  const team        = signers[1];
  const sponsors    = [signers[2], signers[3], signers[4], signers[5], signers[6]];
  const liquidity   = signers[7];
  const airdrop1    = signers[1]; // same as team, for one-wallet testing
  const airdrop2    = signers[2];
  const airdrop3    = signers[8];

  const TOTAL_SUPPLY = hre.ethers.parseEther("1000000000");
  const QUARTER      = TOTAL_SUPPLY / 4n;
  const AIRDROP_AMT  = hre.ethers.parseEther("100000000"); // 100M
  const STAKING_AMT  = hre.ethers.parseEther("150000000"); // 150M

  // SHORT DEADLINES so we can end & unlock quickly via time-fast-forward.js
  const now = BigInt(Math.floor(Date.now() / 1000));
  const deadlineTs       = now + 30n * 86400n;      // 30 days — easy to fast-forward
  const airdropUnlockTs  = now + 60n * 86400n;      // 60 days — beyond presale

  // Presale stages — same prices as deploy.config.js
  const stagePrices = [
    hre.ethers.parseEther("0.000002"),
    hre.ethers.parseEther("0.0000022"),
    hre.ethers.parseEther("0.0000025"),
    hre.ethers.parseEther("0.000003"),
    hre.ethers.parseEther("0.000004"),
  ];
  const stageAllocations = Array(5).fill(hre.ethers.parseEther("50000000"));
  const instantUnlockBps = [2500n, 2000n, 1500n, 1000n, 500n];

  // Team beneficiaries — Hardhat accounts so user can claim
  const tvAddresses  = [team.address, ...sponsors.map((s) => s.address)];
  const tvAmounts    = [hre.ethers.parseEther("100000000"), ...Array(5).fill(hre.ethers.parseEther("30000000"))];
  const tvInstantBps = Array(6).fill(2500n);

  console.log("═".repeat(60));
  console.log("  FLOZY LOCAL TEST DEPLOY");
  console.log("═".repeat(60));
  console.log("Owner / deployer  :", owner.address);
  console.log("Team beneficiary 1:", team.address, "← IMPORT THIS KEY");
  console.log("Sponsor 1         :", sponsors[0].address);
  console.log("Liquidity wallet  :", liquidity.address);
  console.log("Presale deadline  :", new Date(Number(deadlineTs) * 1000).toISOString());
  console.log("Airdrop unlock    :", new Date(Number(airdropUnlockTs) * 1000).toISOString());
  console.log("");

  // 1. Presale
  const Presale = await hre.ethers.getContractFactory("Presale");
  const presale = await Presale.deploy(
    hre.ethers.ZeroAddress,
    0n, // startTime = 0 (immediate — for testing)
    deadlineTs,
    stagePrices,
    stageAllocations,
    instantUnlockBps,
    owner.address
  );
  console.log("Presale       :", await presale.getAddress());

  // 2. TeamVesting
  const TeamVesting = await hre.ethers.getContractFactory("TeamVesting");
  const tv = await TeamVesting.deploy(
    hre.ethers.ZeroAddress,
    tvAddresses,
    tvAmounts,
    tvInstantBps,
    owner.address
  );
  console.log("TeamVesting   :", await tv.getAddress());

  // 3. AirdropVault
  const AirdropVault = await hre.ethers.getContractFactory("AirdropVault");
  const vault = await AirdropVault.deploy(hre.ethers.ZeroAddress, airdropUnlockTs, owner.address);
  console.log("AirdropVault  :", await vault.getAddress());

  // 4. Staking (90-day lock, 20% reward, 150M pool)
  const Staking = await hre.ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(
    hre.ethers.ZeroAddress,
    await presale.getAddress(),
    STAKING_AMT,
    owner.address
  );
  console.log("Staking       :", await staking.getAddress());

  // 5. Token (mints to all 5 recipients)
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy(
    "Flozy", "FLZY", TOTAL_SUPPLY,
    await presale.getAddress(),
    await tv.getAddress(),
    await vault.getAddress(),
    liquidity.address,
    await staking.getAddress(),
    QUARTER, QUARTER, AIRDROP_AMT, QUARTER, STAKING_AMT,
    owner.address
  );
  console.log("Token         :", await token.getAddress());

  // 6. Wire token + staking
  await (await presale.setToken(await token.getAddress())).wait();
  await (await tv.setToken(await token.getAddress())).wait();
  await (await vault.setToken(await token.getAddress())).wait();
  await (await staking.setToken(await token.getAddress())).wait();
  await (await presale.setStakingContract(await staking.getAddress())).wait();
  console.log("\n✓ setToken called on all 4 satellites + Presale.setStakingContract");

  // NOTE: Airdrop participants are NOT pre-loaded — they will be added later
  // via scripts/add-airdrop-user.js (simulating the real flow: form during presale
  // → Sheets list → owner adds wallets after presale ends).
  console.log("✓ Airdrop list left empty — add later via add-airdrop-user.js");

  // Save deployment record (so health-check works on localhost too)
  const dep = {
    network: "localhost",
    chainId: "31337",
    tokenAddress: await token.getAddress(),
    presaleAddress: await presale.getAddress(),
    teamVestingAddress: await tv.getAddress(),
    airdropVaultAddress: await vault.getAddress(),
    stakingAddress: await staking.getAddress(),
    liquidityAddress: liquidity.address,
    deployer: owner.address,
    deployedAt: new Date().toISOString(),
    config: {
      tokenName: "Flozy",
      tokenSymbol: "FLZY",
      totalSupply: "1000000000",
      deadline: new Date(Number(deadlineTs) * 1000).toISOString().slice(0, 10),
      fixedAirdropDate: new Date(Number(airdropUnlockTs) * 1000).toISOString().slice(0, 10),
      stages: stagePrices.map((p, i) => ({
        priceEth: hre.ethers.formatEther(p),
        allocationM: 50,
        instantUnlockBps: Number(instantUnlockBps[i]),
      })),
      teamBeneficiaries: tvAddresses.map((addr, i) => ({
        name: i === 0 ? "Team & Dev" : `Sponsor ${i}`,
        address: addr,
        amountM: i === 0 ? 100 : 30,
        instantUnlockBps: 2500,
      })),
      distribution: { presale: 250, teamVesting: 250, airdrop: 100, liquidity: 250, staking: 150 },
      staking: { lockDays: 90, rewardBps: 2000 },
    },
  };
  const outDir = resolve(__dirname, "../deployments");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "localhost.json"), JSON.stringify(dep, null, 2));

  console.log("\n" + "═".repeat(60));
  console.log("  ✓ DEPLOY COMPLETE — copy this to frontend/.env.local");
  console.log("═".repeat(60));
  console.log(`NEXT_PUBLIC_TOKEN_ADDRESS=${await token.getAddress()}`);
  console.log(`NEXT_PUBLIC_PRESALE_ADDRESS=${await presale.getAddress()}`);
  console.log(`NEXT_PUBLIC_TEAM_VESTING_ADDRESS=${await tv.getAddress()}`);
  console.log(`NEXT_PUBLIC_AIRDROP_VAULT_ADDRESS=${await vault.getAddress()}`);
  console.log(`NEXT_PUBLIC_STAKING_ADDRESS=${await staking.getAddress()}`);
  console.log(`NEXT_PUBLIC_CHAIN_ID=31337`);
  console.log("\nThen: cd ../frontend && npm run dev");
  console.log("\nMetaMask:");
  console.log("  - Add network: Hardhat Local, RPC http://127.0.0.1:8545, chainId 31337, currency ETH");
  console.log("  - Import private key (Account #1, 10000 ETH):");
  console.log("    0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
}

main().catch((e) => { console.error(e); process.exit(1); });
