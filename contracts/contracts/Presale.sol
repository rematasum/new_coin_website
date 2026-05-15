// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Presale
 * @notice Staged presale with per-stage monthly vesting.
 *         Each stage has an instant unlock % and a 24-month vesting schedule.
 *         Vesting unlocks on the 15th of each month starting from the first 15th
 *         after presale ends. Users buy with ETH; tokens are partially claimable
 *         immediately after presale, with the remainder unlocking monthly.
 */
contract Presale is Ownable, ReentrancyGuard {
    // ─── Types ────────────────────────────────────────────────────────────────

    struct Stage {
        uint256 tokenPrice;       // wei per token (scaled by 1e18)
        uint256 tokenAllocation;  // total tokens allocated (18 decimals)
        uint256 tokensSold;       // tokens sold so far
        uint256 instantUnlockBps; // basis points unlocked instantly at presale end
    }

    struct VestingRecord {
        uint256 totalAmount; // total tokens purchased at this stage
        uint256 claimed;     // tokens already claimed from this stage
    }

    // ─── State ────────────────────────────────────────────────────────────────

    IERC20 public immutable token;

    Stage[] public stages;
    uint256 public currentStage;

    uint256 public deadline;
    bool public presaleActive;
    bool public presaleEnded;
    uint256 public presaleEndTime;

    // Midnight UTC of the first 15th-of-month on or after presale end.
    // Monthly vesting tranches unlock every 30 days from this timestamp.
    uint256 public vestingStart;

    uint256 public constant VESTING_MONTHS = 24;
    uint256 public constant MONTH_DURATION = 30 days;

    // user → stageIndex → vesting record
    mapping(address => mapping(uint256 => VestingRecord)) public vestingRecords;
    mapping(address => uint256) public ethSpent;

    uint256 public totalTokensSold;
    uint256 public totalEthRaised;
    uint256 public totalClaimed;

    // ─── Events ───────────────────────────────────────────────────────────────

    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount, uint256 stage);
    event Claimed(address indexed user, uint256 tokenAmount);
    event StageAdvanced(uint256 newStage);
    event PresaleEnded(uint256 totalSold, uint256 totalRaised, uint256 endTime, uint256 vestingStart);
    event UnsoldTokensBurned(uint256 amount);
    event EthWithdrawn(address indexed to, uint256 amount);
    event NewPurchase(address indexed buyer, uint256 tokenAmount);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address token_,
        uint256 deadline_,
        uint256[] memory stagePrices_,
        uint256[] memory stageAllocations_,
        uint256[] memory instantUnlockBps_,
        address owner_
    ) Ownable(owner_) {
        require(deadline_ > block.timestamp, "Deadline in past");
        require(stagePrices_.length == stageAllocations_.length, "Stage length mismatch");
        require(stagePrices_.length == instantUnlockBps_.length, "Unlock bps length mismatch");
        require(stagePrices_.length > 0, "No stages");

        token = IERC20(token_);
        deadline = deadline_;

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

    function buy() external payable nonReentrant whenActive {
        require(msg.value > 0, "Send ETH");

        uint256 remaining = msg.value;
        uint256 totalTokens = 0;

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

        uint256 ethUsed = msg.value - remaining;
        if (remaining > 0) {
            (bool refunded, ) = msg.sender.call{value: remaining}("");
            require(refunded, "Refund failed");
        }

        ethSpent[msg.sender] += ethUsed;
        totalTokensSold += totalTokens;
        totalEthRaised += ethUsed;

        emit TokensPurchased(msg.sender, ethUsed, totalTokens, currentStage);
        emit NewPurchase(msg.sender, totalTokens);

        if (currentStage >= stages.length) {
            _endPresale();
        }
    }

    /**
     * @notice Claim all currently unlocked tokens.
     *         Instant unlock is available right after presale ends.
     *         Monthly tranches unlock every 30 days starting from vestingStart.
     */
    function claim() external nonReentrant {
        require(_isEnded(), "Presale not ended yet");

        uint256 totalClaimable = 0;

        for (uint256 i = 0; i < stages.length; i++) {
            VestingRecord storage record = vestingRecords[msg.sender][i];
            if (record.totalAmount == 0) continue;

            uint256 unlockable = _calculateUnlockable(record.totalAmount, stages[i].instantUnlockBps);
            if (unlockable > record.claimed) {
                uint256 claimable = unlockable - record.claimed;
                record.claimed += claimable;
                totalClaimable += claimable;
            }
        }

        require(totalClaimable > 0, "Nothing to claim");
        totalClaimed += totalClaimable;
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

    function getClaimableNow(address user) external view returns (uint256 total) {
        if (!_isEnded()) return 0;
        for (uint256 i = 0; i < stages.length; i++) {
            VestingRecord memory record = vestingRecords[user][i];
            if (record.totalAmount == 0) continue;
            uint256 unlockable = _calculateUnlockable(record.totalAmount, stages[i].instantUnlockBps);
            if (unlockable > record.claimed) {
                total += unlockable - record.claimed;
            }
        }
    }

    /**
     * @notice Full vesting breakdown per stage.
     * @return totalByStage    Total tokens per stage
     * @return claimedByStage  Tokens already claimed per stage
     * @return claimableNow    Currently claimable (unclaimed) per stage
     * @return nextUnlockAt    Timestamp of the next monthly unlock for each stage
     */
    function getVestingSchedule(address user) external view returns (
        uint256[] memory totalByStage,
        uint256[] memory claimedByStage,
        uint256[] memory claimableNow,
        uint256[] memory nextUnlockAt
    ) {
        uint256 n = stages.length;
        totalByStage   = new uint256[](n);
        claimedByStage = new uint256[](n);
        claimableNow   = new uint256[](n);
        nextUnlockAt   = new uint256[](n);

        for (uint256 i = 0; i < n; i++) {
            VestingRecord memory record = vestingRecords[user][i];
            totalByStage[i]   = record.totalAmount;
            claimedByStage[i] = record.claimed;

            if (record.totalAmount > 0 && _isEnded()) {
                uint256 unlockable = _calculateUnlockable(record.totalAmount, stages[i].instantUnlockBps);
                if (unlockable > record.claimed) {
                    claimableNow[i] = unlockable - record.claimed;
                }
            }

            // Next unlock: the next 30-day boundary from vestingStart
            if (vestingStart > 0) {
                if (block.timestamp < vestingStart) {
                    nextUnlockAt[i] = vestingStart;
                } else {
                    uint256 elapsed = block.timestamp - vestingStart;
                    uint256 monthsPassed = elapsed / MONTH_DURATION;
                    if (monthsPassed < VESTING_MONTHS) {
                        nextUnlockAt[i] = vestingStart + (monthsPassed + 1) * MONTH_DURATION;
                    }
                }
            }
        }
    }

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

    // Legacy: total tokens credited across all stages
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

    function burnUnsold() external onlyOwner {
        require(_isEnded(), "Presale not ended");
        uint256 contractBalance = token.balanceOf(address(this));
        uint256 owed = totalTokensSold - totalClaimed; // tokens still owed to buyers
        uint256 unsold = contractBalance > owed ? contractBalance - owed : 0;
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
        vestingStart = _nextFifteenth(block.timestamp);
        emit PresaleEnded(totalTokensSold, totalEthRaised, block.timestamp, vestingStart);
    }

    function _isEnded() internal view returns (bool) {
        return presaleEnded || block.timestamp > deadline;
    }

    /**
     * @notice Calculates unlocked tokens for a stage allocation.
     *         Instant % is available immediately after presale ends.
     *         Remaining vests in 24 monthly tranches from vestingStart.
     */
    function _calculateUnlockable(uint256 total, uint256 instantBps) internal view returns (uint256) {
        uint256 instantAmount = (total * instantBps) / 10000;
        uint256 vestingAmount = total - instantAmount;

        if (vestingStart == 0 || block.timestamp < vestingStart) {
            return instantAmount;
        }

        uint256 elapsed = block.timestamp - vestingStart;
        uint256 monthsVested = elapsed / MONTH_DURATION;
        if (monthsVested >= VESTING_MONTHS) return total;

        uint256 vested = (vestingAmount * monthsVested) / VESTING_MONTHS;
        return instantAmount + vested;
    }

    /**
     * @notice Returns midnight UTC of the first 15th-of-month on or after `ts`.
     *         Uses Howard Hinnant's civil calendar algorithm (public domain).
     */
    function _nextFifteenth(uint256 ts) internal pure returns (uint256) {
        uint256 daysSinceEpoch = ts / 86400;

        // civil_from_days
        uint256 z   = daysSinceEpoch + 719468;
        uint256 era = z / 146097;
        uint256 doe = z - era * 146097;
        uint256 yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        uint256 doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        uint256 mp  = (5 * doy + 2) / 153;
        uint256 d   = doy - (153 * mp + 2) / 5 + 1; // day of month [1..31]
        uint256 m   = mp < 10 ? mp + 3 : mp - 9;    // month [1..12]
        uint256 y   = yoe + era * 400 + (m <= 2 ? 1 : 0);

        uint256 tYear;
        uint256 tMonth;
        if (d <= 15) {
            tYear  = y;
            tMonth = m;
        } else {
            if (m == 12) { tYear = y + 1; tMonth = 1; }
            else          { tYear = y;     tMonth = m + 1; }
        }

        // days_from_civil(tYear, tMonth, 15)
        uint256 ty   = tMonth <= 2 ? tYear - 1 : tYear;
        uint256 tm   = tMonth <= 2 ? tMonth + 9 : tMonth - 3;
        uint256 tEra = ty / 400;
        uint256 tYoe = ty - tEra * 400;
        uint256 tDoy = (153 * tm + 2) / 5 + 14; // day 15 → 0-indexed = 14
        uint256 tDoe = tYoe * 365 + tYoe / 4 - tYoe / 100 + tDoy;

        return (tEra * 146097 + tDoe - 719468) * 86400;
    }
}
