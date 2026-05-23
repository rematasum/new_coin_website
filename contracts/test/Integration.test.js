import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * Full end-to-end deploy & lifecycle test.
 * Mirrors deploy.config.js exactly: 1B supply, 5 stages × 50M, 6 team beneficiaries.
 * Runs: deploy → multi-buyer presale → endPresale → claim instant → time travel
 * monthly tranches → fully vested → burnUnsold → withdrawETH → airdrop unlock & claim.
 */

const ETHER = hre.ethers.parseEther("1");
const TOTAL_SUPPLY = hre.ethers.parseEther("1000000000"); // 1B
const QUARTER      = TOTAL_SUPPLY / 4n; // 250M (presale, team, liquidity)
const AIRDROP_AMT  = hre.ethers.parseEther("100000000");  // 100M
const STAKING_AMT  = hre.ethers.parseEther("150000000");  // 150M
const STAKE_LOCK   = 90n * 24n * 3600n;
const STAKE_REWARD_BPS = 2000n;

const STAGE_PRICES = [
  hre.ethers.parseEther("0.000002"),
  hre.ethers.parseEther("0.0000022"),
  hre.ethers.parseEther("0.0000025"),
  hre.ethers.parseEther("0.000003"),
  hre.ethers.parseEther("0.000004"),
];
const STAGE_ALLOCS = [
  hre.ethers.parseEther("50000000"),
  hre.ethers.parseEther("50000000"),
  hre.ethers.parseEther("50000000"),
  hre.ethers.parseEther("50000000"),
  hre.ethers.parseEther("50000000"),
];
const INSTANT_UNLOCK_BPS = [2500n, 2000n, 1500n, 1000n, 500n];

const TEAM_AMT     = hre.ethers.parseEther("100000000"); // 100M
const SPONSOR_AMT  = hre.ethers.parseEther("30000000");  //  30M
const MONTH = 30n * 24n * 3600n;
const VESTING_MONTHS = 24n;

async function deployAll() {
  const [owner, b1, b2, b3, team, sp1, sp2, sp3, sp4, sp5, liquidity, ad1, ad2] = await hre.ethers.getSigners();

  const deadline        = BigInt(await time.latest()) + 86400n * 90n;
  const fixedAirdropDate = BigInt(await time.latest()) + 86400n * 180n;

  const Presale = await hre.ethers.getContractFactory("Presale");
  const presale = await Presale.deploy(
    hre.ethers.ZeroAddress, 0n, deadline, STAGE_PRICES, STAGE_ALLOCS, INSTANT_UNLOCK_BPS, owner.address
  );

  const teamAddrs   = [team.address, sp1.address, sp2.address, sp3.address, sp4.address, sp5.address];
  const teamAmts    = [TEAM_AMT, SPONSOR_AMT, SPONSOR_AMT, SPONSOR_AMT, SPONSOR_AMT, SPONSOR_AMT];
  const teamInstBps = [2500n, 2500n, 2500n, 2500n, 2500n, 2500n];

  const TeamVesting = await hre.ethers.getContractFactory("TeamVesting");
  const tvVestingStart = BigInt(await time.latest()) + 86400n * 5n;
  const tv = await TeamVesting.deploy(hre.ethers.ZeroAddress, teamAddrs, teamAmts, teamInstBps, tvVestingStart, owner.address);

  const AirdropVault = await hre.ethers.getContractFactory("AirdropVault");
  const vault = await AirdropVault.deploy(hre.ethers.ZeroAddress, fixedAirdropDate, owner.address);

  const Staking = await hre.ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(
    hre.ethers.ZeroAddress,
    await presale.getAddress(),
    STAKING_AMT,
    owner.address
  );

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

  await presale.connect(owner).setToken(await token.getAddress());
  await tv.connect(owner).setToken(await token.getAddress());
  await vault.connect(owner).setToken(await token.getAddress());
  await staking.connect(owner).setToken(await token.getAddress());
  await presale.connect(owner).setStakingContract(await staking.getAddress());

  return {
    token, presale, tv, vault, staking,
    owner, b1, b2, b3, team, sp1, sp2, sp3, sp4, sp5, liquidity, ad1, ad2,
    deadline, fixedAirdropDate,
  };
}

describe("Integration — full presale lifecycle", () => {
  it("distributes 1B supply correctly at deploy (250M/250M/100M/250M/150M)", async () => {
    const { token, presale, tv, vault, staking, liquidity, owner } = await deployAll();

    expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY);
    expect(await token.balanceOf(await presale.getAddress())).to.equal(QUARTER);
    expect(await token.balanceOf(await tv.getAddress())).to.equal(QUARTER);
    expect(await token.balanceOf(await vault.getAddress())).to.equal(AIRDROP_AMT);
    expect(await token.balanceOf(liquidity.address)).to.equal(QUARTER);
    expect(await token.balanceOf(await staking.getAddress())).to.equal(STAKING_AMT);
    expect(await token.balanceOf(owner.address)).to.equal(0n);
  });

  it("rejects amounts that don't sum to total supply", async () => {
    const [owner, p, t, a, l, s] = await hre.ethers.getSigners();
    const Token = await hre.ethers.getContractFactory("Token");
    await expect(
      Token.deploy(
        "F", "F", TOTAL_SUPPLY,
        p.address, t.address, a.address, l.address, s.address,
        QUARTER, QUARTER, AIRDROP_AMT, QUARTER, STAKING_AMT + 1n,
        owner.address
      )
    ).to.be.revertedWith("Amounts must equal total supply");
  });

  it("FULL LIFECYCLE: 3 buyers across stages → end → instant claim → vesting → burn → withdraw → airdrop", async () => {
    const ctx = await deployAll();
    const { token, presale, tv, vault, owner, b1, b2, b3, team, sp1, ad1, ad2, fixedAirdropDate } = ctx;

    // ── Phase 1: Three buyers buy in different stages ─────────────────────
    // b1 buys 0.5 ETH in stage 0
    await presale.connect(b1).buy({ value: hre.ethers.parseEther("0.5") });
    // b2 buys enough to push past stage 0 (~100 ETH = 50M tokens in stage 0)
    const ethStage0Remaining = (STAGE_ALLOCS[0] * STAGE_PRICES[0]) / ETHER - hre.ethers.parseEther("0.5");
    await presale.connect(b2).buy({ value: ethStage0Remaining + hre.ethers.parseEther("10") });
    // b3 buys 5 ETH in stage 1 (or wherever stage now is)
    await presale.connect(b3).buy({ value: hre.ethers.parseEther("5") });

    // Verify state
    expect(await presale.totalEthRaised()).to.be.gt(0n);
    expect(await presale.totalTokensSold()).to.be.gt(0n);
    expect(await presale.presaleEnded()).to.be.false;

    // ── Phase 2: Owner ends presale early ────────────────────────────────
    await presale.connect(owner).endPresale();
    expect(await presale.presaleEnded()).to.be.true;
    const vestingStart = await presale.vestingStart();
    expect(vestingStart).to.be.gt(0n);
    expect(vestingStart % 86400n).to.equal(0n); // midnight UTC

    // ── Phase 3: Instant claim works for b1 ──────────────────────────────
    const b1TotalTokens = await presale.contributions(b1.address);
    const b1Claimable = await presale.getClaimableNow(b1.address);
    expect(b1Claimable).to.be.gt(0n);
    expect(b1Claimable).to.be.lt(b1TotalTokens); // only instant portion

    await presale.connect(b1).claim();
    expect(await token.balanceOf(b1.address)).to.equal(b1Claimable);

    // Second claim immediately — no new vesting yet
    await expect(presale.connect(b1).claim()).to.be.revertedWith("Nothing to claim");

    // ── Phase 4: Time travel — 12 months → b2 claims partial vesting ─────
    await time.increaseTo(Number(vestingStart) + Number(MONTH * 12n));
    const b2ClaimableAt12 = await presale.getClaimableNow(b2.address);
    expect(b2ClaimableAt12).to.be.gt(0n);
    await presale.connect(b2).claim();
    expect(await token.balanceOf(b2.address)).to.be.gt(0n);

    // ── Phase 5: Time travel to 24 months → all buyers fully claim ───────
    await time.increaseTo(Number(vestingStart) + Number(MONTH * VESTING_MONTHS) + 1);
    await presale.connect(b1).claim();
    await presale.connect(b2).claim();
    await presale.connect(b3).claim();

    expect(await token.balanceOf(b1.address)).to.equal(await presale.contributions(b1.address));
    expect(await token.balanceOf(b2.address)).to.equal(await presale.contributions(b2.address));
    expect(await token.balanceOf(b3.address)).to.equal(await presale.contributions(b3.address));

    // ── Phase 6: Burn unsold ─────────────────────────────────────────────
    const totalSold = await presale.totalTokensSold();
    const presaleBalBefore = await token.balanceOf(await presale.getAddress());
    expect(presaleBalBefore).to.be.gt(0n); // unsold remains
    await presale.connect(owner).burnUnsold();
    const burned = await token.balanceOf("0x000000000000000000000000000000000000dEaD");
    expect(burned).to.equal(QUARTER - totalSold);

    // ── Phase 7: Withdraw ETH to owner ───────────────────────────────────
    const ownerEthBefore = await hre.ethers.provider.getBalance(owner.address);
    const raised = await presale.totalEthRaised();
    const tx = await presale.connect(owner).withdrawETH(owner.address);
    const r = await tx.wait();
    const gas = r.gasUsed * r.gasPrice;
    const ownerEthAfter = await hre.ethers.provider.getBalance(owner.address);
    expect(ownerEthAfter - ownerEthBefore + gas).to.equal(raised);

    // ── Phase 8: Team vesting — vestingStart set at deploy → claim ───────
    // Presale time-travel already carried us past tvVestingEnd; claim directly.
    await tv.connect(team).claim();
    await tv.connect(sp1).claim();
    expect(await token.balanceOf(team.address)).to.equal(TEAM_AMT);
    expect(await token.balanceOf(sp1.address)).to.equal(SPONSOR_AMT);

    // ── Phase 9: Airdrop — add list, advance to unlock, claim ────────────
    const adAmt = hre.ethers.parseEther("10000"); // fixed: AMOUNT_PER_WALLET
    await vault.connect(owner).addAirdropParticipants(
      [ad1.address, ad2.address],
      [adAmt, adAmt]
    );

    // Advance to airdrop unlock date
    if (BigInt(await time.latest()) < fixedAirdropDate) {
      await time.increaseTo(fixedAirdropDate + 1n);
    }

    await vault.connect(ad1).claim();
    await vault.connect(ad2).claim();
    expect(await token.balanceOf(ad1.address)).to.equal(adAmt);
    expect(await token.balanceOf(ad2.address)).to.equal(adAmt);
  });

  it("presale auto-ends when all 250M tokens sell out (deadline path not needed)", async () => {
    const { presale, b1 } = await deployAll();

    // Total ETH needed = sum(allocation × price) across all 5 stages
    let totalEth = 0n;
    for (let i = 0; i < 5; i++) totalEth += (STAGE_ALLOCS[i] * STAGE_PRICES[i]) / ETHER;

    await presale.connect(b1).buy({ value: totalEth + ETHER });

    expect(await presale.presaleEnded()).to.be.true;
    expect(await presale.totalTokensSold()).to.equal(QUARTER); // exactly 250M
    expect(await presale.currentStage()).to.equal(5n); // beyond last stage
  });

  it("vestingStart computed by _nextFifteenth lies on the 15th of a month", async () => {
    const { presale, b1, owner } = await deployAll();
    await presale.connect(b1).buy({ value: ETHER });
    await presale.connect(owner).endPresale();

    const vs = await presale.vestingStart();
    // Convert to UTC and verify day == 15
    const date = new Date(Number(vs) * 1000);
    expect(date.getUTCDate()).to.equal(15);
    expect(date.getUTCHours()).to.equal(0);
    expect(date.getUTCMinutes()).to.equal(0);
  });

  it("CLAIM & STAKE full flow: buy → end → claimAndStake → 90d → withdraw = principal + 20%", async () => {
    const { presale, staking, token, owner, b1 } = await deployAll();

    await presale.connect(b1).buy({ value: hre.ethers.parseEther("0.5") });
    await presale.connect(owner).endPresale();

    const claimable = await presale.getClaimableNow(b1.address);
    expect(claimable).to.be.gt(0n);

    await presale.connect(b1).claimAndStake();
    expect(await token.balanceOf(b1.address)).to.equal(0n);

    const positions = await staking.getPositions(b1.address);
    expect(positions.length).to.equal(1);
    expect(positions[0].amount).to.equal(claimable);
    const expectedReward = (claimable * STAKE_REWARD_BPS) / 10000n;
    expect(positions[0].reward).to.equal(expectedReward);

    // Time travel 90 days
    await time.increase(Number(STAKE_LOCK) + 1);

    await staking.connect(b1).withdraw(0);
    expect(await token.balanceOf(b1.address)).to.equal(claimable + expectedReward);
  });

  it("open staking widget: user can stake their own FLZY (approve + stake) and withdraw with reward", async () => {
    // Mirrors the production "Stake $FLZY" widget flow for an existing holder.
    const { staking, token, liquidity, b1 } = await deployAll();

    const stakeAmount = hre.ethers.parseEther("1000000"); // 1M FLZY
    await token.connect(liquidity).transfer(b1.address, stakeAmount);

    await token.connect(b1).approve(await staking.getAddress(), stakeAmount);
    await staking.connect(b1).stake(stakeAmount);

    expect(await token.balanceOf(b1.address)).to.equal(0n);
    const positions = await staking.getPositions(b1.address);
    expect(positions.length).to.equal(1);
    expect(positions[0].amount).to.equal(stakeAmount);

    await time.increase(Number(STAKE_LOCK) + 1);
    await staking.connect(b1).withdraw(0);

    const expectedReward = (stakeAmount * STAKE_REWARD_BPS) / 10000n;
    expect(await token.balanceOf(b1.address)).to.equal(stakeAmount + expectedReward);
  });
});
