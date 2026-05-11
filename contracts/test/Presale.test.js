import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const TOTAL_SUPPLY  = hre.ethers.parseEther("1000000000"); // 1B
const PRESALE_AMOUNT = TOTAL_SUPPLY / 4n; // 250M

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

const MONTH = 30n * 24n * 3600n; // 30 days in seconds
const VESTING_MONTHS = 24n;

async function deploy() {
  const [owner, buyer1, buyer2] = await hre.ethers.getSigners();
  const deadline = BigInt(await time.latest()) + 86400n * 30n;

  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy("Flozy", "FLZY", TOTAL_SUPPLY, owner.address);

  const Presale = await hre.ethers.getContractFactory("Presale");
  const presale = await Presale.deploy(
    await token.getAddress(),
    deadline,
    STAGE_PRICES,
    STAGE_ALLOCS,
    INSTANT_UNLOCK_BPS,
    owner.address
  );

  await token.transfer(await presale.getAddress(), PRESALE_AMOUNT);

  return { token, presale, owner, buyer1, buyer2, deadline };
}

// Buy then owner-end the presale; attaches vestingStart to context
async function buyAndEnd(ethIn = hre.ethers.parseEther("1")) {
  const ctx = await deploy();
  await ctx.presale.connect(ctx.buyer1).buy({ value: ethIn });
  await ctx.presale.connect(ctx.owner).endPresale();
  ctx.vestingStart = await ctx.presale.vestingStart();
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────

describe("Token", () => {
  it("mints total supply to owner", async () => {
    const { token, owner } = await deploy();
    expect(await token.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY - PRESALE_AMOUNT);
  });
});

describe("Presale", () => {
  describe("deployment", () => {
    it("sets correct initial state", async () => {
      const { presale } = await deploy();
      expect(await presale.currentStage()).to.equal(0);
      expect(await presale.presaleActive()).to.be.true;
      expect(await presale.presaleEnded()).to.be.false;
      expect(await presale.stageCount()).to.equal(5);
    });

    it("rejects past deadline", async () => {
      const [owner] = await hre.ethers.getSigners();
      const Token = await hre.ethers.getContractFactory("Token");
      const token = await Token.deploy("F", "F", TOTAL_SUPPLY, owner.address);
      const Presale = await hre.ethers.getContractFactory("Presale");
      const pastDeadline = BigInt(await time.latest()) - 1n;
      await expect(
        Presale.deploy(await token.getAddress(), pastDeadline, STAGE_PRICES, STAGE_ALLOCS, INSTANT_UNLOCK_BPS, owner.address)
      ).to.be.revertedWith("Deadline in past");
    });
  });

  describe("buy", () => {
    it("credits correct token amount for ETH sent", async () => {
      const { presale, buyer1 } = await deploy();
      const ethIn = hre.ethers.parseEther("0.1");
      await presale.connect(buyer1).buy({ value: ethIn });

      const expectedTokens = (ethIn * hre.ethers.parseEther("1")) / STAGE_PRICES[0];
      expect(await presale.contributions(buyer1.address)).to.equal(expectedTokens);
      expect((await presale.vestingRecords(buyer1.address, 0)).totalAmount).to.equal(expectedTokens);
    });

    it("does not over-charge ETH", async () => {
      const { presale, buyer1 } = await deploy();
      const ethIn = hre.ethers.parseEther("1.5");
      const before = await hre.ethers.provider.getBalance(buyer1.address);
      const tx = await presale.connect(buyer1).buy({ value: ethIn });
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const after = await hre.ethers.provider.getBalance(buyer1.address);
      expect(before - after - gasCost).to.be.lte(ethIn);
    });

    it("spans multiple stages when ETH is large enough", async () => {
      const { presale, buyer1 } = await deploy();
      const ethForStage0 = (STAGE_ALLOCS[0] * STAGE_PRICES[0]) / hre.ethers.parseEther("1");
      await presale.connect(buyer1).buy({ value: ethForStage0 + hre.ethers.parseEther("1") });

      const stage0Record = await presale.vestingRecords(buyer1.address, 0);
      const stage1Record = await presale.vestingRecords(buyer1.address, 1);
      expect(stage0Record.totalAmount).to.be.gt(0);
      expect(stage1Record.totalAmount).to.be.gt(0);
    });

    it("ends presale when all stages sell out", async () => {
      const { presale, buyer1 } = await deploy();
      const totalEth = STAGE_ALLOCS.reduce((acc, alloc, i) => {
        return acc + (alloc * STAGE_PRICES[i]) / hre.ethers.parseEther("1");
      }, 0n);
      await presale.connect(buyer1).buy({ value: totalEth });
      expect(await presale.presaleEnded()).to.be.true;
    });

    it("reverts after deadline", async () => {
      const { presale, buyer1, deadline } = await deploy();
      await time.increaseTo(deadline + 1n);
      await expect(
        presale.connect(buyer1).buy({ value: hre.ethers.parseEther("1") })
      ).to.be.revertedWith("Deadline passed");
    });

    it("reverts when paused", async () => {
      const { presale, owner, buyer1 } = await deploy();
      await presale.connect(owner).toggleActive(false);
      await expect(
        presale.connect(buyer1).buy({ value: hre.ethers.parseEther("1") })
      ).to.be.revertedWith("Presale not active");
    });
  });

  describe("vestingStart (_nextFifteenth)", () => {
    it("is set when presale ends", async () => {
      const { vestingStart } = await buyAndEnd();
      expect(vestingStart).to.be.gt(0n);
    });

    it("is midnight UTC (divisible by 86400)", async () => {
      const { vestingStart } = await buyAndEnd();
      expect(vestingStart % 86400n).to.equal(0n);
    });

    it("is on or after presaleEndTime", async () => {
      const ctx = await buyAndEnd();
      const endTime = await ctx.presale.presaleEndTime();
      expect(ctx.vestingStart).to.be.gte(endTime);
    });
  });

  describe("vesting & claim (monthly tranches)", () => {
    it("reverts if presale still active", async () => {
      const { presale, buyer1 } = await deploy();
      await presale.connect(buyer1).buy({ value: hre.ethers.parseEther("1") });
      await expect(presale.connect(buyer1).claim()).to.be.revertedWith("Presale not ended yet");
    });

    it("reverts with nothing to claim if user has no tokens", async () => {
      const { presale, buyer1, deadline } = await deploy();
      await time.increaseTo(deadline + 1n);
      await expect(presale.connect(buyer1).claim()).to.be.revertedWith("Nothing to claim");
    });

    it("instant unlock (25%) available right after presale ends, before vestingStart", async () => {
      const { presale, token, buyer1, vestingStart } = await buyAndEnd();
      const totalTokens    = (await presale.vestingRecords(buyer1.address, 0)).totalAmount;
      const expectedInstant = (totalTokens * 2500n) / 10000n;

      expect(BigInt(await time.latest())).to.be.lt(vestingStart);
      expect(await presale.getClaimableNow(buyer1.address)).to.equal(expectedInstant);

      await presale.connect(buyer1).claim();
      expect(await token.balanceOf(buyer1.address)).to.equal(expectedInstant);
    });

    it("after 1 month: instant + 1/24 of vesting amount unlocked", async () => {
      const { presale, token, buyer1, vestingStart } = await buyAndEnd();
      const totalTokens   = (await presale.vestingRecords(buyer1.address, 0)).totalAmount;
      const instantAmount = (totalTokens * 2500n) / 10000n;
      const vestingAmount = totalTokens - instantAmount;

      await time.increaseTo(Number(vestingStart) + Number(MONTH));

      await presale.connect(buyer1).claim();
      const expected = instantAmount + vestingAmount / 24n;
      expect(await token.balanceOf(buyer1.address)).to.be.closeTo(expected, hre.ethers.parseEther("1"));
    });

    it("after 12 months: instant + 12/24 unlocked", async () => {
      const { presale, token, buyer1, vestingStart } = await buyAndEnd();
      const totalTokens   = (await presale.vestingRecords(buyer1.address, 0)).totalAmount;
      const instantAmount = (totalTokens * 2500n) / 10000n;
      const vestingAmount = totalTokens - instantAmount;

      await time.increaseTo(Number(vestingStart) + Number(MONTH * 12n));

      await presale.connect(buyer1).claim();
      const expected = instantAmount + (vestingAmount * 12n) / 24n;
      expect(await token.balanceOf(buyer1.address)).to.be.closeTo(expected, hre.ethers.parseEther("1"));
    });

    it("after 24 months: 100% unlocked", async () => {
      const { presale, token, buyer1, vestingStart } = await buyAndEnd();
      const totalTokens = (await presale.vestingRecords(buyer1.address, 0)).totalAmount;

      await time.increaseTo(Number(vestingStart) + Number(MONTH * VESTING_MONTHS));

      await presale.connect(buyer1).claim();
      expect(await token.balanceOf(buyer1.address)).to.equal(totalTokens);
    });

    it("second claim only releases newly vested tokens", async () => {
      const { presale, token, buyer1, vestingStart } = await buyAndEnd();
      const totalTokens   = (await presale.vestingRecords(buyer1.address, 0)).totalAmount;
      const instantAmount = (totalTokens * 2500n) / 10000n;

      // First claim — instant only
      await presale.connect(buyer1).claim();
      expect(await token.balanceOf(buyer1.address)).to.equal(instantAmount);

      // Second claim after full vesting
      await time.increaseTo(Number(vestingStart) + Number(MONTH * VESTING_MONTHS));
      await presale.connect(buyer1).claim();
      expect(await token.balanceOf(buyer1.address)).to.equal(totalTokens);
    });

    it("getVestingSchedule returns correct totals and zeros for claimed", async () => {
      const { presale, buyer1 } = await buyAndEnd();
      const totalTokens = (await presale.vestingRecords(buyer1.address, 0)).totalAmount;
      const { totalByStage, claimedByStage } = await presale.getVestingSchedule(buyer1.address);
      expect(totalByStage[0]).to.equal(totalTokens);
      expect(claimedByStage[0]).to.equal(0n);
    });

    it("stage 4 (5% instant) — correct instant amount at presale end", async () => {
      const ctx = await deploy();
      for (let i = 0; i < 4; i++) {
        const ethNeeded = (STAGE_ALLOCS[i] * STAGE_PRICES[i]) / hre.ethers.parseEther("1");
        await ctx.presale.connect(ctx.buyer2).buy({ value: ethNeeded });
      }
      await ctx.presale.connect(ctx.buyer1).buy({ value: hre.ethers.parseEther("1") });
      await ctx.presale.connect(ctx.owner).endPresale();

      const record = await ctx.presale.vestingRecords(ctx.buyer1.address, 4);
      const expectedInstant = (record.totalAmount * 500n) / 10000n;

      await ctx.presale.connect(ctx.buyer1).claim();
      expect(await ctx.token.balanceOf(ctx.buyer1.address)).to.equal(expectedInstant);
    });

    it("totalClaimed tracks claimed tokens correctly", async () => {
      const { presale, buyer1 } = await buyAndEnd();
      expect(await presale.totalClaimed()).to.equal(0n);
      await presale.connect(buyer1).claim();
      expect(await presale.totalClaimed()).to.be.gt(0n);
    });
  });

  describe("burnUnsold", () => {
    it("burns unsold tokens to dead address after presale ends", async () => {
      const { presale, token, owner, buyer1, deadline } = await deploy();
      await presale.connect(buyer1).buy({ value: hre.ethers.parseEther("1") });
      await time.increaseTo(deadline + 1n);

      const totalSold    = await presale.totalTokensSold();
      const totalClaimed = await presale.totalClaimed();
      const owed         = totalSold - totalClaimed;
      const balance      = await token.balanceOf(await presale.getAddress());
      const expectedBurn = balance - owed;

      await presale.connect(owner).burnUnsold();
      expect(await token.balanceOf("0x000000000000000000000000000000000000dEaD")).to.equal(expectedBurn);
    });
  });

  describe("withdrawETH", () => {
    it("sends raised ETH to owner", async () => {
      const { presale, owner, buyer1 } = await deploy();
      const ethIn = hre.ethers.parseEther("5");
      await presale.connect(buyer1).buy({ value: ethIn });

      const raised = await presale.totalEthRaised();
      const ownerBefore = await hre.ethers.provider.getBalance(owner.address);
      const tx = await presale.connect(owner).withdrawETH(owner.address);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const ownerAfter = await hre.ethers.provider.getBalance(owner.address);
      expect(ownerAfter - ownerBefore + gasCost).to.equal(raised);
    });
  });

  describe("estimateTokens", () => {
    it("estimates correctly within a single stage", async () => {
      const { presale } = await deploy();
      const ethIn = hre.ethers.parseEther("1");
      const expected = (ethIn * hre.ethers.parseEther("1")) / STAGE_PRICES[0];
      expect(await presale.estimateTokens(ethIn)).to.equal(expected);
    });
  });
});
