import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const TOTAL_SUPPLY = hre.ethers.parseEther("1000000000");

// 1 team + 5 sponsors
const TEAM_AMOUNT    = hre.ethers.parseEther("100000000"); // 100M
const SPONSOR_AMOUNT = hre.ethers.parseEther("30000000");  //  30M
const TOTAL_VESTING  = TEAM_AMOUNT + SPONSOR_AMOUNT * 5n;  // 250M

const MONTH          = 30n * 24n * 3600n;
const VESTING_MONTHS = 24n;
const INSTANT_BPS    = 2500n; // 25% instant for all

async function deploy() {
  const [owner, team, sp1, sp2, sp3, sp4, sp5, other, liquidity] = await hre.ethers.getSigners();

  const addresses   = [team.address, sp1.address, sp2.address, sp3.address, sp4.address, sp5.address];
  const amounts     = [TEAM_AMOUNT, SPONSOR_AMOUNT, SPONSOR_AMOUNT, SPONSOR_AMOUNT, SPONSOR_AMOUNT, SPONSOR_AMOUNT];
  const instantBps  = [INSTANT_BPS, INSTANT_BPS, INSTANT_BPS, INSTANT_BPS, INSTANT_BPS, INSTANT_BPS];

  // vestingStart is fixed at deploy: 5 days in the future (simulates July 15 on mainnet)
  const vestingStart = BigInt(await time.latest()) + 86400n * 5n;

  // Deploy satellites with token=address(0)
  const TeamVesting = await hre.ethers.getContractFactory("TeamVesting");
  const tv = await TeamVesting.deploy(
    hre.ethers.ZeroAddress,
    addresses,
    amounts,
    instantBps,
    vestingStart,
    owner.address
  );

  // Presale and AirdropVault are needed for Token constructor; use minimal valid configs
  const deadline = BigInt(await time.latest()) + 86400n * 30n;
  const Presale = await hre.ethers.getContractFactory("Presale");
  const presale = await Presale.deploy(
    hre.ethers.ZeroAddress,
    0n, // startTime = 0 (immediate)
    deadline,
    [hre.ethers.parseEther("0.001")],
    [hre.ethers.parseEther("1000")],
    [2500n],
    owner.address
  );

  const fixedUnlock = BigInt(await time.latest()) + 86400n * 180n;
  const AirdropVault = await hre.ethers.getContractFactory("AirdropVault");
  const airdrop = await AirdropVault.deploy(hre.ethers.ZeroAddress, fixedUnlock, owner.address);

  const Staking = await hre.ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(
    hre.ethers.ZeroAddress,
    await presale.getAddress(),
    hre.ethers.parseEther("150000000"),
    owner.address
  );

  const PRESALE_A = hre.ethers.parseEther("250000000");
  const TEAM_A    = hre.ethers.parseEther("250000000");
  const AIRDROP_A = hre.ethers.parseEther("100000000");
  const LIQ_A     = hre.ethers.parseEther("250000000");
  const STAKING_A = hre.ethers.parseEther("150000000");
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy(
    "Flozy",
    "FLZY",
    TOTAL_SUPPLY,
    await presale.getAddress(),
    await tv.getAddress(),
    await airdrop.getAddress(),
    liquidity.address,
    await staking.getAddress(),
    PRESALE_A, TEAM_A, AIRDROP_A, LIQ_A, STAKING_A,
    owner.address
  );

  await tv.connect(owner).setToken(await token.getAddress());

  return { token, tv, owner, team, sp1, sp2, sp3, sp4, sp5, other, vestingStart };
}

// ─────────────────────────────────────────────────────────────────────────────

describe("TeamVesting", () => {
  describe("deployment", () => {
    it("stores correct beneficiary allocations", async () => {
      const { tv, team, sp1 } = await deploy();
      const teamData = await tv.beneficiaries(team.address);
      const sp1Data  = await tv.beneficiaries(sp1.address);
      expect(teamData.totalAmount).to.equal(TEAM_AMOUNT);
      expect(sp1Data.totalAmount).to.equal(SPONSOR_AMOUNT);
      expect(teamData.instantUnlockBps).to.equal(INSTANT_BPS);
    });

    it("registers all 6 beneficiaries", async () => {
      const { tv } = await deploy();
      expect(await tv.beneficiaryCount()).to.equal(6n);
    });

    it("holds correct token balance", async () => {
      const { tv, token } = await deploy();
      expect(await token.balanceOf(await tv.getAddress())).to.equal(TOTAL_VESTING);
    });

    it("vestingActive is true after deploy", async () => {
      const { tv } = await deploy();
      expect(await tv.vestingActive()).to.be.true;
    });

    it("vestingStart is set at deploy time", async () => {
      const { tv, vestingStart } = await deploy();
      expect(await tv.vestingStart()).to.equal(vestingStart);
    });
  });

  describe("claim", () => {
    it("reverts for non-beneficiary", async () => {
      const { tv, other } = await deploy();
      await expect(tv.connect(other).claim()).to.be.revertedWith("Not a beneficiary");
    });

    it("before vestingStart: only 25% instant is claimable", async () => {
      const { tv, token, team } = await deploy();
      // vestingStart is 5 days in the future — instant unlock available immediately
      const expectedInstant = (TEAM_AMOUNT * INSTANT_BPS) / 10000n;
      expect(await tv.getClaimableNow(team.address)).to.equal(expectedInstant);
      await tv.connect(team).claim();
      expect(await token.balanceOf(team.address)).to.equal(expectedInstant);
    });

    it("after 1 month: instant + 1/24 of vesting amount claimable", async () => {
      const { tv, token, team, vestingStart } = await deploy();
      await time.increaseTo(Number(vestingStart) + Number(MONTH));

      await tv.connect(team).claim();
      const instantAmount = (TEAM_AMOUNT * INSTANT_BPS) / 10000n;
      const vestingAmount = TEAM_AMOUNT - instantAmount;
      const expected = instantAmount + vestingAmount / 24n;
      expect(await token.balanceOf(team.address)).to.be.closeTo(expected, hre.ethers.parseEther("1"));
    });

    it("after 12 months: instant + 12/24 of vesting amount claimable", async () => {
      const { tv, token, sp1, vestingStart } = await deploy();
      await time.increaseTo(Number(vestingStart) + Number(MONTH * 12n));

      await tv.connect(sp1).claim();
      const instantAmount = (SPONSOR_AMOUNT * INSTANT_BPS) / 10000n;
      const vestingAmount = SPONSOR_AMOUNT - instantAmount;
      const expected = instantAmount + (vestingAmount * 12n) / 24n;
      expect(await token.balanceOf(sp1.address)).to.be.closeTo(expected, hre.ethers.parseEther("1"));
    });

    it("after 24 months: 100% claimable", async () => {
      const { tv, token, team, vestingStart } = await deploy();
      await time.increaseTo(Number(vestingStart) + Number(MONTH * VESTING_MONTHS));

      await tv.connect(team).claim();
      expect(await token.balanceOf(team.address)).to.equal(TEAM_AMOUNT);
    });

    it("second claim only gets newly vested tokens", async () => {
      const { tv, token, team, vestingStart } = await deploy();

      // Month 1
      await time.increaseTo(Number(vestingStart) + Number(MONTH));
      await tv.connect(team).claim();
      const instantAmount = (TEAM_AMOUNT * INSTANT_BPS) / 10000n;
      const vestingAmount = TEAM_AMOUNT - instantAmount;
      const after1 = await token.balanceOf(team.address);
      expect(after1).to.be.closeTo(instantAmount + vestingAmount / 24n, hre.ethers.parseEther("1"));

      // Month 24 — remaining
      await time.increaseTo(Number(vestingStart) + Number(MONTH * VESTING_MONTHS));
      await tv.connect(team).claim();
      expect(await token.balanceOf(team.address)).to.equal(TEAM_AMOUNT);
    });

    it("all 6 beneficiaries can claim independently", async () => {
      const { tv, token, team, sp1, sp2, sp3, sp4, sp5, vestingStart } = await deploy();
      await time.increaseTo(Number(vestingStart) + Number(MONTH * VESTING_MONTHS));

      await tv.connect(team).claim();
      await tv.connect(sp1).claim();
      await tv.connect(sp2).claim();
      await tv.connect(sp3).claim();
      await tv.connect(sp4).claim();
      await tv.connect(sp5).claim();

      expect(await token.balanceOf(team.address)).to.equal(TEAM_AMOUNT);
      expect(await token.balanceOf(sp1.address)).to.equal(SPONSOR_AMOUNT);
      expect(await token.balanceOf(sp5.address)).to.equal(SPONSOR_AMOUNT);
    });
  });

  describe("getClaimableNow", () => {
    it("returns 0 before vestingStart (but after deploy)", async () => {
      const { tv, team } = await deploy();
      // vestingStart is 5 days in future; instant unlock is available immediately
      const expectedInstant = (TEAM_AMOUNT * INSTANT_BPS) / 10000n;
      expect(await tv.getClaimableNow(team.address)).to.equal(expectedInstant);
    });

    it("returns correct amount after 1 month", async () => {
      const { tv, team, vestingStart } = await deploy();
      await time.increaseTo(Number(vestingStart) + Number(MONTH));
      const instantAmount = (TEAM_AMOUNT * INSTANT_BPS) / 10000n;
      const vestingAmount = TEAM_AMOUNT - instantAmount;
      const claimable = await tv.getClaimableNow(team.address);
      expect(claimable).to.be.closeTo(instantAmount + vestingAmount / 24n, hre.ethers.parseEther("1"));
    });
  });

  describe("getBeneficiary view", () => {
    it("returns correct data for team address", async () => {
      const { tv, team, vestingStart } = await deploy();
      await time.increaseTo(Number(vestingStart) + Number(MONTH));

      const data = await tv.getBeneficiary(team.address);
      expect(data.totalAmount).to.equal(TEAM_AMOUNT);
      expect(data.claimed).to.equal(0n);
      expect(data.claimableNow).to.be.gt(0n);
      expect(data.nextUnlockAt).to.be.gt(0n);
    });
  });
});
