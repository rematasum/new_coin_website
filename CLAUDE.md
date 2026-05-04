# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Base network (Layer 2) crypto presale platform. Users connect MetaMask and buy tokens with ETH. Features a staged presale system where price increases each stage, a deadline, claim mechanism post-presale, referral bonuses, and unsold token burning.

## Stack

- **Frontend:** Next.js (static export) — deployed to Vercel
- **Contracts:** Solidity + Hardhat — deployed to Base Mainnet / Base Sepolia (testnet)
- **Web3:** wagmi + viem (MetaMask / wallet connection)
- **Language:** English only

## Monorepo Structure

```
/contracts   — Hardhat project (Solidity smart contracts)
/frontend    — Next.js app (presale UI)
```

## Commands

### Contracts (`/contracts`)
```bash
npm install
npx hardhat compile
npx hardhat test
npx hardhat test test/Presale.test.js   # single test file
npx hardhat node                         # local fork
npx hardhat run scripts/deploy.js --network base_sepolia
npx hardhat run scripts/deploy.js --network base_mainnet
npx hardhat verify --network base_sepolia <address> <constructor-args>
```

### Frontend (`/frontend`)
```bash
npm install
npm run dev      # localhost:3000
npm run build    # static export to /out
npm run lint
```

## Smart Contract Architecture

**`Token.sol`** — Standard ERC-20. Total supply minted to deployer on construction. Configurable name/symbol/supply (default placeholder: 1,000,000,000). No special logic; deployer manually transfers 25% to Presale contract and burns remainder after presale.

**`Presale.sol`** — Core contract. Key design points:
- **Stages:** Each stage has a `tokenPrice` (ETH per token, in wei) and `tokenAllocation`. Automatically advances to next stage when current allocation sells out.
- **Purchase flow:** User sends ETH → contract calculates tokens → credited to `contributions[user]`. No token transfer happens at purchase time.
- **Deadline:** Unix timestamp set at deploy. Presale ends at `deadline` OR when all allocations sell out, whichever comes first.
- **Claim:** After presale ends (`presaleEnded == true` or `block.timestamp > deadline`), users call `claim()` to receive their tokens.
- **Referral:** Optional referral address on purchase; referrer receives a bonus percentage of tokens credited to their balance.
- **Burn:** Owner calls `burnUnsold()` after presale ends to send unsold tokens to `address(0)`.
- **Withdraw:** Owner calls `withdrawETH()` to collect raised ETH.

## Frontend Architecture

Single-page app (`/`). Key sections: Hero, Presale Widget, Tokenomics, Roadmap, FAQ.

**Presale Widget** is the core component:
- Reads on-chain state: current stage, price, tokens sold, total allocation, deadline countdown, user's claimable balance
- Write actions: `connect wallet`, `buy` (send ETH), `claim`
- Uses wagmi hooks for reads (`useReadContract`) and writes (`useWriteContract`)
- Contract ABIs imported from `/contracts/artifacts/` after compile

**Wallet connection:** wagmi + WalletConnect / MetaMask connector. Chain locked to Base (chainId 8453) or Base Sepolia (84532) for testnet. Prompts user to switch network if wrong chain detected.

## Network Config

| Network | Chain ID | RPC |
|---|---|---|
| Base Mainnet | 8453 | https://mainnet.base.org |
| Base Sepolia | 84532 | https://sepolia.base.org |

Hardhat config uses `PRIVATE_KEY` and `BASESCAN_API_KEY` from `.env` (never committed).

## Key Design Decisions

- Tokens are **not transferred at purchase** — only credited in a mapping. This avoids needing token approval and simplifies the UX.
- Stage advancement is **automatic** inside the `buy()` function, not a separate admin call.
- Referral bonuses come from the presale allocation, not minted extra — factor this into stage allocations.
- Frontend is a **static export** (no server), so all data comes from on-chain reads via public RPC.
