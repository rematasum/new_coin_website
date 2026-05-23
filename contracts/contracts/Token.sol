// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Token (FLZY)
 * @notice Automatic mint and distribution to presale, team vesting, airdrop vault,
 *         liquidity, and staking. Total supply distributed at construction;
 *         no tokens remain with deployer.
 *
 *         Allocation (1B = 1_000_000_000):
 *           250M → Presale
 *           250M → TeamVesting
 *           100M → AirdropVault   (was 250M; trimmed to actual airdrop need)
 *           250M → Liquidity wallet
 *           150M → Staking        (new — 90-day lock, 20% reward pool)
 */
contract Token is ERC20, Ownable {
    // ─── Events ───────────────────────────────────────────────────────────────

    event TokensDistributed(
        address presaleAddress,
        address teamVestingAddress,
        address airdropVaultAddress,
        address liquidityAddress,
        address stakingAddress,
        uint256 presaleAmount,
        uint256 teamVestingAmount,
        uint256 airdropVaultAmount,
        uint256 liquidityAmount,
        uint256 stakingAmount
    );

    // ─── Constructor ───────────────────────────────────────────────────────────

    /**
     * @notice Mints total supply and distributes to 5 recipients.
     * @param name_              Token name ("Flozy")
     * @param symbol_            Token symbol ("FLZY")
     * @param totalSupply_       Total supply (1 billion = 1e27 with 18 decimals)
     * @param presaleAddr        Presale contract address
     * @param teamVestingAddr    TeamVesting contract address
     * @param airdropVaultAddr   AirdropVault contract address
     * @param liquidityAddr      Direct liquidity wallet address
     * @param stakingAddr        Staking contract address
     * @param presaleAmount_     Amount for presale (250M = 250e24)
     * @param teamVestingAmount_ Amount for team vesting (250M = 250e24)
     * @param airdropAmount_     Amount for airdrop vault (100M = 100e24)
     * @param liquidityAmount_   Amount for liquidity (250M = 250e24)
     * @param stakingAmount_     Amount for staking pool (150M = 150e24)
     * @param owner_             Owner address (Mustafa)
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address presaleAddr,
        address teamVestingAddr,
        address airdropVaultAddr,
        address liquidityAddr,
        address stakingAddr,
        uint256 presaleAmount_,
        uint256 teamVestingAmount_,
        uint256 airdropAmount_,
        uint256 liquidityAmount_,
        uint256 stakingAmount_,
        address owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        require(presaleAddr != address(0), "Invalid presale address");
        require(teamVestingAddr != address(0), "Invalid team vesting address");
        require(airdropVaultAddr != address(0), "Invalid airdrop vault address");
        require(liquidityAddr != address(0), "Invalid liquidity address");
        require(stakingAddr != address(0), "Invalid staking address");
        require(
            presaleAmount_ + teamVestingAmount_ + airdropAmount_ + liquidityAmount_ + stakingAmount_ == totalSupply_,
            "Amounts must equal total supply"
        );

        _mint(presaleAddr,      presaleAmount_);
        _mint(teamVestingAddr,  teamVestingAmount_);
        _mint(airdropVaultAddr, airdropAmount_);
        _mint(liquidityAddr,    liquidityAmount_);
        _mint(stakingAddr,      stakingAmount_);

        emit TokensDistributed(
            presaleAddr,
            teamVestingAddr,
            airdropVaultAddr,
            liquidityAddr,
            stakingAddr,
            presaleAmount_,
            teamVestingAmount_,
            airdropAmount_,
            liquidityAmount_,
            stakingAmount_
        );
    }
}
