// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TeamVesting
 * @notice Monthly vesting for team and sponsor allocations.
 *         Owner sets vestingStart (midnight UTC of the first 15th after TGE).
 *         Tokens unlock in 24 equal monthly tranches (every 30 days from vestingStart).
 *         An optional instant unlock % is supported per beneficiary.
 *
 * Allocation (250M FLZY total):
 *   - 1 × Team & Dev : 100,000,000 FLZY
 *   - 5 × Sponsor    :  30,000,000 FLZY each
 */
contract TeamVesting is Ownable, ReentrancyGuard {
    // ─── Types ────────────────────────────────────────────────────────────────

    struct Beneficiary {
        uint256 totalAmount;     // total FLZY allocated
        uint256 claimed;         // FLZY already claimed
        uint256 instantUnlockBps; // basis points available instantly at vestingStart
    }

    // ─── State ────────────────────────────────────────────────────────────────

    IERC20 public token;

    mapping(address => Beneficiary) public beneficiaries;
    address[] public beneficiaryList;

    uint256 public vestingStart;  // midnight UTC of first 15th — set by owner
    bool    public vestingActive; // true once vestingStart is set

    uint256 public constant VESTING_MONTHS = 24;
    uint256 public constant MONTH_DURATION = 30 days;

    // ─── Events ───────────────────────────────────────────────────────────────

    event VestingStarted(uint256 vestingStart);
    event Claimed(address indexed beneficiary, uint256 amount);
    event TokenSet(address indexed token);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address token_,
        address[] memory addresses_,
        uint256[] memory amounts_,
        uint256[] memory instantBps_,
        address owner_
    ) Ownable(owner_) {
        require(addresses_.length == amounts_.length, "Length mismatch");
        require(addresses_.length == instantBps_.length, "Length mismatch");
        require(addresses_.length > 0, "No beneficiaries");

        token = IERC20(token_);

        for (uint256 i = 0; i < addresses_.length; i++) {
            require(addresses_[i] != address(0), "Invalid address");
            require(amounts_[i] > 0, "Zero amount");
            require(instantBps_[i] <= 10000, "Instant unlock > 100%");
            beneficiaries[addresses_[i]] = Beneficiary({
                totalAmount: amounts_[i],
                claimed: 0,
                instantUnlockBps: instantBps_[i]
            });
            beneficiaryList.push(addresses_[i]);
        }
    }

    // ─── Owner ────────────────────────────────────────────────────────────────

    /**
     * @notice Set the FLZY token address. Can only be called once, after Token deploy.
     *         Required because deploy ordering: satellite contracts are deployed before
     *         Token, so token is set to address(0) at construction.
     */
    function setToken(address token_) external onlyOwner {
        require(address(token) == address(0), "Token already set");
        require(token_ != address(0), "Invalid token address");
        token = IERC20(token_);
        emit TokenSet(token_);
    }

    /**
     * @notice Set vesting start. Call with the Unix timestamp (midnight UTC) of the
     *         first 15th of the month after TGE. Can only be called once.
     */
    function startVesting(uint256 firstFifteenth_) external onlyOwner {
        require(!vestingActive, "Already started");
        require(firstFifteenth_ > block.timestamp, "Must be in future");
        vestingStart = firstFifteenth_;
        vestingActive = true;
        emit VestingStarted(firstFifteenth_);
    }

    // ─── Public ───────────────────────────────────────────────────────────────

    function claim() external nonReentrant {
        require(vestingActive, "Vesting not started");
        Beneficiary storage b = beneficiaries[msg.sender];
        require(b.totalAmount > 0, "Not a beneficiary");

        uint256 claimable = _claimableFor(b);
        require(claimable > 0, "Nothing to claim");

        b.claimed += claimable;
        require(token.transfer(msg.sender, claimable), "Transfer failed");
        emit Claimed(msg.sender, claimable);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getClaimableNow(address user) external view returns (uint256) {
        if (!vestingActive) return 0;
        return _claimableFor(beneficiaries[user]);
    }

    function getBeneficiary(address user) external view returns (
        uint256 totalAmount,
        uint256 claimed,
        uint256 instantUnlockBps,
        uint256 claimableNow,
        uint256 nextUnlockAt
    ) {
        Beneficiary memory b = beneficiaries[user];
        totalAmount      = b.totalAmount;
        claimed          = b.claimed;
        instantUnlockBps = b.instantUnlockBps;
        claimableNow     = vestingActive ? _claimableFor(b) : 0;

        if (vestingActive && vestingStart > 0) {
            if (block.timestamp < vestingStart) {
                nextUnlockAt = vestingStart;
            } else {
                uint256 elapsed = block.timestamp - vestingStart;
                uint256 monthsPassed = elapsed / MONTH_DURATION;
                if (monthsPassed < VESTING_MONTHS) {
                    nextUnlockAt = vestingStart + (monthsPassed + 1) * MONTH_DURATION;
                }
            }
        }
    }

    function beneficiaryCount() external view returns (uint256) {
        return beneficiaryList.length;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _claimableFor(Beneficiary memory b) internal view returns (uint256) {
        if (b.totalAmount == 0) return 0;
        uint256 unlockable = _calculateUnlockable(b.totalAmount, b.instantUnlockBps);
        return unlockable > b.claimed ? unlockable - b.claimed : 0;
    }

    function _calculateUnlockable(uint256 total, uint256 instantBps) internal view returns (uint256) {
        uint256 instantAmount = (total * instantBps) / 10000;
        uint256 vestingAmount = total - instantAmount;

        if (block.timestamp < vestingStart) return instantAmount;

        uint256 elapsed = block.timestamp - vestingStart;
        uint256 monthsVested = elapsed / MONTH_DURATION;
        if (monthsVested >= VESTING_MONTHS) return total;

        uint256 vested = (vestingAmount * monthsVested) / VESTING_MONTHS;
        return instantAmount + vested;
    }
}
