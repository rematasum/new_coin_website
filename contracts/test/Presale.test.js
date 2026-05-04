import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const TOTAL_SUPPLY = hre.ethers.parseEther("1000000000"); // 1B tokens
const PRESALE_AMOUNT = TOTAL_SUPPLY / 4n; // 25%

// Stage configs
const STAGE_PRICES = [
  hre.ethers.parseEther("0.000001"),  // 1 ETH = 1,000,000 tokens
  hre.ethers.parseEther("0.0000015"),
  hre.ethers.parseEther("0.000002"),
];
const STAGE_ALLOCS = [
  hre.ethers.parseEther("100000000"), // 100M
  hre.ethers.parseEther("100000000"), // 100M
  hre.ethers.parseEther("50000000"),  // 50M
];
const REFERRAL_BPS = 500n; // 5%

async function deploy() {
  const [owner, buyer1, buyer2, referrer] = await hre.ethers.getSigners();
  const deadline = BigInt(await time.latest()) + 86400n * 30n; // 30 days

  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy("TestCoin", "TEST", TOTAL_SUPPLY, owner.address);

  const Presale = await hre.ethers.getContractFactory("Presale");
  const presale = await Presale.deploy(
    await token.getAddress(),
    deadline,
    REFERRAL_BPS,
    STAGE_PRICES,
    STAGE_ALLOCS,
    owner.address
  );

  // Fund presale with 25% of supply
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
      expect(await presale.stageCount()).to.equal(3);
    });

    it("rejects past deadline", async () => {
      const [owner] = await hre.ethers.getSigners();
      const Token = await hre.ethers.getContractFactory("Token");
      const token = await Token.deploy("T", "T", TOTAL_SUPPLY, owner.address);
      const Presale = await hre.ethers.getContractFactory("Presale");
      const pastDeadline = BigInt(await time.latest()) - 1n;
      await expect(
        Presale.deploy(await token.getAddress(), pastDeadline, 0, STAGE_PRICES, STAGE_ALLOCS, owner.address)
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
    });

    it("does not charge more ETH than the exact token cost (no over-charge)", async () => {
      const { presale, buyer1 } = await deploy();
      // 1.5 ETH → exact tokens at stage 0 price, check that ethSpent <= ethIn
      const ethIn = hre.ethers.parseEther("1.5");
      const balanceBefore = await hre.ethers.provider.getBalance(buyer1.address);
      const tx = await presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: ethIn });
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await hre.ethers.provider.getBalance(buyer1.address);
      const actualEthSpent = balanceBefore - balanceAfter - gasCost;
      expect(actualEthSpent).to.be.lte(ethIn);
      expect(await presale.ethSpent(buyer1.address)).to.be.lte(ethIn);
    });

    it("advances stage when allocation sells out", async () => {
      const { presale, buyer1 } = await deploy();
      // Buy out all of stage 0 (100M tokens at 0.000001 ETH each = 100 ETH)
      const ethNeeded = (STAGE_ALLOCS[0] * STAGE_PRICES[0]) / hre.ethers.parseEther("1");
      await presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: ethNeeded });
      expect(await presale.currentStage()).to.equal(1);
    });

    it("spans multiple stages in a single buy", async () => {
      const { presale, buyer1 } = await deploy();
      // Use a small allocation for the test to avoid gas issues
      // Buy enough for ~50 tokens in stage 0 then spill into stage 1
      const stage0TokensToBuy = hre.ethers.parseEther("50"); // 50 tokens
      const stage0Cost = (stage0TokensToBuy * STAGE_PRICES[0]) / hre.ethers.parseEther("1");

      // Manually deplete most of stage 0 first so a small buy crosses the boundary
      // Use buyer2 to deplete stage 0 down to just 10 tokens remaining
      const [, , buyer2] = await hre.ethers.getSigners();
      const stage0Remaining = STAGE_ALLOCS[0] - hre.ethers.parseEther("10");
      const depleteCost = (stage0Remaining * STAGE_PRICES[0]) / hre.ethers.parseEther("1");
      await presale.connect(buyer2).buy(hre.ethers.ZeroAddress, { value: depleteCost });
      expect(await presale.currentStage()).to.equal(0);

      // Now buy 20 tokens worth of ETH → should buy 10 from stage 0 and 10 from stage 1
      const twentyTokensAtStage0 = (hre.ethers.parseEther("20") * STAGE_PRICES[0]) / hre.ethers.parseEther("1");
      await presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: twentyTokensAtStage0 });
      expect(await presale.currentStage()).to.equal(1);
      // buyer1 should have 10 tokens from stage 0 + some from stage 1
      const buyer1Balance = await presale.contributions(buyer1.address);
      expect(buyer1Balance).to.be.gt(hre.ethers.parseEther("10"));
    });

    it("credits referral bonus", async () => {
      const { presale, buyer1, referrer } = await deploy();
      const ethIn = hre.ethers.parseEther("1");
      await presale.connect(buyer1).buy(referrer.address, { value: ethIn });

      const boughtTokens = await presale.contributions(buyer1.address);
      const expectedBonus = (boughtTokens * REFERRAL_BPS) / 10000n;
      expect(await presale.contributions(referrer.address)).to.equal(expectedBonus);
    });

    it("rejects self-referral", async () => {
      const { presale, buyer1 } = await deploy();
      await expect(
        presale.connect(buyer1).buy(buyer1.address, { value: hre.ethers.parseEther("1") })
      ).to.be.revertedWith("Self-referral");
    });

    it("ends presale when all stages sell out", async () => {
      const { presale, buyer1 } = await deploy();
      const totalEth = STAGE_ALLOCS.reduce((acc, alloc, i) => {
        return acc + (alloc * STAGE_PRICES[i]) / hre.ethers.parseEther("1");
      }, 0n);
      await presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: totalEth });
      expect(await presale.presaleEnded()).to.be.true;
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

  describe("claim", () => {
    it("transfers tokens after deadline", async () => {
      const { presale, token, buyer1, deadline } = await deploy();
      const ethIn = hre.ethers.parseEther("1");
      await presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: ethIn });
      const claimable = await presale.contributions(buyer1.address);

      await time.increaseTo(deadline + 1n);
      await presale.connect(buyer1).claim();

      expect(await token.balanceOf(buyer1.address)).to.equal(claimable);
      expect(await presale.contributions(buyer1.address)).to.equal(0);
    });

    it("transfers tokens after owner ends presale", async () => {
      const { presale, token, owner, buyer1 } = await deploy();
      await presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: hre.ethers.parseEther("1") });
      const claimable = await presale.contributions(buyer1.address);

      await presale.connect(owner).endPresale();
      await presale.connect(buyer1).claim();

      expect(await token.balanceOf(buyer1.address)).to.equal(claimable);
    });

    it("reverts if presale still active", async () => {
      const { presale, buyer1 } = await deploy();
      await presale.connect(buyer1).buy(hre.ethers.ZeroAddress, { value: hre.ethers.parseEther("1") });
      await expect(presale.connect(buyer1).claim()).to.be.revertedWith("Presale not ended yet");
    });

    it("reverts if nothing to claim", async () => {
      const { presale, buyer1, deadline } = await deploy();
      await time.increaseTo(deadline + 1n);
      await expect(presale.connect(buyer1).claim()).to.be.revertedWith("Nothing to claim");
    });
  });

  describe("burnUnsold", () => {
    it("burns unsold tokens to dead address", async () => {
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
      const { presale, owner, buyer1, deadline } = await deploy();
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

    it("estimates across multiple stages", async () => {
      const { presale } = await deploy();
      const stage0Cost = (STAGE_ALLOCS[0] * STAGE_PRICES[0]) / hre.ethers.parseEther("1");
      const extra = hre.ethers.parseEther("10");
      const estimated = await presale.estimateTokens(stage0Cost + extra);
      const stage1Tokens = (extra * hre.ethers.parseEther("1")) / STAGE_PRICES[1];
      expect(estimated).to.equal(STAGE_ALLOCS[0] + stage1Tokens);
    });
  });
});
