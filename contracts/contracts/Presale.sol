// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Presale
 * @notice Staged presale with per-stage linear vesting.
 *         Each stage has an instant unlock % and a 24-month linear vesting schedule.
 *         Users buy with ETH; tokens are partially claimable immediately after presale,
 *         with the remainder vesting linearly over 24 months.
 */
contract Presale is Ownable, ReentrancyGuard {
    // ─── Types ────────────────────────────────────────────────────────────────

    struct Stage {
        uint256 tokenPrice;       // wei per token (scaled by 1e18)
        uint256 tokenAllocation;  // total tokens allocated (18 decimals)
        uint256 tokensSold;       // tokens sold so far
        uint256 instantUnlockBps; // basis points unlocked instantly at presale end (e.g. 2500 = 25%)
    }

    struct VestingRecord {
        uint256 totalAmount;  // total tokens purchased at this stage
        uint256 claimed;      // tokens already claimed from this stage
    }

    // ─── State ────────────────────────────────────────────────────────────────

    IERC20 public immutable token;

    Stage[] public stages;
    uint256 public currentStage;

    uint256 public deadline;
    bool public presaleActive;
    bool public presaleEnded;
    uint256 public presaleEndTime; // set when presale ends — vesting clock starts here

    uint256 public constant VESTING_DURATION = 730 days; // 24 months

    uint256 public referralBonusBps;

    // user → stageIndex → vesting record
    mapping(address => mapping(uint256 => VestingRecord)) public vestingRecords;
    // user → total ETH spent
    mapping(address => uint256) public ethSpent;

    uint256 public totalTokensSold;
    uint256 public totalEthRaised;

    // ─── Events ───────────────────────────────────────────────────────────────

    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount, uint256 stage);
    event ReferralBonus(address indexed referrer, address indexed buyer, uint256 bonusTokens, uint256 stage);
    event Claimed(address indexed user, uint256 tokenAmount);
    event StageAdvanced(uint256 newStage);
    event PresaleEnded(uint256 totalSold, uint256 totalRaised, uint256 endTime);
    event UnsoldTokensBurned(uint256 amount);
    event EthWithdrawn(address indexed to, uint256 amount);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address token_,
        uint256 deadline_,
        uint256 referralBonusBps_,
        uint256[] memory stagePrices_,
        uint256[] memory stageAllocations_,
        uint256[] memory instantUnlockBps_,
        address owner_
    ) Ownable(owner_) {
        require(token_ != address(0), "Invalid token");
        require(deadline_ > block.timestamp, "Deadline in past");
        require(stagePrices_.length == stageAllocations_.length, "Stage length mismatch");
        require(stagePrices_.length == instantUnlockBps_.length, "Unlock bps length mismatch");
        require(stagePrices_.length > 0, "No stages");
        require(referralBonusBps_ <= 2000, "Referral too high");

        token = IERC20(token_);
        deadline = deadline_;
        referralBonusBps = referralBonusBps_;

        for (uint256 i = 0; i < stagePrices_.length; i++) {
            require(stagePrices_[i] > 0, "Price must be > 0");
            require(stageAllocations_[i] > 0, "Allocation must be > 0");
            require(instantUnlockBps_[i] <= 10000, "Instant unlock > 100%");
            stages.push(Stage({
                tokenPrice: stagePrices_[i],
                tokenAllocation: stageAllocations_[i],
                tokensSold: 0,
                instantUnlockBps: instantUnlockBps_[i]
            }));
        }

        presaleActive = true;
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier whenActive() {
        require(presaleActive, "Presale not active");
        require(!presaleEnded, "Presale ended");
        require(block.timestamp <= deadline, "Deadline passed");
        _;
    }

    // ─── Public ───────────────────────────────────────────────────────────────

    /**
     * @notice Buy tokens with ETH. Pass referrer address or address(0) for no referral.
     */
    function buy(address referrer) external payable nonReentrant whenActive {
        require(msg.value > 0, "Send ETH");
        require(referrer != msg.sender, "Self-referral");

        uint256 remaining = msg.value;
        uint256 totalTokens = 0;
        uint256 firstStage = currentStage; // track starting stage for referral

        while (remaining > 0 && currentStage < stages.length) {
            Stage storage stage = stages[currentStage];
            uint256 availableInStage = stage.tokenAllocation - stage.tokensSold;

            if (availableInStage == 0) {
                _advanceStage();
                continue;
            }

            uint256 tokensToBuy = (remaining * 1e18) / stage.tokenPrice;
            if (tokensToBuy == 0) break;

            uint256 stageIdx = currentStage;

            if (tokensToBuy >= availableInStage) {
                uint256 ethCost = (availableInStage * stage.tokenPrice) / 1e18;
                vestingRecords[msg.sender][stageIdx].totalAmount += availableInStage;
                stage.tokensSold += availableInStage;
                totalTokens += availableInStage;
                remaining -= ethCost;
                _advanceStage();
            } else {
                uint256 ethCost = (tokensToBuy * stage.tokenPrice) / 1e18;
                if (ethCost == 0) break;
                vestingRecords[msg.sender][stageIdx].totalAmount += tokensToBuy;
                stage.tokensSold += tokensToBuy;
                totalTokens += tokensToBuy;
                remaining -= ethCost;
            }
        }

        require(totalTokens > 0, "No tokens to buy");

        // Refund any unspent dust ETH
        uint256 ethUsed = msg.value - remaining;
        if (remaining > 0) {
            (bool refunded, ) = msg.sender.call{value: remaining}("");
            require(refunded, "Refund failed");
        }

        ethSpent[msg.sender] += ethUsed;
        totalTokensSold += totalTokens;
        totalEthRaised += ethUsed;

        emit TokensPurchased(msg.sender, ethUsed, totalTokens, currentStage);

        // Referral bonus — credited to the referrer, vests under the starting stage rules
        if (referrer != address(0) && referralBonusBps > 0) {
            uint256 bonus = (totalTokens * referralBonusBps) / 10000;
            if (bonus > 0 && _availableTokenBalance() >= bonus) {
                vestingRecords[referrer][firstStage].totalAmount += bonus;
                totalTokensSold += bonus;
                emit ReferralBonus(referrer, msg.sender, bonus, firstStage);
            }
        }

        if (currentStage >= stages.length) {
            _endPresale();
        }
    }

    /**
     * @notice Claim all currently unlocked tokens.
     *         Can be called multiple times as vesting progresses.
     */
    function claim() external nonReentrant {
        require(_isEnded(), "Presale not ended yet");
        uint256 endTime = presaleEndTime > 0 ? presaleEndTime : deadline;

        uint256 totalClaimable = 0;

        for (uint256 i = 0; i < stages.length; i++) {
            VestingRecord storage record = vestingRecords[msg.sender][i];
            if (record.totalAmount == 0) continue;

            uint256 unlockable = _calculateUnlockable(record.totalAmount, stages[i].instantUnlockBps, endTime);
            if (unlockable > record.claimed) {
                uint256 claimable = unlockable - record.claimed;
                record.claimed += claimable;
                totalClaimable += claimable;
            }
        }

        require(totalClaimable > 0, "Nothing to claim");
        require(token.transfer(msg.sender, totalClaimable), "Transfer failed");

        emit Claimed(msg.sender, totalClaimable);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function stageCount() external view returns (uint256) {
        return stages.length;
    }

    function currentPrice() external view returns (uint256) {
        if (currentStage >= stages.length) return 0;
        return stages[currentStage].tokenPrice;
    }

    function currentStageInfo() external view returns (Stage memory) {
        if (currentStage >= stages.length) return Stage(0, 0, 0, 0);
        return stages[currentStage];
    }

    function totalAllocation() external view returns (uint256 total) {
        for (uint256 i = 0; i < stages.length; i++) {
            total += stages[i].tokenAllocation;
        }
    }

    function isEnded() external view returns (bool) {
        return _isEnded();
    }

    /**
     * @notice How many tokens the user can claim right now.
     */
    function getClaimableNow(address user) external view returns (uint256 total) {
        if (!_isEnded()) return 0;
        uint256 endTime = presaleEndTime > 0 ? presaleEndTime : deadline;

        for (uint256 i = 0; i < stages.length; i++) {
            VestingRecord memory record = vestingRecords[user][i];
            if (record.totalAmount == 0) continue;
            uint256 unlockable = _calculateUnlockable(record.totalAmount, stages[i].instantUnlockBps, endTime);
            if (unlockable > record.claimed) {
                total += unlockable - record.claimed;
            }
        }
    }

    /**
     * @notice Full vesting breakdown per stage for a user.
     * @return totalByStage    Total tokens purchased per stage
     * @return claimedByStage  Tokens already claimed per stage
     * @return claimableNow    Currently claimable (not yet claimed) per stage
     * @return fullyVestedAt   Unix timestamp when full stage allocation is unlocked
     */
    function getVestingSchedule(address user) external view returns (
        uint256[] memory totalByStage,
        uint256[] memory claimedByStage,
        uint256[] memory claimableNow,
        uint256[] memory fullyVestedAt
    ) {
        uint256 n = stages.length;
        totalByStage   = new uint256[](n);
        claimedByStage = new uint256[](n);
        claimableNow   = new uint256[](n);
        fullyVestedAt  = new uint256[](n);

        uint256 endTime = presaleEndTime > 0 ? presaleEndTime : deadline;

        for (uint256 i = 0; i < n; i++) {
            VestingRecord memory record = vestingRecords[user][i];
            totalByStage[i]   = record.totalAmount;
            claimedByStage[i] = record.claimed;

            if (record.totalAmount > 0 && _isEnded()) {
                uint256 unlockable = _calculateUnlockable(record.totalAmount, stages[i].instantUnlockBps, endTime);
                if (unlockable > record.claimed) {
                    claimableNow[i] = unlockable - record.claimed;
                }
            }
            fullyVestedAt[i] = endTime + VESTING_DURATION;
        }
    }

    /**
     * @notice Estimate tokens received for a given ETH amount.
     */
    function estimateTokens(uint256 ethAmount) external view returns (uint256 tokens) {
        uint256 remaining = ethAmount;
        uint256 stageIdx = currentStage;

        while (remaining > 0 && stageIdx < stages.length) {
            Stage memory s = stages[stageIdx];
            uint256 available = s.tokenAllocation - s.tokensSold;
            if (available == 0) { stageIdx++; continue; }

            uint256 canBuy = (remaining * 1e18) / s.tokenPrice;
            if (canBuy == 0) break;

            if (canBuy >= available) {
                uint256 cost = (available * s.tokenPrice) / 1e18;
                tokens += available;
                remaining -= cost;
                stageIdx++;
            } else {
                tokens += canBuy;
                break;
            }
        }
    }

    /**
     * @notice Legacy: total tokens credited to user across all stages.
     */
    function contributions(address user) external view returns (uint256 total) {
        for (uint256 i = 0; i < stages.length; i++) {
            total += vestingRecords[user][i].totalAmount;
        }
    }

    // ─── Owner ────────────────────────────────────────────────────────────────

    function endPresale() external onlyOwner {
        require(!presaleEnded, "Already ended");
        _endPresale();
    }

    function toggleActive(bool active_) external onlyOwner {
        require(!presaleEnded, "Already ended");
        presaleActive = active_;
    }

    function updateDeadline(uint256 newDeadline) external onlyOwner {
        require(!presaleEnded, "Already ended");
        require(newDeadline > block.timestamp, "Deadline in past");
        deadline = newDeadline;
    }

    function updateReferralBonus(uint256 bps) external onlyOwner {
        require(bps <= 2000, "Too high");
        referralBonusBps = bps;
    }

    function burnUnsold() external onlyOwner {
        require(_isEnded(), "Presale not ended");
        uint256 balance = token.balanceOf(address(this));
        uint256 unsold = balance > totalTokensSold ? balance - totalTokensSold : 0;
        require(unsold > 0, "No unsold tokens");
        require(token.transfer(address(0xdead), unsold), "Burn failed");
        emit UnsoldTokensBurned(unsold);
    }

    function withdrawETH(address to) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid address");
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        (bool sent, ) = to.call{value: balance}("");
        require(sent, "ETH transfer failed");
        emit EthWithdrawn(to, balance);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _advanceStage() internal {
        currentStage++;
        if (currentStage < stages.length) emit StageAdvanced(currentStage);
    }

    function _endPresale() internal {
        presaleActive = false;
        presaleEnded = true;
        presaleEndTime = block.timestamp;
        emit PresaleEnded(totalTokensSold, totalEthRaised, block.timestamp);
    }

    function _isEnded() internal view returns (bool) {
        return presaleEnded || block.timestamp > deadline;
    }

    function _availableTokenBalance() internal view returns (uint256) {
        uint256 bal = token.balanceOf(address(this));
        return bal > totalTokensSold ? bal - totalTokensSold : 0;
    }

    /**
     * @notice Calculates how many tokens are unlocked for a given stage allocation.
     * @param total          Total tokens purchased at this stage
     * @param instantBps     Instant unlock in basis points
     * @param endTime        Presale end timestamp (vesting start)
     */
    function _calculateUnlockable(
        uint256 total,
        uint256 instantBps,
        uint256 endTime
    ) internal view returns (uint256) {
        uint256 instantAmount = (total * instantBps) / 10000;
        uint256 vestingAmount = total - instantAmount;

        if (block.timestamp <= endTime) return instantAmount;

        uint256 elapsed = block.timestamp - endTime;
        if (elapsed >= VESTING_DURATION) return total;

        uint256 vested = (vestingAmount * elapsed) / VESTING_DURATION;
        return instantAmount + vested;
    }
}
