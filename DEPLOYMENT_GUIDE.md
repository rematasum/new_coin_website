# Flozy ($FLZY) Deployment Guide

Complete guide to deploy Flozy presale platform with 4-contract architecture (Token, Presale, TeamVesting, AirdropVault) to Base network.

---

## 📋 Prerequisites

1. **Node.js** (v18+): https://nodejs.org/
2. **MetaMask** installed as browser extension
3. **Base Sepolia testnet ETH** for testing (get from faucet: https://www.basechain.org/faucet)
4. **PRIVATE_KEY** from MetaMask (export from Settings → Security & Privacy)
5. **BASESCAN_API_KEY** for contract verification (from https://basescan.org/apis)

---

## 🔐 Step 1: Secure Configuration (.env)

### 1.1 Create `.env` file in `/contracts` directory:

```bash
cd contracts
touch .env
```

### 1.2 Add your private key and Basescan API key:

```
PRIVATE_KEY=0x...  (your MetaMask private key, starts with 0x)
BASESCAN_API_KEY=... (your Basescan API key)
```

⚠️ **NEVER commit `.env` to GitHub** — it contains your private key!

---

## 👥 Step 2: Configure Wallet Addresses

### 2.1 Get 6 wallet addresses (Team & Dev + 5 Sponsors)

You need:
- 1 Team & Dev wallet address
- 5 Sponsor wallet addresses
- 1 Liquidity wallet address

Examples (generate new addresses from MetaMask or other wallets):
```
Team & Dev:  0x1234...
Sponsor 1:   0x5678...
Sponsor 2:   0x9ABC...
Sponsor 3:   0xDEF0...
Sponsor 4:   0x1111...
Sponsor 5:   0x2222...
Liquidity:   0x3333...
```

### 2.2 Update `contracts/deploy.config.js`

Replace placeholder addresses:

```javascript
teamBeneficiaries: [
  { name: "Team & Dev", address: "0x1234...", amountM: 100, instantUnlockBps: 2500 },
  { name: "Sponsor 1",  address: "0x5678...", amountM: 30,  instantUnlockBps: 2500 },
  { name: "Sponsor 2",  address: "0x9ABC...", amountM: 30,  instantUnlockBps: 2500 },
  { name: "Sponsor 3",  address: "0xDEF0...", amountM: 30,  instantUnlockBps: 2500 },
  { name: "Sponsor 4",  address: "0x1111...", amountM: 30,  instantUnlockBps: 2500 },
  { name: "Sponsor 5",  address: "0x2222...", amountM: 30,  instantUnlockBps: 2500 },
],

liquidityAddress: "0x3333...",
```

Also set airdrop unlock date:
```javascript
fixedAirdropDate: "2026-11-15",  // Format: "YYYY-MM-DD"
```

---

## 🚀 Step 3: Deploy to Base Sepolia (Testnet)

### 3.1 Install dependencies:

```bash
cd contracts
npm install
```

### 3.2 Compile contracts:

```bash
npx hardhat compile
```

Expected output: ✓ compiled successfully

### 3.3 Deploy:

```bash
npx hardhat run scripts/deploy.js --network base_sepolia
```

### 3.4 Save deployment addresses

The output will show:
```
═════════════════════════════════════════════════════════════════
  DEPLOYMENT COMPLETE ✓
═════════════════════════════════════════════════════════════════

  Contracts:
    Token:           0x...  ← COPY THIS
    Presale:         0x...  ← COPY THIS
    TeamVesting:     0x...  ← COPY THIS
    AirdropVault:    0x...  ← COPY THIS
```

📝 **Save these 4 addresses** — you'll need them for the frontend!

---

## 🎮 Step 4: Test on Base Sepolia (Optional)

```bash
npx hardhat test
```

Expected output: 44 tests passing ✓

---

## 🌐 Step 5: Set Up Frontend Environment

### 5.1 Create `.env.local` in `/frontend` directory:

```bash
cd ../frontend
touch .env.local
```

### 5.2 Add deployment addresses:

```
NEXT_PUBLIC_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_PRESALE_ADDRESS=0x...
NEXT_PUBLIC_TEAM_VESTING_ADDRESS=0x...
NEXT_PUBLIC_AIRDROP_VAULT_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...  (optional, get from cloud.walletconnect.com)
```

---

## 🏗️ Step 6: Build Frontend

### 6.1 Install dependencies:

```bash
cd frontend
npm install
```

### 6.2 Build for static export:

```bash
npm run build
```

Output will be in `/frontend/out`

---

## 📤 Step 7: Deploy to Namecheap cPanel

### 7.1 Connect to cPanel/FTP

1. Open Namecheap → Domain Settings → Advanced DNS
2. Set A record to your hosting IP
3. Connect via FTP (use FileZilla or cPanel File Manager)

### 7.2 Upload files

Upload the contents of `/frontend/out` to `/public_html`:
- All `.html` files
- `/static` folder
- `/_next` folder

### 7.3 Upload `.htaccess`

The file `frontend/public/.htaccess` is already configured for SPA routing. Upload it to `/public_html/.htaccess`

### 7.4 Verify

Visit your domain in browser. You should see the Flozy presale interface.

---

## 📋 Step 8: Post-Deployment Tasks

### 8.1 Start TeamVesting

Call `startVesting(uint256 timestamp)` on TeamVesting contract with the first 15th of next month:

```bash
npx hardhat run scripts/startVesting.js --network base_sepolia
```

The timestamp should be midnight UTC of the 15th of the month when vesting starts (example: `1733961600` for Nov 15, 2024).

### 8.2 Add Airdrop Participants (if applicable)

Owner calls `addAirdropParticipants(address[] users, uint256[] amounts)` to whitelist airdrop recipients. This is called only once with all participants and their allocations.

### 8.3 Verify Contracts on Basescan (Optional)

Make contracts verifiable on explorer:

```bash
npx hardhat verify --network base_sepolia 0x... "Flozy" "FLZY"
```

---

## 🔄 Mainnet Deployment (Production)

Once tested on Base Sepolia:

### 1. Update `deploy.config.js` with any changes
### 2. Ensure you have **mainnet ETH** in your wallet
### 3. Deploy to mainnet:

```bash
npx hardhat run scripts/deploy.js --network base_mainnet
```

### 4. Save mainnet addresses
### 5. Update frontend `.env.local` with mainnet addresses
### 6. Change `NEXT_PUBLIC_CHAIN_ID=8453` (mainnet = 8453, testnet = 84532)
### 7. Rebuild and upload to cPanel

---

## 🆘 Troubleshooting

### "Stack too deep" error?
✓ Already fixed in `hardhat.config.js` with `viaIR: true`

### ".env not being read"?
✓ Make sure dotenv v16.3.1 is installed (not v17)

### Contract deploy fails?
1. Check MetaMask has enough ETH for gas
2. Verify all addresses in `deploy.config.js` are valid (0x format)
3. Check deadline/dates are in future

### Frontend won't load?
1. Ensure all 4 contract addresses are in `.env.local`
2. Check network (MetaMask should show Base Sepolia or Base Mainnet)
3. Open browser console (F12) for errors

---

## 📞 Getting Help

- **Basescan**: https://basescan.org (testnet: sepolia-basescan.org)
- **Base Docs**: https://docs.base.org
- **Hardhat Docs**: https://hardhat.org/docs
- **Next.js Docs**: https://nextjs.org/docs

---

## ✅ Checklist

- [ ] Node.js installed
- [ ] `.env` created with PRIVATE_KEY and BASESCAN_API_KEY
- [ ] 6 wallet addresses configured in `deploy.config.js`
- [ ] Liquidity address set
- [ ] Contracts compiled successfully
- [ ] Contracts deployed to Base Sepolia
- [ ] 4 deployment addresses saved
- [ ] Frontend `.env.local` created with addresses
- [ ] Frontend built successfully (`npm run build`)
- [ ] Files uploaded to cPanel
- [ ] Domain accessible in browser
- [ ] Wallet connection works (MetaMask button functional)
- [ ] Presale purchase flow tested
- [ ] Claim interfaces display correctly

---

Generated: 2026-05-14  
Network: Base (Sepolia: 84532, Mainnet: 8453)
