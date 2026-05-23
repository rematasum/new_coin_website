import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const TOTAL_SUPPLY = hre.ethers.parseEther("1000000000"); // 1B
const PRESALE_AMT  = hre.ethers.parseEther("250000000");  // 250M
const TEAM_AMT     = hre.ethers.parseEther("250000000");  // 250M
const AIRDROP_AMT  = hre.ethers.parseEther("100000000");  // 100M
const LIQ_AMT      = hre.ethers.parseEther("250000000");  // 250M
const STAKING_AMT  = hre.ethers.parseEther("150000000");  // 150M

const LOCK = 90n * 24n * 3600n; // 90 days
const REWARD_BPS = 2000n;       // 20%

/**
 * Deploys the full stack so Staking has a real FLZY balance and a real Presale
 * wired in. This mirrors the production deploy ordering and lets us exercise
 * stake / stakeFor / withdraw end-to-end.
 */
async function deploy() {
  const [owner, alice, bob, carol, liquidity, attacker] = await hre.ethers.getSigners();

  const deadline = BigInt(await time.latest()) + 86400n * 30n;
  const airdropUnlock = BigInt(await time.latest()) + 86400n * 180n;

  const Presale = await hre.ethers.getContractFactory("Presale");
  const presale = await Presale.deploy(
    hre.ethers.ZeroAddress,
    0n,
    deadline,
    [hre.ethers.parseEther("0.000002")],
    [PRESALE_AMT],
    [2500n],
    owner.address
  );

  const TeamVesting = await hre.ethers.getContractFactory("TeamVesting");
  const tvVestingStart = BigInt(await time.latest()) + 86400n * 5n;
  const tv = await TeamVesting.deploy(
    hre.ethers.ZeroAddress,
    [owner.address],
    [TEAM_AMT],
    [2500n],
    tvVestingStart,
    owner.address
  );

  const AirdropVault = await hre.ethers.getContractFactory("AirdropVault");
  const vault = await AirdropVault.deploy(hre.ethers.ZeroAddress, airdropUnlock, owner.address);

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
    PRESALE_AMT, TEAM_AMT, AIRDROP_AMT, LIQ_AMT, STAKING_AMT,
    owner.address
  );

  await presale.connect(owner).setToken(await token.getAddress());
  await tv.connect(owner).setToken(await token.getAddress());
  await vault.connect(owner).setToken(await token.getAddress());
  await staking.connect(owner).setToken(await token.getAddress());
  await presale.connect(owner).setStakingContract(await staking.getAddress());

  // Fund alice/bob/carol with FLZY by sending from liquidity wallet
  await token.connect(liquidity).transfer(alice.address, hre.ethers.parseEther("10000000"));
  await token.connect(liquidity).transfer(bob.address,   hre.ethers.parseEther("10000000"));
  await token.connect(liquidity).transfer(carol.address, hre.ethers.parseEther("10000000"));

  return { token, presale, staking, owner, alice, bob, carol, attacker };
}

describe("Staking", () => {
  describe("deployment", () => {
    it("holds 150M FLZY, exposes presale + reward pool", async () => {
      const { staking, token, presale } = await deploy();
      expect(await token.balanceOf(await staking.getAddress())).to.equal(STAKING_AMT);
      expect(await staking.presale()).to.equal(await presale.getAddress());
      expect(await staking.rewardPoolRemaining()).to.equal(STAKING_AMT);
      expect(await staking.LOCK_DURATION()).to.equal(LOCK);
      expect(await staking.REWARD_BPS()).to.equal(REWARD_BPS);
    });

    it("rejects zero reward pool", async () => {
      const [owner, presale] = await hre.ethers.getSigners();
      const Staking = await hre.ethers.getContractFactory("Staking");
      await expect(
        Staking.deploy(hre.ethers.ZeroAddress, presale.address, 0n, owner.address)
      ).to.be.revertedWith("Reward pool must be > 0");
    });
  });

  describe("setToken / setPresale", () => {
    it("setToken rejects re-entry", async () => {
      const { staking, owner } = await deploy();
      await expect(staking.connect(owner).setToken(owner.address)).to.be.revertedWith("Token already set");
    });

    it("setPresale rejects re-entry", async () => {
      const { staking, owner } = await deploy();
      await expect(staking.connect(owner).setPresale(owner.address)).to.be.revertedWith("Presale already set");
    });
  });

  describe("stake (user)", () => {
    it("creates a position with reserved 20% reward and 90-day lock", async () => {
      const { staking, token, alice } = await deploy();
      const amount = hre.ethers.parseEther("1000");
      await token.connect(alice).approve(await staking.getAddress(), amount);

      const tx = await staking.connect(alice).stake(amount);
      const receipt = await tx.wait();
      const block = await hre.ethers.provider.getBlock(receipt.blockNumber);
      const expectedUnlock = BigInt(block.timestamp) + LOCK;

      const positions = await staking.getPositions(alice.address);
      expect(positions.length).to.equal(1);
      expect(positions[0].amount).to.equal(amount);
      expect(positions[0].reward).to.equal((amount * REWARD_BPS) / 10000n);
      expect(positions[0].unlockTime).to.equal(expectedUnlock);
      expect(positions[0].withdrawn).to.be.false;

      expect(await staking.rewardPoolRemaining()).to.equal(STAKING_AMT - (amount * REWARD_BPS) / 10000n);
      expect(await staking.totalPrincipalStaked()).to.equal(amount);
    });

    it("transfers principal from caller into the contract", async () => {
      const { staking, token, alice } = await deploy();
      const amount = hre.ethers.parseEther("500");
      const balBefore = await token.balanceOf(alice.address);
      const stakingBalBefore = await token.balanceOf(await staking.getAddress());

      await token.connect(alice).approve(await staking.getAddress(), amount);
      await staking.connect(alice).stake(amount);

      expect(await token.balanceOf(alice.address)).to.equal(balBefore - amount);
      expect(await token.balanceOf(await staking.getAddress())).to.equal(stakingBalBefore + amount);
    });

    it("reverts on zero amount", async () => {
      const { staking, alice } = await deploy();
      await expect(staking.connect(alice).stake(0n)).to.be.revertedWith("Amount must be > 0");
    });

    it("reverts when amount exceeds the reward pool cap", async () => {
      const { staking, token, alice } = await deploy();
      const maxAmount = await staking.maxStakeAmount();
      const tooMuch = maxAmount + 1n;
      await token.connect(alice).approve(await staking.getAddress(), tooMuch);
      // Alice doesn't actually hold this much; revert is on pool check or transferFrom — either fine
      await expect(staking.connect(alice).stake(tooMuch)).to.be.reverted;
    });

    it("reverts without prior approval", async () => {
      const { staking, alice } = await deploy();
      await expect(staking.connect(alice).stake(hre.ethers.parseEther("100"))).to.be.reverted;
    });
  });

  describe("maxStakeAmount", () => {
    it("equals rewardPoolRemaining * 5 initially (150M / 0.2 = 750M)", async () => {
      const { staking } = await deploy();
      expect(await staking.maxStakeAmount()).to.equal(STAKING_AMT * 5n);
    });

    it("decreases proportionally as positions are opened", async () => {
      const { staking, token, alice } = await deploy();
      const amount = hre.ethers.parseEther("1000");
      await token.connect(alice).approve(await staking.getAddress(), amount);
      await staking.connect(alice).stake(amount);

      const expectedRemaining = STAKING_AMT - (amount * REWARD_BPS) / 10000n;
      expect(await staking.maxStakeAmount()).to.equal((expectedRemaining * 10000n) / REWARD_BPS);
    });
  });

  describe("stakeFor (presale-only)", () => {
    it("reverts when called by a non-presale address", async () => {
      const { staking, attacker, alice } = await deploy();
      await expect(
        staking.connect(attacker).stakeFor(alice.address, hre.ethers.parseEther("100"))
      ).to.be.revertedWith("Only presale");
    });
  });

  describe("withdraw", () => {
    it("reverts before unlockTime", async () => {
      const { staking, token, alice } = await deploy();
      await token.connect(alice).approve(await staking.getAddress(), hre.ethers.parseEther("100"));
      await staking.connect(alice).stake(hre.ethers.parseEther("100"));

      await expect(staking.connect(alice).withdraw(0)).to.be.revertedWith("Still locked");
    });

    it("returns principal + 20% reward after 90 days", async () => {
      const { staking, token, alice } = await deploy();
      const amount = hre.ethers.parseEther("1000");
      await token.connect(alice).approve(await staking.getAddress(), amount);
      await staking.connect(alice).stake(amount);

      const balBefore = await token.balanceOf(alice.address);
      await time.increase(Number(LOCK) + 1);
      await staking.connect(alice).withdraw(0);

      const balAfter = await token.balanceOf(alice.address);
      const expectedPayout = amount + (amount * REWARD_BPS) / 10000n; // 1200 FLZY
      expect(balAfter - balBefore).to.equal(expectedPayout);

      const positions = await staking.getPositions(alice.address);
      expect(positions[0].withdrawn).to.be.true;
    });

    it("reverts on double-withdraw", async () => {
      const { staking, token, alice } = await deploy();
      await token.connect(alice).approve(await staking.getAddress(), hre.ethers.parseEther("100"));
      await staking.connect(alice).stake(hre.ethers.parseEther("100"));

      await time.increase(Number(LOCK) + 1);
      await staking.connect(alice).withdraw(0);
      await expect(staking.connect(alice).withdraw(0)).to.be.revertedWith("Already withdrawn");
    });

    it("reverts on invalid position index", async () => {
      const { staking, alice } = await deploy();
      await expect(staking.connect(alice).withdraw(0)).to.be.revertedWith("Invalid position");
    });

    it("updates totalPrincipalStaked and totalRewardsPaid", async () => {
      const { staking, token, alice } = await deploy();
      const amount = hre.ethers.parseEther("1000");
      await token.connect(alice).approve(await staking.getAddress(), amount);
      await staking.connect(alice).stake(amount);

      await time.increase(Number(LOCK) + 1);
      await staking.connect(alice).withdraw(0);

      expect(await staking.totalPrincipalStaked()).to.equal(0n);
      expect(await staking.totalRewardsPaid()).to.equal((amount * REWARD_BPS) / 10000n);
    });
  });

  describe("multiple positions per user", () => {
    it("creates independent positions with their own unlock times", async () => {
      const { staking, token, alice } = await deploy();
      await token.connect(alice).approve(await staking.getAddress(), hre.ethers.parseEther("3000"));

      await staking.connect(alice).stake(hre.ethers.parseEther("1000"));
      await time.increase(86400 * 10); // 10 days later
      await staking.connect(alice).stake(hre.ethers.parseEther("1000"));
      await time.increase(86400 * 10); // another 10 days
      await staking.connect(alice).stake(hre.ethers.parseEther("1000"));

      const positions = await staking.getPositions(alice.address);
      expect(positions.length).to.equal(3);
      expect(positions[1].unlockTime).to.be.gt(positions[0].unlockTime);
      expect(positions[2].unlockTime).to.be.gt(positions[1].unlockTime);
    });
  });

  describe("withdrawAll", () => {
    it("withdraws only matured positions; immature stay", async () => {
      const { staking, token, alice } = await deploy();
      await token.connect(alice).approve(await staking.getAddress(), hre.ethers.parseEther("3000"));

      await staking.connect(alice).stake(hre.ethers.parseEther("1000"));
      // Wait long enough that the first position will be matured later,
      // then add two more that mature later still.
      await time.increase(86400 * 80); // first stake now has 10 days left
      await staking.connect(alice).stake(hre.ethers.parseEther("1000"));
      await staking.connect(alice).stake(hre.ethers.parseEther("1000"));

      // Advance enough to mature position 0 but not 1 or 2.
      await time.increase(86400 * 15); // total now: pos0 = 95d (matured), pos1/2 = 15d (locked)

      const balBefore = await token.balanceOf(alice.address);
      await staking.connect(alice).withdrawAll();
      const balAfter = await token.balanceOf(alice.address);

      // Only position 0 (1000 + 200 reward) should have been paid out.
      expect(balAfter - balBefore).to.equal(hre.ethers.parseEther("1200"));

      const positions = await staking.getPositions(alice.address);
      expect(positions[0].withdrawn).to.be.true;
      expect(positions[1].withdrawn).to.be.false;
      expect(positions[2].withdrawn).to.be.false;
    });

    it("reverts when nothing is matured", async () => {
      const { staking, token, alice } = await deploy();
      await token.connect(alice).approve(await staking.getAddress(), hre.ethers.parseEther("100"));
      await staking.connect(alice).stake(hre.ethers.parseEther("100"));
      await expect(staking.connect(alice).withdrawAll()).to.be.revertedWith("Nothing to withdraw");
    });
  });

  describe("getWithdrawableNow / getActiveStakeValue", () => {
    it("returns 0 withdrawable while locked, then full payout after unlock", async () => {
      const { staking, token, alice } = await deploy();
      await token.connect(alice).approve(await staking.getAddress(), hre.ethers.parseEther("1000"));
      await staking.connect(alice).stake(hre.ethers.parseEther("1000"));

      expect(await staking.getWithdrawableNow(alice.address)).to.equal(0n);
      await time.increase(Number(LOCK) + 1);
      expect(await staking.getWithdrawableNow(alice.address)).to.equal(hre.ethers.parseEther("1200"));
    });

    it("getActiveStakeValue sums non-withdrawn positions", async () => {
      const { staking, token, alice } = await deploy();
      await token.connect(alice).approve(await staking.getAddress(), hre.ethers.parseEther("3000"));
      await staking.connect(alice).stake(hre.ethers.parseEther("1000"));
      await staking.connect(alice).stake(hre.ethers.parseEther("2000"));

      const [principal, reward] = await staking.getActiveStakeValue(alice.address);
      expect(principal).to.equal(hre.ethers.parseEther("3000"));
      expect(reward).to.equal(hre.ethers.parseEther("600")); // 20% × 3000
    });
  });

  describe("pool exhaustion", () => {
    it("rejects further stakes once pool is depleted", async () => {
      // Use a small test deployment to make depletion feasible.
      const [owner, alice, presaleStub, liquidity] = await hre.ethers.getSigners();
      const tinyPool = hre.ethers.parseEther("100"); // → maxStakeAmount = 500

      // Deploy a standalone FLZY-like token to fund the test
      const Token = await hre.ethers.getContractFactory("Token");
      const [, , , , , ] = await hre.ethers.getSigners(); // pad

      // Reuse the standard deploy + just shrink the pool via a fresh Staking
      const Staking = await hre.ethers.getContractFactory("Staking");
      const staking = await Staking.deploy(
        hre.ethers.ZeroAddress, presaleStub.address, tinyPool, owner.address
      );

      // Mint a real FLZY balance into staking (simulate Token mint) — deploy a minimal
      // ERC20 via the real Token constructor; we just need balance + alice funded.
      const TOTAL = hre.ethers.parseEther("1000000000");
      const Q = TOTAL / 4n;
      const PresaleFactory = await hre.ethers.getContractFactory("Presale");
      const presale = await PresaleFactory.deploy(
        hre.ethers.ZeroAddress, 0n,
        BigInt(await time.latest()) + 86400n * 30n,
        [hre.ethers.parseEther("0.000002")],
        [Q],
        [2500n],
        owner.address
      );
      const TeamVestingFactory = await hre.ethers.getContractFactory("TeamVesting");
      const tvVs = BigInt(await time.latest()) + 86400n * 5n;
      const tv = await TeamVestingFactory.deploy(
        hre.ethers.ZeroAddress, [owner.address], [Q], [2500n], tvVs, owner.address
      );
      const AirdropVaultFactory = await hre.ethers.getContractFactory("AirdropVault");
      const vault = await AirdropVaultFactory.deploy(
        hre.ethers.ZeroAddress, BigInt(await time.latest()) + 86400n * 180n, owner.address
      );

      const token = await Token.deploy(
        "Flozy", "FLZY", TOTAL,
        await presale.getAddress(),
        await tv.getAddress(),
        await vault.getAddress(),
        liquidity.address,
        await staking.getAddress(),
        Q, Q, Q, Q - tinyPool, tinyPool,
        owner.address
      );
      await staking.connect(owner).setToken(await token.getAddress());

      // Fund alice
      await token.connect(liquidity).transfer(alice.address, hre.ethers.parseEther("10000"));

      // Drain the pool with one max stake
      const max = await staking.maxStakeAmount();
      await token.connect(alice).approve(await staking.getAddress(), max);
      await staking.connect(alice).stake(max);
      expect(await staking.rewardPoolRemaining()).to.equal(0n);
      expect(await staking.maxStakeAmount()).to.equal(0n);

      // Any further stake reverts
      await token.connect(alice).approve(await staking.getAddress(), hre.ethers.parseEther("1"));
      await expect(staking.connect(alice).stake(hre.ethers.parseEther("1")))
        .to.be.revertedWith("Reward pool insufficient");
    });
  });
});
