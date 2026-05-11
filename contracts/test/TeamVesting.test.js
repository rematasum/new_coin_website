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
  const [owner, team, sp1, sp2, sp3, sp4, sp5, other] = await hre.ethers.getSigners();

  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy("Flozy", "FLZY", TOTAL_SUPPLY, owner.address);

  const addresses   = [team.address, sp1.address, sp2.address, sp3.address, sp4.address, sp5.address];
  const amounts     = [TEAM_AMOUNT, SPONSOR_AMOUNT, SPONSOR_AMOUNT, SPONSOR_AMOUNT, SPONSOR_AMOUNT, SPONSOR_AMOUNT];
  const instantBps  = [INSTANT_BPS, INSTANT_BPS, INSTANT_BPS, INSTANT_BPS, INSTANT_BPS, INSTANT_BPS];

  const TeamVesting = await hre.ethers.getContractFactory("TeamVesting");
  const tv = await TeamVesting.deploy(
    await token.getAddress(),
    addresses,
    amounts,
    instantBps,
    owner.address
  );

  await token.transfer(await tv.getAddress(), TOTAL_VESTING);

  return { token, tv, owner, team, sp1, sp2, sp3, sp4, sp5, other };
}

// Start vesting at a future timestamp (e.g. next month's 15th approximation)
async function deployAndStart() {
  const ctx = await deploy();
  const firstFifteenth = BigInt(await time.latest()) + 86400n * 5n; // 5 days from now
  await ctx.tv.connect(ctx.owner).startVesting(firstFifteenth);
  ctx.vestingStart = firstFifteenth;
  return ctx;
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

    it("vestingActive is false before startVesting", async () => {
      const { tv } = await deploy();
      expect(await tv.vestingActive()).to.be.false;
    });
  });

  describe("startVesting", () => {
    it("sets vestingStart and marks active", async () => {
      const { tv, owner } = await deploy();
      const ts = BigInt(await time.latest()) + 86400n;
      await tv.connect(owner).startVesting(ts);
      expect(await tv.vestingStart()).to.equal(ts);
      expect(await tv.vestingActive()).to.be.true;
    });

    it("reverts if timestamp is in the past", async () => {
      const { tv, owner } = await deploy();
      const past = BigInt(await time.latest()) - 1n;
      await expect(tv.connect(owner).startVesting(past)).to.be.revertedWith("Must be in future");
    });

    it("reverts if called twice", async () => {
      const { tv, owner } = await deployAndStart();
      await expect(tv.connect(owner).startVesting(BigInt(await time.latest()) + 86400n))
        .to.be.revertedWith("Already started");
    });

    it("reverts if called by non-owner", async () => {
      const { tv, team } = await deploy();
      await expect(tv.connect(team).startVesting(BigInt(await time.latest()) + 86400n))
        .to.be.revertedWithCustomError(tv, "OwnableUnauthorizedAccount");
    });
  });

  describe("claim", () => {
    it("reverts if vesting not started", async () => {
      const { tv, team } = await deploy();
      await expect(tv.connect(team).claim()).to.be.revertedWith("Vesting not started");
    });

    it("reverts for non-beneficiary", async () => {
      const { tv, other } = await deployAndStart();
      await expect(tv.connect(other).claim()).to.be.revertedWith("Not a beneficiary");
    });

    it("before vestingStart: only 25% instant is claimable", async () => {
      const { tv, token, team } = await deployAndStart();
      // vestingStart is 5 days in the future — instant unlock available immediately
      const expectedInstant = (TEAM_AMOUNT * INSTANT_BPS) / 10000n;
      expect(await tv.getClaimableNow(team.address)).to.equal(expectedInstant);
      await tv.connect(team).claim();
      expect(await token.balanceOf(team.address)).to.equal(expectedInstant);
    });

    it("after 1 month: instant + 1/24 of vesting amount claimable", async () => {
      const { tv, token, team, vestingStart } = await deployAndStart();
      await time.increaseTo(Number(vestingStart) + Number(MONTH));

      await tv.connect(team).claim();
      const instantAmount = (TEAM_AMOUNT * INSTANT_BPS) / 10000n;
      const vestingAmount = TEAM_AMOUNT - instantAmount;
      const expected = instantAmount + vestingAmount / 24n;
      expect(await token.balanceOf(team.address)).to.be.closeTo(expected, hre.ethers.parseEther("1"));
    });

    it("after 12 months: instant + 12/24 of vesting amount claimable", async () => {
      const { tv, token, sp1, vestingStart } = await deployAndStart();
      await time.increaseTo(Number(vestingStart) + Number(MONTH * 12n));

      await tv.connect(sp1).claim();
      const instantAmount = (SPONSOR_AMOUNT * INSTANT_BPS) / 10000n;
      const vestingAmount = SPONSOR_AMOUNT - instantAmount;
      const expected = instantAmount + (vestingAmount * 12n) / 24n;
      expect(await token.balanceOf(sp1.address)).to.be.closeTo(expected, hre.ethers.parseEther("1"));
    });

    it("after 24 months: 100% claimable", async () => {
      const { tv, token, team, vestingStart } = await deployAndStart();
      await time.increaseTo(Number(vestingStart) + Number(MONTH * VESTING_MONTHS));

      await tv.connect(team).claim();
      expect(await token.balanceOf(team.address)).to.equal(TEAM_AMOUNT);
    });

    it("second claim only gets newly vested tokens", async () => {
      const { tv, token, team, vestingStart } = await deployAndStart();

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
      const { tv, token, team, sp1, sp2, sp3, sp4, sp5, vestingStart } = await deployAndStart();
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
    it("returns 0 before vesting starts", async () => {
      const { tv, team } = await deploy();
      expect(await tv.getClaimableNow(team.address)).to.equal(0n);
    });

    it("returns correct amount after 1 month", async () => {
      const { tv, team, vestingStart } = await deployAndStart();
      await time.increaseTo(Number(vestingStart) + Number(MONTH));
      const instantAmount = (TEAM_AMOUNT * INSTANT_BPS) / 10000n;
      const vestingAmount = TEAM_AMOUNT - instantAmount;
      const claimable = await tv.getClaimableNow(team.address);
      expect(claimable).to.be.closeTo(instantAmount + vestingAmount / 24n, hre.ethers.parseEther("1"));
    });
  });

  describe("getBeneficiary view", () => {
    it("returns correct data for team address", async () => {
      const { tv, team, vestingStart } = await deployAndStart();
      await time.increaseTo(Number(vestingStart) + Number(MONTH));

      const data = await tv.getBeneficiary(team.address);
      expect(data.totalAmount).to.equal(TEAM_AMOUNT);
      expect(data.claimed).to.equal(0n);
      expect(data.claimableNow).to.be.gt(0n);
      expect(data.nextUnlockAt).to.be.gt(0n);
    });
  });
});
