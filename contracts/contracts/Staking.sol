// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Staking
 * @notice 90-day lock, fixed 20% reward per stake. Reward pool is finite (150M FLZY).
 *         Each stake reserves its full reward up-front; new stakes are capped by
 *         the remaining pool (maxStakeAmount = rewardPoolRemaining * 5).
 *         Multiple positions per user; each unlocks independently after 90 days.
 *
 *         Two entry points:
 *           - stake(amount):           user calls after approving FLZY
 *           - stakeFor(user, amount):  only Presale; tokens pre-transferred by Presale
 */
contract Staking is Ownable, ReentrancyGuard {
    // ─── Types ────────────────────────────────────────────────────────────────

    struct StakePosition {
        uint256 amount;     // principal staked
        uint256 reward;     // reserved reward (20% of amount)
        uint256 unlockTime; // stake_time + LOCK_DURATION
        bool    withdrawn;  // true once principal + reward have been sent
    }

    // ─── State ────────────────────────────────────────────────────────────────

    IERC20 public token;
    address public presale;

    uint256 public rewardPoolRemaining; // initial = 150M, decreases as rewards reserved

    uint256 public constant LOCK_DURATION = 90 days;
    uint256 public constant REWARD_BPS    = 2000; // 20%
    uint256 public constant BPS_DENOM     = 10000;

    mapping(address => StakePosition[]) public positions;

    uint256 public totalPrincipalStaked; // currently-locked principal (not withdrawn)
    uint256 public totalRewardsReserved; // lifetime sum of rewards reserved
    uint256 public totalRewardsPaid;     // lifetime sum of rewards withdrawn

    // ─── Events ───────────────────────────────────────────────────────────────

    event Staked(address indexed user, uint256 indexed positionIndex, uint256 amount, uint256 reward, uint256 unlockTime);
    event Withdrawn(address indexed user, uint256 indexed positionIndex, uint256 principal, uint256 reward);
    event TokenSet(address indexed token);
    event PresaleSet(address indexed presale);

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param token_       FLZY token address (use ZeroAddress; set later via setToken).
     * @param presale_     Presale contract address (may be set later via setPresale).
     * @param rewardPool_  Initial reward pool size (e.g. 150M FLZY in wei).
     * @param owner_       Owner address.
     */
    constructor(
        address token_,
        address presale_,
        uint256 rewardPool_,
        address owner_
    ) Ownable(owner_) {
        require(rewardPool_ > 0, "Reward pool must be > 0");
        token = IERC20(token_);
        presale = presale_;
        rewardPoolRemaining = rewardPool_;
    }

    // ─── Owner ────────────────────────────────────────────────────────────────

    /**
     * @notice One-shot setter for the FLZY token address. Mirrors the satellite
     *         pattern used by Presale/TeamVesting/AirdropVault (deploy ordering:
     *         Staking is deployed before Token).
     */
    function setToken(address token_) external onlyOwner {
        require(address(token) == address(0), "Token already set");
        require(token_ != address(0), "Invalid token address");
        token = IERC20(token_);
        emit TokenSet(token_);
    }

    /**
     * @notice One-shot setter for the Presale address (used when deploy order
     *         puts Presale after Staking, e.g. future redeploys).
     */
    function setPresale(address presale_) external onlyOwner {
        require(presale == address(0), "Presale already set");
        require(presale_ != address(0), "Invalid presale address");
        presale = presale_;
        emit PresaleSet(presale_);
    }

    // ─── Public ───────────────────────────────────────────────────────────────

    /**
     * @notice Stake `amount` of FLZY for 90 days. Caller must have approved
     *         this contract for `amount` FLZY. Reverts if the reward pool can
     *         no longer cover the 20% bonus — front-end should call
     *         `maxStakeAmount()` first to clamp the input.
     */
    function stake(uint256 amount) external nonReentrant returns (uint256 positionIndex) {
        require(amount > 0, "Amount must be > 0");
        uint256 reward = (amount * REWARD_BPS) / BPS_DENOM;
        require(reward > 0, "Amount too small");
        require(reward <= rewardPoolRemaining, "Reward pool insufficient");

        require(token.transferFrom(msg.sender, address(this), amount), "TransferFrom failed");

        positionIndex = _recordPosition(msg.sender, amount, reward);
    }

    /**
     * @notice Called by Presale.claimAndStake. Tokens must already have been
     *         transferred to this contract by the Presale before this call.
     */
    function stakeFor(address user, uint256 amount) external nonReentrant returns (uint256 positionIndex) {
        require(msg.sender == presale, "Only presale");
        require(user != address(0), "Invalid user");
        require(amount > 0, "Amount must be > 0");
        uint256 reward = (amount * REWARD_BPS) / BPS_DENOM;
        require(reward > 0, "Amount too small");
        require(reward <= rewardPoolRemaining, "Reward pool insufficient");

        positionIndex = _recordPosition(user, amount, reward);
    }

    /**
     * @notice Withdraw a single matured position (principal + 20% reward).
     */
    function withdraw(uint256 positionIndex) external nonReentrant {
        StakePosition[] storage userPositions = positions[msg.sender];
        require(positionIndex < userPositions.length, "Invalid position");

        StakePosition storage p = userPositions[positionIndex];
        require(!p.withdrawn, "Already withdrawn");
        require(block.timestamp >= p.unlockTime, "Still locked");

        p.withdrawn = true;
        uint256 payout = p.amount + p.reward;
        totalPrincipalStaked -= p.amount;
        totalRewardsPaid    += p.reward;

        require(token.transfer(msg.sender, payout), "Transfer failed");
        emit Withdrawn(msg.sender, positionIndex, p.amount, p.reward);
    }

    /**
     * @notice Withdraw all matured non-withdrawn positions in one tx.
     *         Immature positions are skipped (not reverted).
     */
    function withdrawAll() external nonReentrant {
        StakePosition[] storage userPositions = positions[msg.sender];
        uint256 totalPayout = 0;
        uint256 principalReleased = 0;
        uint256 rewardsReleased = 0;

        for (uint256 i = 0; i < userPositions.length; i++) {
            StakePosition storage p = userPositions[i];
            if (p.withdrawn) continue;
            if (block.timestamp < p.unlockTime) continue;

            p.withdrawn = true;
            uint256 payout = p.amount + p.reward;
            totalPayout      += payout;
            principalReleased += p.amount;
            rewardsReleased   += p.reward;
            emit Withdrawn(msg.sender, i, p.amount, p.reward);
        }

        require(totalPayout > 0, "Nothing to withdraw");
        totalPrincipalStaked -= principalReleased;
        totalRewardsPaid     += rewardsReleased;
        require(token.transfer(msg.sender, totalPayout), "Transfer failed");
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /**
     * @notice Maximum amount a user can stake right now, bounded by the
     *         remaining reward pool. Equals `rewardPoolRemaining * 5`
     *         because reward = amount * 20% = amount / 5.
     */
    function maxStakeAmount() external view returns (uint256) {
        return (rewardPoolRemaining * BPS_DENOM) / REWARD_BPS;
    }

    function getPositions(address user) external view returns (StakePosition[] memory) {
        return positions[user];
    }

    function positionCount(address user) external view returns (uint256) {
        return positions[user].length;
    }

    /**
     * @notice Sum of matured-but-not-withdrawn principal + reward for a user.
     */
    function getWithdrawableNow(address user) external view returns (uint256 total) {
        StakePosition[] storage userPositions = positions[user];
        for (uint256 i = 0; i < userPositions.length; i++) {
            StakePosition storage p = userPositions[i];
            if (p.withdrawn) continue;
            if (block.timestamp < p.unlockTime) continue;
            total += p.amount + p.reward;
        }
    }

    /**
     * @notice Sum of principal + reward across all not-yet-withdrawn positions
     *         (whether matured or still locked).
     */
    function getActiveStakeValue(address user) external view returns (uint256 principal, uint256 reward) {
        StakePosition[] storage userPositions = positions[user];
        for (uint256 i = 0; i < userPositions.length; i++) {
            StakePosition storage p = userPositions[i];
            if (p.withdrawn) continue;
            principal += p.amount;
            reward    += p.reward;
        }
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _recordPosition(address user, uint256 amount, uint256 reward) internal returns (uint256 positionIndex) {
        rewardPoolRemaining  -= reward;
        totalPrincipalStaked += amount;
        totalRewardsReserved += reward;

        positions[user].push(StakePosition({
            amount: amount,
            reward: reward,
            unlockTime: block.timestamp + LOCK_DURATION,
            withdrawn: false
        }));

        positionIndex = positions[user].length - 1;
        emit Staked(user, positionIndex, amount, reward, block.timestamp + LOCK_DURATION);
    }
}
