// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Token (FLZY)
 * @notice Automatic mint and distribution to presale, team vesting, airdrop vault, and liquidity.
 *         Total supply distributed at construction; no tokens remain with deployer.
 */
contract Token is ERC20, Ownable {
    // ─── Events ───────────────────────────────────────────────────────────────

    event TokensDistributed(
        address indexed presaleAddress,
        address indexed teamVestingAddress,
        address indexed airdropVaultAddress,
        address liquidityAddress,
        uint256 presaleAmount,
        uint256 teamVestingAmount,
        uint256 airdropVaultAmount,
        uint256 liquidityAmount
    );

    // ─── Constructor ───────────────────────────────────────────────────────────

    /**
     * @notice Mints total supply and distributes to 4 recipients.
     * @param name_              Token name ("Flozy")
     * @param symbol_            Token symbol ("FLZY")
     * @param totalSupply_       Total supply (1 billion = 1e27 with 18 decimals)
     * @param presaleAddr        Presale contract address
     * @param teamVestingAddr    TeamVesting contract address
     * @param airdropVaultAddr   AirdropVault contract address
     * @param liquidityAddr      Direct liquidity wallet address
     * @param presaleAmount_     Amount for presale (250M = 250e24)
     * @param teamVestingAmount_ Amount for team vesting (250M = 250e24)
     * @param airdropAmount_     Amount for airdrop vault (250M = 250e24)
     * @param liquidityAmount_   Amount for liquidity (250M = 250e24)
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
        uint256 presaleAmount_,
        uint256 teamVestingAmount_,
        uint256 airdropAmount_,
        uint256 liquidityAmount_,
        address owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        // Validate
        require(presaleAddr != address(0), "Invalid presale address");
        require(teamVestingAddr != address(0), "Invalid team vesting address");
        require(airdropVaultAddr != address(0), "Invalid airdrop vault address");
        require(liquidityAddr != address(0), "Invalid liquidity address");
        require(
            presaleAmount_ + teamVestingAmount_ + airdropAmount_ + liquidityAmount_ == totalSupply_,
            "Amounts must equal total supply"
        );

        // Mint and distribute
        _mint(presaleAddr, presaleAmount_);
        _mint(teamVestingAddr, teamVestingAmount_);
        _mint(airdropVaultAddr, airdropAmount_);
        _mint(liquidityAddr, liquidityAmount_);

        emit TokensDistributed(
            presaleAddr,
            teamVestingAddr,
            airdropVaultAddr,
            liquidityAddr,
            presaleAmount_,
            teamVestingAmount_,
            airdropAmount_,
            liquidityAmount_
        );
    }
}
