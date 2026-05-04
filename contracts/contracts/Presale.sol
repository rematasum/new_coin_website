// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Presale
 * @notice Staged presale contract for Base network.
 *         Users buy with ETH; tokens are claimable after presale ends.
 *         Supports referrals and unsold token burning.
 */
contract Presale is Ownable, ReentrancyGuard {
    // ─── Types ────────────────────────────────────────────────────────────────

    struct Stage {
        uint256 tokenPrice;      // wei per token (1e18 = 1 ETH per token)
        uint256 tokenAllocation; // tokens allocated to this stage (in token units, 18 decimals)
        uint256 tokensSold;      // tokens sold in this stage
    }

    // ─── State ────────────────────────────────────────────────────────────────

    IERC20 public immutable token;

    Stage[] public stages;
    uint256 public currentStage;

    uint256 public deadline;
    bool public presaleActive;
    bool public presaleEnded;

    uint256 public referralBonusBps; // basis points, e.g. 500 = 5%

    mapping(address => uint256) public contributions; // claimable token balance
    mapping(address => uint256) public ethSpent;

    uint256 public totalTokensSold;
    uint256 public totalEthRaised;

    // ─── Events ───────────────────────────────────────────────────────────────

    event TokensPurchased(
        address indexed buyer,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 stage
    );
    event ReferralBonus(
        address indexed referrer,
        address indexed buyer,
        uint256 bonusTokens
    );
    event Claimed(address indexed user, uint256 tokenAmount);
    event StageAdvanced(uint256 newStage);
    event PresaleEnded(uint256 totalSold, uint256 totalRaised);
    event UnsoldTokensBurned(uint256 amount);
    event EthWithdrawn(address indexed to, uint256 amount);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address token_,
        uint256 deadline_,
        uint256 referralBonusBps_,
        uint256[] memory stagePrices_,
        uint256[] memory stageAllocations_,
        address owner_
    ) Ownable(owner_) {
        require(token_ != address(0), "Invalid token");
        require(deadline_ > block.timestamp, "Deadline in past");
        require(stagePrices_.length == stageAllocations_.length, "Stage length mismatch");
        require(stagePrices_.length > 0, "No stages");
        require(referralBonusBps_ <= 2000, "Referral too high"); // max 20%

        token = IERC20(token_);
        deadline = deadline_;
        referralBonusBps = referralBonusBps_;

        for (uint256 i = 0; i < stagePrices_.length; i++) {
            require(stagePrices_[i] > 0, "Price must be > 0");
            require(stageAllocations_[i] > 0, "Allocation must be > 0");
            stages.push(Stage({
                tokenPrice: stagePrices_[i],
                tokenAllocation: stageAllocations_[i],
                tokensSold: 0
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
     * @notice Buy tokens with ETH. Pass referrer address or address(0) for none.
     */
    function buy(address referrer) external payable nonReentrant whenActive {
        require(msg.value > 0, "Send ETH");
        require(referrer != msg.sender, "Self-referral");

        uint256 remaining = msg.value;
        uint256 totalTokens = 0;

        // Fill across stages until ETH is spent or all stages are sold out
        while (remaining > 0 && currentStage < stages.length) {
            Stage storage stage = stages[currentStage];
            uint256 availableInStage = stage.tokenAllocation - stage.tokensSold;

            if (availableInStage == 0) {
                _advanceStage();
                continue;
            }

            // How many tokens can we buy with `remaining` ETH at this stage price?
            uint256 tokensToBuy = (remaining * 1e18) / stage.tokenPrice;

            if (tokensToBuy == 0) break; // not enough ETH to buy even 1 token unit

            if (tokensToBuy >= availableInStage) {
                // Buy out remaining allocation in this stage
                uint256 ethCost = (availableInStage * stage.tokenPrice) / 1e18;
                totalTokens += availableInStage;
                stage.tokensSold += availableInStage;
                remaining -= ethCost;
                _advanceStage();
            } else {
                uint256 ethCost = (tokensToBuy * stage.tokenPrice) / 1e18;
                if (ethCost == 0) break; // rounding edge: remaining wei too small to deduct
                totalTokens += tokensToBuy;
                stage.tokensSold += tokensToBuy;
                remaining -= ethCost;
            }
        }

        require(totalTokens > 0, "No tokens to buy");

        // Refund any dust ETH that couldn't buy a full token
        uint256 ethSpent_ = msg.value - remaining;
        if (remaining > 0) {
            (bool refunded, ) = msg.sender.call{value: remaining}("");
            require(refunded, "Refund failed");
        }

        contributions[msg.sender] += totalTokens;
        ethSpent[msg.sender] += ethSpent_;
        totalTokensSold += totalTokens;
        totalEthRaised += ethSpent_;

        emit TokensPurchased(msg.sender, ethSpent_, totalTokens, currentStage);

        // Referral bonus
        if (referrer != address(0) && referralBonusBps > 0) {
            uint256 bonus = (totalTokens * referralBonusBps) / 10000;
            if (bonus > 0 && _availableTokenBalance() >= bonus) {
                contributions[referrer] += bonus;
                totalTokensSold += bonus;
                emit ReferralBonus(referrer, msg.sender, bonus);
            }
        }

        // Auto-end if all stages sold out
        if (currentStage >= stages.length) {
            _endPresale();
        }
    }

    /**
     * @notice Claim purchased tokens after presale ends.
     */
    function claim() external nonReentrant {
        require(_isEnded(), "Presale not ended yet");
        uint256 amount = contributions[msg.sender];
        require(amount > 0, "Nothing to claim");

        contributions[msg.sender] = 0;
        require(token.transfer(msg.sender, amount), "Transfer failed");

        emit Claimed(msg.sender, amount);
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
        if (currentStage >= stages.length) {
            return Stage(0, 0, 0);
        }
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
     * @notice Estimate tokens for a given ETH amount at current and subsequent stages.
     */
    function estimateTokens(uint256 ethAmount) external view returns (uint256 tokens) {
        uint256 remaining = ethAmount;
        uint256 stage_ = currentStage;

        while (remaining > 0 && stage_ < stages.length) {
            Stage memory s = stages[stage_];
            uint256 available = s.tokenAllocation - s.tokensSold;
            if (available == 0) { stage_++; continue; }

            uint256 canBuy = (remaining * 1e18) / s.tokenPrice;
            if (canBuy == 0) break;

            if (canBuy >= available) {
                uint256 cost = (available * s.tokenPrice) / 1e18;
                tokens += available;
                remaining -= cost;
                stage_++;
            } else {
                tokens += canBuy;
                break;
            }
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

    /**
     * @notice Burn all unsold tokens held by this contract after presale ends.
     */
    function burnUnsold() external onlyOwner {
        require(_isEnded(), "Presale not ended");
        uint256 balance = token.balanceOf(address(this));
        uint256 claimable = totalTokensSold; // approximate; safe upper bound

        uint256 unsold = balance > claimable ? balance - claimable : 0;
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
        if (currentStage < stages.length) {
            emit StageAdvanced(currentStage);
        }
    }

    function _endPresale() internal {
        presaleActive = false;
        presaleEnded = true;
        emit PresaleEnded(totalTokensSold, totalEthRaised);
    }

    function _isEnded() internal view returns (bool) {
        return presaleEnded || block.timestamp > deadline;
    }

    function _availableTokenBalance() internal view returns (uint256) {
        return token.balanceOf(address(this)) > totalTokensSold
            ? token.balanceOf(address(this)) - totalTokensSold
            : 0;
    }
}
