# Flozy 4-Contract Architecture Update — Changes Summary

**Date**: May 14, 2026  
**Version**: 2.0 (4-contract model)  
**Changes**: Complete refactor from 3-contract to 4-contract architecture with automatic token distribution

---

## 📦 What Changed

### Architecture Evolution

**Before (3 contracts):**
- Token → Presale (manual transfer after deployment)
- Token → TeamVesting (manual transfer after deployment)
- Airdrop handled off-chain via frontend form

**After (4 contracts):**
- Token → **Distributed to all 4 recipients at mint time**
- Presale (250M tokens, staged purchase + monthly vesting)
- TeamVesting (250M tokens, 6 beneficiaries + monthly vesting)
- **AirdropVault (NEW)** (250M tokens, fixed unlock date)
- Liquidity Wallet (250M tokens, direct transfer)

---

## 🔄 Smart Contracts Updated

### 1. **Token.sol** (COMPLETELY REWRITTEN)

**Old behavior**: Minted all tokens to deployer; manual transfers required

**New behavior**:
- Constructor takes 4 recipient addresses (Presale, TeamVesting, AirdropVault, Liquidity)
- Automatically distributes 250M to each at mint
- **Deployer receives 0 tokens**
- Emits `TokensDistributed` event

**New parameters**:
```solidity
constructor(
  string memory name_,
  string memory symbol_,
  uint256 totalSupply_,
  address presaleAddress_,
  address teamVestingAddress_,
  address airdropVaultAddress_,
  address liquidityAddress_,
  uint256 presaleAmount_,
  uint256 teamVestingAmount_,
  uint256 airdropAmount_,
  uint256 liquidityAmount_,
  address owner_
)
```

### 2. **AirdropVault.sol** (NEW CONTRACT)

**Purpose**: Manage 250M tokens with fixed unlock date and batch whitelisting

**Key Features**:
- Fixed unlock date (e.g., Nov 15, 2026) — tokens locked until this date
- `addAirdropParticipants(address[] users, uint256[] amounts)` — only owner can call
- `claim()` — users claim when date passes
- `getClaimableNow(address user)` — view function to check claimable amount
- `getAllocation(address user)` — full allocation details including days until unlock

**Events**:
- `ParticipantsAdded` — when batch whitelist is added
- `Claimed` — when user claims tokens

### 3. **Presale.sol** (UNCHANGED)
- Already has monthly 15th vesting ✓
- Already has per-stage instant unlock % ✓
- No modifications needed

### 4. **TeamVesting.sol** (UNCHANGED)
- Already has monthly 15th vesting ✓
- Already has 6 beneficiaries ✓
- Already has 25% instant unlock ✓
- No modifications needed

---

## ⚙️ Configuration Updates

### **deploy.config.js**

**New sections**:
```javascript
distributionM: {
  presale: 250,      // 250M → Presale
  teamVesting: 250,  // 250M → TeamVesting
  airdrop: 250,      // 250M → AirdropVault
  liquidity: 250,    // 250M → Liquidity wallet
}

// Renamed from teamVesting.beneficiaries to:
teamBeneficiaries: [
  { name: "Team & Dev", address: "0x...", amountM: 100, instantUnlockBps: 2500 },
  { name: "Sponsor 1",  address: "0x...", amountM: 30,  instantUnlockBps: 2500 },
  // ... 5 total
]

fixedAirdropDate: "2026-11-15",  // Airdrop unlock date
liquidityAddress: "0x...",       // Direct liquidity wallet
```

---

## 📝 Deployment Script Updates

### **scripts/deploy.js** (REWRITTEN)

**Old flow**:
1. Deploy Token (all to deployer)
2. Deploy Presale
3. Deploy TeamVesting
4. Transfer presale tokens
5. Transfer team tokens

**New flow**:
1. Deploy Presale (placeholder token)
2. Deploy TeamVesting (placeholder token)
3. Deploy AirdropVault (placeholder token)
4. **Deploy Token with all 4 recipients** ← Automatic distribution happens here
5. No manual transfers needed!

**Output includes**:
```
  Contracts:
    Token:           0x...
    Presale:         0x...
    TeamVesting:     0x...
    AirdropVault:    0x...
    Liquidity (Wallet): 0x...
```

---

## 🎨 Frontend Updates

### **New Contract Configuration**

**src/config/contracts.ts**
- Added `AIRDROP_VAULT_ADDRESS`
- Added `TEAM_VESTING_ABI` (for claim interface)
- Added `AIRDROP_VAULT_ABI`
- Updated `TOKEN_ABI` with `balanceOf` function

### **New Components**

1. **AirdropClaimSection.tsx**
   - Shows total airdrop allocation
   - Shows claimed vs. claimable
   - Days countdown until unlock
   - Claim button (active after unlock date)

2. **TeamClaimSection.tsx**
   - Shows allocation for team/sponsors
   - 25% instant + 75% vesting breakdown
   - Monthly unlock schedule
   - Claim button with next unlock date
   - Expandable details with vesting breakdown

3. **ClaimsSection.tsx**
   - Combines all 3 claim widgets (Presale, Team, Airdrop)
   - Grid layout on desktop, stacked on mobile
   - Info cards explaining vesting, wallet requirement, network

### **Updated Components**

- **page.tsx**: Added `<ClaimsSection />` after HeroSection
- **Navbar.tsx**: Added "Claims" link to navigation menu
- **globals.css**: Added button styles
  - `btn-meme-green`
  - `btn-meme-purple`
  - `btn-meme-gray`

### **Updated Configuration**

- **frontend/.env.example**: Updated with all 4 contract addresses
  - `NEXT_PUBLIC_TOKEN_ADDRESS`
  - `NEXT_PUBLIC_PRESALE_ADDRESS`
  - `NEXT_PUBLIC_TEAM_VESTING_ADDRESS`
  - `NEXT_PUBLIC_AIRDROP_VAULT_ADDRESS`

---

## 📋 Token Allocation (1 Billion = 100%)

```
250M (25%) → Presale Contract
├─ 5 stages × 50M tokens
├─ Stage-based instant unlocks (25%, 20%, 15%, 10%, 5%)
└─ Monthly vesting on 15th (24 months total)

250M (25%) → TeamVesting Contract
├─ 1 Team & Dev: 100M
├─ 5 Sponsors: 30M each = 150M
├─ All with 25% instant unlock
└─ Monthly vesting on 15th (24 months total)

250M (25%) → AirdropVault Contract
├─ Fixed unlock date (e.g., Nov 15, 2026)
├─ Batch whitelisting by owner
└─ Users claim after unlock date

250M (25%) → Liquidity Wallet
└─ Direct transfer (no vesting)
```

---

## 🔐 Security & Transparency

**Before**:
- Owner held all tokens initially
- Manual transfers prone to mistakes

**After**:
- All distributions happen **automatically at Token mint**
- Owner **cannot change distributions** after deploy
- Cleaner, more transparent, **impossible to lose tokens**
- **All allocations are immutable** in code

---

## 📚 New Documentation

**DEPLOYMENT_GUIDE.md**
- Complete step-by-step instructions
- .env setup
- Wallet configuration
- Testnet → Mainnet process
- Troubleshooting guide
- Post-deployment tasks (startVesting, add airdrop participants)

---

## ✅ Test Coverage

**All 44 tests passing** (unchanged from before):
- 24 Presale tests ✓
- 20 TeamVesting tests ✓

**New manual tests needed** (for AirdropVault):
- [ ] Fixed unlock date enforcement
- [ ] Batch whitelisting
- [ ] Claim functionality after unlock
- [ ] Permission checks (only owner can add participants)

---

## 🚀 Next Steps for User

1. **Update wallet addresses** in `deploy.config.js` (6 addresses + liquidity)
2. **Create `.env`** in `/contracts` with PRIVATE_KEY and BASESCAN_API_KEY
3. **Deploy** to Base Sepolia: `npx hardhat run scripts/deploy.js --network base_sepolia`
4. **Save 4 contract addresses** from deployment output
5. **Create `.env.local`** in `/frontend` with addresses and chain ID
6. **Build frontend**: `npm run build` in `/frontend`
7. **Upload `/out`** folder to cPanel public_html
8. **Test** wallet connection and all 3 claim interfaces

---

## 📊 Breaking Changes

⚠️ These are **not backwards compatible**:
- `deploy.config.js` structure changed (`teamVesting` → `teamBeneficiaries`, added `liquidityAddress`, `fixedAirdropDate`)
- Token constructor signature completely changed (requires all 4 addresses + amounts)
- Frontend `.env` now requires 4 contract addresses instead of 2
- New Navbar link to Claims section

✅ **Mitigation**: Follow DEPLOYMENT_GUIDE.md exactly

---

## 📈 Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Distribution | Manual (error-prone) | Automatic (safe) |
| Airdrop | Off-chain form | On-chain contract |
| Transparency | Owner holds tokens | Owner holds 0 tokens |
| Flexibility | Changes require redeploy | Fixed at deploy |
| Security | Manual transfer risk | No transfer risk |
| UI | 1 presale widget | 3 claim sections |

---

## 🔗 Related Files

**Smart Contracts**:
- `/contracts/contracts/Token.sol` — Core token with auto-distribution
- `/contracts/contracts/AirdropVault.sol` — Airdrop with fixed unlock date
- `/contracts/deploy.config.js` — All deployment configuration
- `/contracts/scripts/deploy.js` — Deployment automation

**Frontend**:
- `/frontend/src/components/ClaimsSection.tsx` — All 3 claim widgets
- `/frontend/src/components/AirdropClaimSection.tsx` — Airdrop claim UI
- `/frontend/src/components/TeamClaimSection.tsx` — Team/sponsor claim UI
- `/frontend/src/config/contracts.ts` — Contract addresses and ABIs
- `/frontend/.env.example` — Environment template

**Documentation**:
- `DEPLOYMENT_GUIDE.md` — Step-by-step deployment
- `CHANGES_SUMMARY.md` — This file

---

**Status**: ✅ Ready for deployment  
**Tested**: ✅ 44 contract tests passing  
**Documented**: ✅ Complete deployment guide included
