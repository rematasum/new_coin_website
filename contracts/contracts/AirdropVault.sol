// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AirdropVault
 * @notice Airdrop allocation (100M FLZY) locked until a fixed unlock date.
 *         Owner adds whitelisted users via batch function.
 *         Users claim after the unlock date using the claim() function.
 *
 *         HARD CAPS (immutable):
 *           - Each wallet receives exactly AMOUNT_PER_WALLET (10,000 FLZY)
 *           - Maximum MAX_PARTICIPANTS (10,000) wallets total
 *           - 10,000 × 10,000 = 100,000,000 FLZY = exactly the vault balance
 */
contract AirdropVault is Ownable, ReentrancyGuard {
    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant AMOUNT_PER_WALLET = 10_000e18; // exactly 10,000 FLZY per participant
    uint256 public constant MAX_PARTICIPANTS   = 10_000;   // hard cap — 10K people × 10K FLZY = 100M

    // ─── Types ────────────────────────────────────────────────────────────────

    struct AirdropAllocation {
        uint256 totalAmount;  // total airdrop tokens allocated
        uint256 claimed;      // tokens already claimed
    }

    // ─── State ────────────────────────────────────────────────────────────────

    IERC20 public token;
    uint256 public immutable fixedUnlockDate; // Unix timestamp when airdrop unlocks

    mapping(address => AirdropAllocation) public allocations;
    address[] public participants; // list of whitelisted addresses

    uint256 public totalAllocated;  // sum of all allocations
    uint256 public totalClaimed;    // sum of all claims

    // ─── Events ───────────────────────────────────────────────────────────────

    event ParticipantsAdded(address[] indexed participants, uint256[] amounts);
    event Claimed(address indexed user, uint256 amount);
    event TokenSet(address indexed token);

    // ─── Constructor ───────────────────────────────────────────────────────────

    /**
     * @notice Initialize airdrop vault with token and unlock date.
     * @param token_            FLZY token address
     * @param fixedUnlockDate_  Unix timestamp (midnight UTC) when airdrop unlocks
     * @param owner_            Owner address (Mustafa)
     */
    constructor(
        address token_,
        uint256 fixedUnlockDate_,
        address owner_
    ) Ownable(owner_) {
        require(fixedUnlockDate_ > block.timestamp, "Unlock date must be in future");

        token = IERC20(token_);
        fixedUnlockDate = fixedUnlockDate_;
    }

    // ─── Owner ────────────────────────────────────────────────────────────────

    /**
     * @notice Set the FLZY token address. Can only be called once, after Token deploy.
     *         Required because deploy ordering: AirdropVault is deployed before Token,
     *         so token is set to address(0) at construction.
     */
    function setToken(address token_) external onlyOwner {
        require(address(token) == address(0), "Token already set");
        require(token_ != address(0), "Invalid token address");
        token = IERC20(token_);
        emit TokenSet(token_);
    }

    /**
     * @notice Batch add airdrop participants.
     *         Called by owner after collecting list from Google Sheets.
     *         Each entry MUST be exactly AMOUNT_PER_WALLET (10,000 FLZY).
     *         Total participants cannot exceed MAX_PARTICIPANTS (10,000).
     *         Duplicate addresses are rejected.
     * @param users_   Array of wallet addresses
     * @param amounts_ Array of token amounts — every element must equal AMOUNT_PER_WALLET
     */
    function addAirdropParticipants(address[] calldata users_, uint256[] calldata amounts_) external onlyOwner {
        require(users_.length == amounts_.length, "Length mismatch");
        require(users_.length > 0, "No participants");
        require(participants.length + users_.length <= MAX_PARTICIPANTS, "Participant cap reached");

        for (uint256 i = 0; i < users_.length; i++) {
            address user = users_[i];
            uint256 amount = amounts_[i];

            require(user != address(0), "Invalid address");
            require(amount == AMOUNT_PER_WALLET, "Must be exactly 10000 FLZY");
            require(allocations[user].totalAmount == 0, "Already added");

            participants.push(user);
            allocations[user].totalAmount = AMOUNT_PER_WALLET;
            totalAllocated += AMOUNT_PER_WALLET;
        }

        emit ParticipantsAdded(users_, amounts_);
    }

    // ─── Public ───────────────────────────────────────────────────────────────

    /**
     * @notice Claim unlocked airdrop tokens. Only callable after fixedUnlockDate.
     */
    function claim() external nonReentrant {
        require(block.timestamp >= fixedUnlockDate, "Airdrop not unlocked yet");

        AirdropAllocation storage alloc = allocations[msg.sender];
        require(alloc.totalAmount > 0, "No allocation");

        uint256 claimable = alloc.totalAmount - alloc.claimed;
        require(claimable > 0, "Already claimed");

        alloc.claimed += claimable;
        totalClaimed += claimable;

        require(token.transfer(msg.sender, claimable), "Transfer failed");
        emit Claimed(msg.sender, claimable);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /**
     * @notice Get claimable amount for a user (only if unlock date has passed).
     */
    function getClaimableNow(address user) external view returns (uint256) {
        if (block.timestamp < fixedUnlockDate) return 0;
        AirdropAllocation memory alloc = allocations[user];
        return alloc.totalAmount > alloc.claimed ? alloc.totalAmount - alloc.claimed : 0;
    }

    /**
     * @notice Get full allocation details for a user.
     */
    function getAllocation(address user) external view returns (
        uint256 totalAmount,
        uint256 claimed,
        uint256 claimableNow,
        uint256 daysUntilUnlock
    ) {
        AirdropAllocation memory alloc = allocations[user];
        totalAmount = alloc.totalAmount;
        claimed = alloc.claimed;

        if (block.timestamp >= fixedUnlockDate) {
            claimableNow = alloc.totalAmount > alloc.claimed ? alloc.totalAmount - alloc.claimed : 0;
            daysUntilUnlock = 0;
        } else {
            claimableNow = 0;
            daysUntilUnlock = (fixedUnlockDate - block.timestamp) / 86400;
        }
    }

    /**
     * @notice Get list of all whitelisted participants.
     */
    function getParticipants() external view returns (address[] memory) {
        return participants;
    }

    /**
     * @notice Get count of whitelisted participants.
     */
    function participantCount() external view returns (uint256) {
        return participants.length;
    }
}
