import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const TOTAL_SUPPLY = hre.ethers.parseEther("1000000000");
const PRESALE_AMT  = hre.ethers.parseEther("250000000"); // 250M
const TEAM_AMT     = hre.ethers.parseEther("250000000"); // 250M
const AIRDROP_AMT  = hre.ethers.parseEther("100000000"); // 100M
const LIQ_AMT      = hre.ethers.parseEther("250000000"); // 250M
const STAKING_AMT  = hre.ethers.parseEther("150000000"); // 150M

const AMOUNT_PER_WALLET = hre.ethers.parseEther("10000"); // 10,000 FLZY — production fixed amount
const MAX_PARTICIPANTS  = 10_000n;

async function deploy(daysUntilUnlock = 180) {
  const [owner, user1, user2, user3, liquidity, other] = await hre.ethers.getSigners();

  const fixedUnlockDate = BigInt(await time.latest()) + BigInt(daysUntilUnlock) * 86400n;

  const deadline = BigInt(await time.latest()) + 86400n * 30n;
  const Presale = await hre.ethers.getContractFactory("Presale");
  const presale = await Presale.deploy(
    hre.ethers.ZeroAddress,
    0n,
    deadline,
    [hre.ethers.parseEther("0.001")],
    [hre.ethers.parseEther("1000")],
    [2500n],
    owner.address
  );

  const TeamVesting = await hre.ethers.getContractFactory("TeamVesting");
  const tvVestingStart = BigInt(await time.latest()) + 86400n * 5n;
  const tv = await TeamVesting.deploy(
    hre.ethers.ZeroAddress,
    [owner.address],
    [hre.ethers.parseEther("250000000")],
    [2500n],
    tvVestingStart,
    owner.address
  );

  const AirdropVault = await hre.ethers.getContractFactory("AirdropVault");
  const vault = await AirdropVault.deploy(hre.ethers.ZeroAddress, fixedUnlockDate, owner.address);

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

  await vault.connect(owner).setToken(await token.getAddress());

  return { token, vault, owner, user1, user2, user3, other, fixedUnlockDate };
}

describe("AirdropVault", () => {
  describe("deployment", () => {
    it("stores fixedUnlockDate and holds 100M token balance", async () => {
      const { vault, token, fixedUnlockDate } = await deploy();
      expect(await vault.fixedUnlockDate()).to.equal(fixedUnlockDate);
      expect(await token.balanceOf(await vault.getAddress())).to.equal(AIRDROP_AMT);
      expect(await vault.totalAllocated()).to.equal(0n);
      expect(await vault.participantCount()).to.equal(0n);
    });

    it("exposes correct hard caps as public constants", async () => {
      const { vault } = await deploy();
      expect(await vault.AMOUNT_PER_WALLET()).to.equal(AMOUNT_PER_WALLET);
      expect(await vault.MAX_PARTICIPANTS()).to.equal(MAX_PARTICIPANTS);
    });

    it("rejects unlock date in the past", async () => {
      const [owner] = await hre.ethers.getSigners();
      const AirdropVault = await hre.ethers.getContractFactory("AirdropVault");
      const pastDate = BigInt(await time.latest()) - 1n;
      await expect(
        AirdropVault.deploy(hre.ethers.ZeroAddress, pastDate, owner.address)
      ).to.be.revertedWith("Unlock date must be in future");
    });
  });

  describe("setToken", () => {
    it("reverts if token already set", async () => {
      const { vault, owner } = await deploy();
      await expect(vault.connect(owner).setToken(owner.address)).to.be.revertedWith("Token already set");
    });
  });

  describe("addAirdropParticipants", () => {
    it("only owner can add", async () => {
      const { vault, other, user1 } = await deploy();
      await expect(
        vault.connect(other).addAirdropParticipants([user1.address], [AMOUNT_PER_WALLET])
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("adds single participant with exactly 10,000 FLZY", async () => {
      const { vault, owner, user1 } = await deploy();
      await vault.connect(owner).addAirdropParticipants([user1.address], [AMOUNT_PER_WALLET]);
      const alloc = await vault.allocations(user1.address);
      expect(alloc.totalAmount).to.equal(AMOUNT_PER_WALLET);
      expect(alloc.claimed).to.equal(0n);
      expect(await vault.totalAllocated()).to.equal(AMOUNT_PER_WALLET);
      expect(await vault.participantCount()).to.equal(1n);
    });

    it("adds multiple participants in batch — all 10,000 FLZY each", async () => {
      const { vault, owner, user1, user2, user3 } = await deploy();
      await vault.connect(owner).addAirdropParticipants(
        [user1.address, user2.address, user3.address],
        [AMOUNT_PER_WALLET, AMOUNT_PER_WALLET, AMOUNT_PER_WALLET]
      );
      expect(await vault.participantCount()).to.equal(3n);
      expect(await vault.totalAllocated()).to.equal(AMOUNT_PER_WALLET * 3n);
    });

    it("CRITICAL: reverts if amount != 10,000 FLZY", async () => {
      const { vault, owner, user1 } = await deploy();
      await expect(
        vault.connect(owner).addAirdropParticipants([user1.address], [hre.ethers.parseEther("20000")])
      ).to.be.revertedWith("Must be exactly 10000 FLZY");
      await expect(
        vault.connect(owner).addAirdropParticipants([user1.address], [hre.ethers.parseEther("9999")])
      ).to.be.revertedWith("Must be exactly 10000 FLZY");
      await expect(
        vault.connect(owner).addAirdropParticipants([user1.address], [hre.ethers.parseEther("1")])
      ).to.be.revertedWith("Must be exactly 10000 FLZY");
    });

    it("CRITICAL: reverts if duplicate participant is added", async () => {
      const { vault, owner, user1 } = await deploy();
      await vault.connect(owner).addAirdropParticipants([user1.address], [AMOUNT_PER_WALLET]);
      await expect(
        vault.connect(owner).addAirdropParticipants([user1.address], [AMOUNT_PER_WALLET])
      ).to.be.revertedWith("Already added");
    });

    it("CRITICAL: reverts when participant cap (10,000) would be exceeded", async () => {
      const { vault, owner, user1, user2 } = await deploy();
      // Simulate vault at 9999 participants via storage manipulation isn't practical;
      // instead verify the require check fires by passing a batch that exceeds the remaining capacity.
      // We use a simplified version: fill to 2, then try adding 9999 more (cap = 10000).
      await vault.connect(owner).addAirdropParticipants(
        [user1.address, user2.address],
        [AMOUNT_PER_WALLET, AMOUNT_PER_WALLET]
      );
      // participantCount = 2. Trying to add 9999 more would exceed 10000 cap.
      // Build array of 9999 fake addresses
      const extra = Array.from({ length: 9999 }, (_, i) =>
        hre.ethers.getAddress("0x" + (i + 100).toString(16).padStart(40, "0"))
      );
      await expect(
        vault.connect(owner).addAirdropParticipants(extra, Array(9999).fill(AMOUNT_PER_WALLET))
      ).to.be.revertedWith("Participant cap reached");
    });

    it("reverts on length mismatch", async () => {
      const { vault, owner, user1, user2 } = await deploy();
      await expect(
        vault.connect(owner).addAirdropParticipants([user1.address, user2.address], [AMOUNT_PER_WALLET])
      ).to.be.revertedWith("Length mismatch");
    });

    it("reverts on empty arrays", async () => {
      const { vault, owner } = await deploy();
      await expect(vault.connect(owner).addAirdropParticipants([], [])).to.be.revertedWith("No participants");
    });

    it("reverts on zero address", async () => {
      const { vault, owner } = await deploy();
      await expect(
        vault.connect(owner).addAirdropParticipants([hre.ethers.ZeroAddress], [AMOUNT_PER_WALLET])
      ).to.be.revertedWith("Invalid address");
    });

    it("reverts on zero amount", async () => {
      const { vault, owner, user1 } = await deploy();
      await expect(
        vault.connect(owner).addAirdropParticipants([user1.address], [0n])
      ).to.be.revertedWith("Must be exactly 10000 FLZY");
    });
  });

  describe("claim — before unlock", () => {
    it("reverts before fixedUnlockDate", async () => {
      const { vault, owner, user1 } = await deploy();
      await vault.connect(owner).addAirdropParticipants([user1.address], [AMOUNT_PER_WALLET]);
      await expect(vault.connect(user1).claim()).to.be.revertedWith("Airdrop not unlocked yet");
    });

    it("getClaimableNow returns 0 before unlock", async () => {
      const { vault, owner, user1 } = await deploy();
      await vault.connect(owner).addAirdropParticipants([user1.address], [AMOUNT_PER_WALLET]);
      expect(await vault.getClaimableNow(user1.address)).to.equal(0n);
    });

    it("getAllocation returns daysUntilUnlock > 0 before unlock", async () => {
      const { vault, owner, user1 } = await deploy(180);
      await vault.connect(owner).addAirdropParticipants([user1.address], [AMOUNT_PER_WALLET]);
      const data = await vault.getAllocation(user1.address);
      expect(data.daysUntilUnlock).to.be.gt(0n);
      expect(data.claimableNow).to.equal(0n);
    });
  });

  describe("claim — after unlock", () => {
    it("claims full 10,000 FLZY on first call", async () => {
      const { vault, token, owner, user1, fixedUnlockDate } = await deploy();
      await vault.connect(owner).addAirdropParticipants([user1.address], [AMOUNT_PER_WALLET]);

      await time.increaseTo(fixedUnlockDate + 1n);
      await vault.connect(user1).claim();

      expect(await token.balanceOf(user1.address)).to.equal(AMOUNT_PER_WALLET);
      const alloc = await vault.allocations(user1.address);
      expect(alloc.claimed).to.equal(AMOUNT_PER_WALLET);
      expect(await vault.totalClaimed()).to.equal(AMOUNT_PER_WALLET);
    });

    it("reverts on double-claim", async () => {
      const { vault, owner, user1, fixedUnlockDate } = await deploy();
      await vault.connect(owner).addAirdropParticipants([user1.address], [AMOUNT_PER_WALLET]);
      await time.increaseTo(fixedUnlockDate + 1n);
      await vault.connect(user1).claim();
      await expect(vault.connect(user1).claim()).to.be.revertedWith("Already claimed");
    });

    it("reverts for user with no allocation", async () => {
      const { vault, other, fixedUnlockDate } = await deploy();
      await time.increaseTo(fixedUnlockDate + 1n);
      await expect(vault.connect(other).claim()).to.be.revertedWith("No allocation");
    });

    it("multiple users each claim exactly 10,000 FLZY independently", async () => {
      const { vault, token, owner, user1, user2, user3, fixedUnlockDate } = await deploy();
      await vault.connect(owner).addAirdropParticipants(
        [user1.address, user2.address, user3.address],
        [AMOUNT_PER_WALLET, AMOUNT_PER_WALLET, AMOUNT_PER_WALLET]
      );

      await time.increaseTo(fixedUnlockDate + 1n);
      await vault.connect(user1).claim();
      await vault.connect(user2).claim();
      await vault.connect(user3).claim();

      expect(await token.balanceOf(user1.address)).to.equal(AMOUNT_PER_WALLET);
      expect(await token.balanceOf(user2.address)).to.equal(AMOUNT_PER_WALLET);
      expect(await token.balanceOf(user3.address)).to.equal(AMOUNT_PER_WALLET);
      expect(await vault.totalClaimed()).to.equal(AMOUNT_PER_WALLET * 3n);
    });

    it("CRITICAL: list can be added LONG AFTER deploy, then claim still works", async () => {
      const { vault, token, owner, user1, fixedUnlockDate } = await deploy(180);

      await time.increaseTo(BigInt(await time.latest()) + 86400n * 150n);

      await vault.connect(owner).addAirdropParticipants([user1.address], [AMOUNT_PER_WALLET]);

      await time.increaseTo(fixedUnlockDate + 1n);
      await vault.connect(user1).claim();

      expect(await token.balanceOf(user1.address)).to.equal(AMOUNT_PER_WALLET);
    });

    it("owner can add missed users AFTER unlock date", async () => {
      const { vault, token, owner, user1, fixedUnlockDate } = await deploy();
      await time.increaseTo(fixedUnlockDate + 1n);

      await vault.connect(owner).addAirdropParticipants([user1.address], [AMOUNT_PER_WALLET]);
      await vault.connect(user1).claim();
      expect(await token.balanceOf(user1.address)).to.equal(AMOUNT_PER_WALLET);
    });

    it("getAllocation reflects state correctly after claim", async () => {
      const { vault, owner, user1, fixedUnlockDate } = await deploy();
      await vault.connect(owner).addAirdropParticipants([user1.address], [AMOUNT_PER_WALLET]);
      await time.increaseTo(fixedUnlockDate + 1n);
      await vault.connect(user1).claim();

      const data = await vault.getAllocation(user1.address);
      expect(data.totalAmount).to.equal(AMOUNT_PER_WALLET);
      expect(data.claimed).to.equal(AMOUNT_PER_WALLET);
      expect(data.claimableNow).to.equal(0n);
      expect(data.daysUntilUnlock).to.equal(0n);
    });
  });

  describe("getParticipants", () => {
    it("returns full list", async () => {
      const { vault, owner, user1, user2 } = await deploy();
      await vault.connect(owner).addAirdropParticipants(
        [user1.address, user2.address],
        [AMOUNT_PER_WALLET, AMOUNT_PER_WALLET]
      );
      const list = await vault.getParticipants();
      expect(list.length).to.equal(2);
      expect(list[0]).to.equal(user1.address);
      expect(list[1]).to.equal(user2.address);
    });
  });
});
