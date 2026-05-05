import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const TOTAL_SUPPLY = hre.ethers.parseEther("1000000000"); // 1B
const PRESALE_AMOUNT = TOTAL_SUPPLY / 4n; // 250M

// 5 stages × 50M — mirrors deploy.config.js
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
const INSTANT_UNLOCK_BPS = [2500n, 2000n, 1500n, 1000n, 500n]; // 25%, 20%, 15%, 10%, 5%
const REFERRAL_BPS = 500n; // 5%

const VESTING_DURATION = 730n * 24n * 3600n; // 730 days in seconds

async function deploy() {
  const [owner, buyer1, buyer2, referrer] = await hre.ethers.getSigners();
  const deadline = BigInt(await time.latest()) + 86400n * 30n;

  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy("Flozy", "FLZY", TOTAL_SUPPLY, owner.address);

  const Presale = await hre.ethers.getContractFactory("Presale");
  const presale = await Presale.deploy(
    await token.getAddress(),
    deadline,
    REFERRAL_BPS,
    STAGE_PRICES,
    STAGE_ALLOCS,
    INSTANT_UNLOCK_BPS,
    owner.address
  );

  await token.transfer(await presale.getAddress(), PRESALE_AMOUNT);

  return { token, presale, owner, buyer1, buyer2, referrer, deadline };
}

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
        Presale.deploy(await token.getAddress(), pastDeadline, 0, STAGE_PRICES, STAGE_ALLOCS, INSTANT_UNLOCK_BPS, owner.address)
      ).to.be.revertedWith("Deadline in past");
    });
  });

  describe("buy", () => {
    it("credits correct token amount for ETH sent", async () => {
      const { presale, buyer1 } = await deploy();
      const ethIn = hre.ethers.parseEther("0.1");
      await presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: ethIn });

      const expectedTokens = (ethIn * hre.ethers.parseEther("1")) / STAGE_PRICES[0];
      expect(await presale.contributions(buyer1.address)).to.equal(expectedTokens);
      expect((await presale.vestingRecords(buyer1.address, 0)).totalAmount).to.equal(expectedTokens);
    });

    it("does not over-charge ETH", async () => {
      const { presale, buyer1 } = await deploy();
      const ethIn = hre.ethers.parseEther("1.5");
      const before = await hre.ethers.provider.getBalance(buyer1.address);
      const tx = await presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: ethIn });
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const after = await hre.ethers.provider.getBalance(buyer1.address);
      expect(before - after - gasCost).to.be.lte(ethIn);
    });

    it("advances stage when allocation sells out", async () => {
      const { presale, buyer1 } = await deploy();
      const ethNeeded = (STAGE_ALLOCS[0] * STAGE_PRICES[0]) / hre.ethers.parseEther("1");
      await presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: ethNeeded });
      expect(await presale.currentStage()).to.equal(1);
    });

    it("tracks tokens per stage when buy spans two stages", async () => {
      const { presale, buyer1, buyer2 } = await deploy();

      // Deplete stage 0 down to 10 tokens remaining
      const stage0Remaining = STAGE_ALLOCS[0] - hre.ethers.parseEther("10");
      const depleteCost = (stage0Remaining * STAGE_PRICES[0]) / hre.ethers.parseEther("1");
      await presale.connect(buyer2).buy(hre.ethers.ZeroAddress, { value: depleteCost });

      // Buy 20 tokens worth — should span stage 0 and stage 1
      const twentyCost = (hre.ethers.parseEther("20") * STAGE_PRICES[0]) / hre.ethers.parseEther("1");
      await presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: twentyCost });

      expect(await presale.currentStage()).to.equal(1);
      const stage0Record = await presale.vestingRecords(buyer1.address, 0);
      const stage1Record = await presale.vestingRecords(buyer1.address, 1);
      expect(stage0Record.totalAmount).to.be.gt(0);
      expect(stage1Record.totalAmount).to.be.gt(0);
    });

    it("credits referral bonus to referrer's stage 0 vesting record", async () => {
      const { presale, buyer1, referrer } = await deploy();
      const ethIn = hre.ethers.parseEther("1");
      await presale.connect(buyer1).buy(referrer.address, { value: ethIn });

      const boughtTokens = (await presale.vestingRecords(buyer1.address, 0)).totalAmount;
      const expectedBonus = (boughtTokens * REFERRAL_BPS) / 10000n;
      const referrerRecord = await presale.vestingRecords(referrer.address, 0);
      expect(referrerRecord.totalAmount).to.equal(expectedBonus);
    });

    it("rejects self-referral", async () => {
      const { presale, buyer1 } = await deploy();
      await expect(
        presale.connect(buyer1).buy(buyer1.address, { value: hre.ethers.parseEther("1") })
      ).to.be.revertedWith("Self-referral");
    });

    it("ends presale when all stages sell out and records end time", async () => {
      const { presale, buyer1 } = await deploy();
      const totalEth = STAGE_ALLOCS.reduce((acc, alloc, i) => {
        return acc + (alloc * STAGE_PRICES[i]) / hre.ethers.parseEther("1");
      }, 0n);
      const before = BigInt(await time.latest());
      await presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: totalEth });
      expect(await presale.presaleEnded()).to.be.true;
      expect(await presale.presaleEndTime()).to.be.gte(before);
    });

    it("reverts after deadline", async () => {
      const { presale, buyer1, deadline } = await deploy();
      await time.increaseTo(deadline + 1n);
      await expect(
        presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: hre.ethers.parseEther("1") })
      ).to.be.revertedWith("Deadline passed");
    });

    it("reverts when paused", async () => {
      const { presale, owner, buyer1 } = await deploy();
      await presale.connect(owner).toggleActive(false);
      await expect(
        presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: hre.ethers.parseEther("1") })
      ).to.be.revertedWith("Presale not active");
    });
  });

  describe("vesting & claim", () => {
    async function buyAndEnd(ethIn = hre.ethers.parseEther("1")) {
      const ctx = await deploy();
      await ctx.presale.connect(ctx.buyer1).buy(hre.ethers.ZeroAddress, { value: ethIn });
      await ctx.presale.connect(ctx.owner).endPresale();
      return ctx;
    }

    it("reverts if presale still active", async () => {
      const { presale, buyer1 } = await deploy();
      await presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: hre.ethers.parseEther("1") });
      await expect(presale.connect(buyer1).claim()).to.be.revertedWith("Presale not ended yet");
    });

    it("reverts with nothing to claim if user has no tokens", async () => {
      const { presale, buyer1, deadline } = await deploy();
      await time.increaseTo(deadline + 1n);
      await expect(presale.connect(buyer1).claim()).to.be.revertedWith("Nothing to claim");
    });

    it("instant unlocks correct % at presale end (stage 0 = 25%)", async () => {
      const { presale, token, buyer1 } = await buyAndEnd();
      const totalTokens = (await presale.vestingRecords(buyer1.address, 0)).totalAmount;
      const expectedInstant = (totalTokens * 2500n) / 10000n;

      await presale.connect(buyer1).claim();
      // Allow ~0.1 token tolerance for 1-2 block seconds of vesting accrued between endPresale and claim
      expect(await token.balanceOf(buyer1.address)).to.be.closeTo(expectedInstant, hre.ethers.parseEther("0.1"));
    });

    it("getClaimableNow returns instant amount right after presale ends", async () => {
      const { presale, buyer1 } = await buyAndEnd();
      const totalTokens = (await presale.vestingRecords(buyer1.address, 0)).totalAmount;
      const expectedInstant = (totalTokens * 2500n) / 10000n;
      expect(await presale.getClaimableNow(buyer1.address)).to.equal(expectedInstant);
    });

    it("50% vesting period unlocks correct additional amount", async () => {
      const { presale, token, buyer1 } = await buyAndEnd();
      const totalTokens = (await presale.vestingRecords(buyer1.address, 0)).totalAmount;
      const instantAmount = (totalTokens * 2500n) / 10000n;
      const vestingAmount = totalTokens - instantAmount;

      // Advance to 50% of vesting period
      await time.increase(Number(VESTING_DURATION / 2n));

      await presale.connect(buyer1).claim();
      const balance = await token.balanceOf(buyer1.address);
      // Expected: instant + 50% of vesting portion (allow 1 wei rounding)
      const expected = instantAmount + vestingAmount / 2n;
      expect(balance).to.be.closeTo(expected, hre.ethers.parseEther("0.1"));
    });

    it("full vesting period unlocks 100% of tokens", async () => {
      const { presale, token, buyer1 } = await buyAndEnd();
      const totalTokens = (await presale.vestingRecords(buyer1.address, 0)).totalAmount;

      await time.increase(Number(VESTING_DURATION));

      await presale.connect(buyer1).claim();
      expect(await token.balanceOf(buyer1.address)).to.equal(totalTokens);
    });

    it("second claim only releases newly vested tokens", async () => {
      const { presale, token, buyer1 } = await buyAndEnd();
      const totalTokens = (await presale.vestingRecords(buyer1.address, 0)).totalAmount;
      const instantAmount = (totalTokens * 2500n) / 10000n;

      // First claim at presale end
      await presale.connect(buyer1).claim();
      expect(await token.balanceOf(buyer1.address)).to.be.closeTo(instantAmount, hre.ethers.parseEther("0.1"));

      // Advance to 100% vesting
      await time.increase(Number(VESTING_DURATION));

      // Second claim should get remaining
      await presale.connect(buyer1).claim();
      expect(await token.balanceOf(buyer1.address)).to.equal(totalTokens);
    });

    it("getVestingSchedule returns correct data", async () => {
      const { presale, buyer1 } = await buyAndEnd();
      const totalTokens = (await presale.vestingRecords(buyer1.address, 0)).totalAmount;
      const { totalByStage, claimedByStage } = await presale.getVestingSchedule(buyer1.address);
      expect(totalByStage[0]).to.equal(totalTokens);
      expect(claimedByStage[0]).to.equal(0);
    });

    it("stage 4 (5% instant) claims correct amount at presale end", async () => {
      const ctx = await deploy();
      // Deplete stages 0-3
      for (let i = 0; i < 4; i++) {
        const ethNeeded = (STAGE_ALLOCS[i] * STAGE_PRICES[i]) / hre.ethers.parseEther("1");
        await ctx.presale.connect(ctx.buyer2).buy(hre.ethers.ZeroAddress, { value: ethNeeded });
      }
      // Buy some in stage 4
      const ethIn = hre.ethers.parseEther("1");
      await ctx.presale.connect(ctx.buyer1).buy(hre.ethers.ZeroAddress, { value: ethIn });
      await ctx.presale.connect(ctx.owner).endPresale();

      const record = await ctx.presale.vestingRecords(ctx.buyer1.address, 4);
      const expectedInstant = (record.totalAmount * 500n) / 10000n; // 5%

      await ctx.presale.connect(ctx.buyer1).claim();
      expect(await ctx.token.balanceOf(ctx.buyer1.address)).to.be.closeTo(expectedInstant, hre.ethers.parseEther("0.1"));
    });
  });

  describe("burnUnsold", () => {
    it("burns unsold tokens to dead address after presale ends", async () => {
      const { presale, token, owner, buyer1, deadline } = await deploy();
      await presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: hre.ethers.parseEther("1") });
      await time.increaseTo(deadline + 1n);

      const contractBalance = await token.balanceOf(await presale.getAddress());
      const totalSold = await presale.totalTokensSold();
      const expectedBurn = contractBalance - totalSold;

      await presale.connect(owner).burnUnsold();
      expect(await token.balanceOf("0x000000000000000000000000000000000000dEaD")).to.equal(expectedBurn);
    });
  });

  describe("withdrawETH", () => {
    it("sends raised ETH to owner", async () => {
      const { presale, owner, buyer1 } = await deploy();
      const ethIn = hre.ethers.parseEther("5");
      await presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: ethIn });

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
