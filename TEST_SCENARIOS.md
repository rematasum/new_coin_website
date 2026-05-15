# Flozy Presale Platform - Test Senaryoları ve Doğrulama

## Proje Durumu

✅ **Smart Kontratlar**: 4 kontrat mimarisi (Token, Presale, TeamVesting, AirdropVault)  
✅ **Frontend**: Presale, Team/Sponsor, Airdrop claim komponentleri  
✅ **Derlemeler**: Başarılı (solidity + Next.js)  
⏳ **Şu Anda**: Base Sepolia testnet'e deployment hazırlığı

---

## I. PRE-DEPLOYMENT KONTROL LİSTESİ

### A. Kontrat Konfigürasyonu (deploy.config.js)
- [x] Token adı: "Flozy" (FLZY)
- [x] Total supply: 1,000,000,000 (1 Milyar)
- [x] Dağıtım: Presale 250M + TeamVesting 250M + AirdropVault 250M + Liquidity 250M
- [x] Presale deadline: 2026-08-15 (gelecek tarih)
- [x] Airdrop unlock tarihi: 2026-11-15
- [x] Team & Dev: 0x7375821d0bAC0AC21A3BA81F5804aAE717108C61 (100M, %25 instant)
- [x] Sponsor 1-5: 30M each (%25 instant unlock)
- [x] Liquidity: 0xCE0e20488Da66DE8ce8080412f9094d801f617C4 (250M direct)

### B. Kontrat Özellikleri
- [x] NewPurchase(address buyer, uint256 amount) event → Telegram Bot dinlemesi için
- [x] AirdropVault batch whitelisting (100+ adres destekleri)
- [x] Presale: 5 stage, her stage'in %25-5 instant unlock'u
- [x] TeamVesting: 24 ay aylık vesting, her 30 günde 1 tranş (15. günü başlangıç)
- [x] AirdropVault: Fixed unlock date (2026-11-15), claim 1x unlock

### C. Frontend Güncellemeleri
- [x] BigInt handling düzeltildi (type safety)
- [x] Hydration errors çözüldü (useEffect + isMounted)
- [x] PresaleWidget: Presale purchase flow
- [x] TeamClaimSection: Team/Sponsor vesting schedule
- [x] AirdropClaimSection: Airdrop claim + unlock countdown
- [x] ClaimsSection: 3 component'i grid layout'ta birleştirme

### D. Deployment Script
- [x] arguments.js dosyası otomatik oluşturma
- [x] Verification hazırlığı (parametreler kaydediliyor)
- [x] Deployment addresses otomatik JSON kaydı

---

## II. BASE SEPOLİA DEPLOYMENT ADIMLAR

### Adım 1: Environment Setup
```bash
cd C:\Users\atame\new_coin_website\contracts

# .env dosyası kontrol edin:
# PRIVATE_KEY=<your-private-key>
# BASESCAN_API_KEY=<your-api-key>
```

### Adım 2: Deploy Script Çalıştırma
```bash
npx hardhat run scripts/deploy.js --network base_sepolia
```

**Beklenen çıktı:**
```
═══════════════════════════════════════════════════════
  FLOZY DEPLOYMENT
═══════════════════════════════════════════════════════
Network:   base_sepolia
Deployer:  0x<your-address>

Token Distribution:
  → Presale:       250 tokens
  → TeamVesting:   250 tokens
  → AirdropVault:  250 tokens
  → Liquidity:     250 tokens

1. Deploying Presale... ✓ 0x<presale-address>
2. Deploying TeamVesting... ✓ 0x<team-vesting-address>
3. Deploying AirdropVault... ✓ 0x<airdrop-vault-address>
4. Deploying Token... ✓ 0x<token-address>
5. Saving deployment record...

Contracts:
  Token:           0x<token>
  Presale:         0x<presale>
  TeamVesting:     0x<teamvesting>
  AirdropVault:    0x<airdrop>
  Liquidity:       0xCE0e20488Da66DE8ce8080412f9094d801f617C4
```

### Adım 3: Frontend Configuration
```bash
cd C:\Users\atame\new_coin_website\frontend

# .env.local güncelleme (deployment çıktısından):
NEXT_PUBLIC_TOKEN_ADDRESS=0x<token-address>
NEXT_PUBLIC_PRESALE_ADDRESS=0x<presale-address>
NEXT_PUBLIC_TEAM_VESTING_ADDRESS=0x<teamvesting-address>
NEXT_PUBLIC_AIRDROP_VAULT_ADDRESS=0x<airdrop-address>
NEXT_PUBLIC_CHAIN_ID=84532
```

### Adım 4: Frontend Build & Test
```bash
npm run build
npm run dev  # localhost:3000'de test edin
```

---

## III. TEST SENARYOLARI

### Test 1: Sponsor Claim Testi
**Amaç**: Sponsor cüzdanının %25 instant unlock'u çekebilmesi  
**Cüzdan**: 0xF632473935138bcbBdcAC33a6fC88E771C966490 (Sponsor 1)

1. Frontend'e Sponsor 1 cüzdanıyla bağlanın
2. "Team & Sponsors" bölümüne gidin
3. Beklenenler:
   - Total Allocation: 30,000,000 FLZY
   - 25% instant ≈ 7,500,000 FLZY hemen claimable
   - Claim butonu aktif ✓

4. "Claim" butonuna tıklayın
5. MetaMask onayı yapın
6. Beklenenler:
   - ✅ Tokens claimed successfully! mesajı
   - Already Claimed: 7,500,000 FLZY artacak
   - Available Now: 0 FLZY (vesting henüz başlamamış)

**Geçme Koşulu**: ✅ Transaction başarılı, balance güncellendi

---

### Test 2: Tarih Kilidi Testi (Airdrop)
**Amaç**: Airdrop claim'i kilitlediğini doğrulama  
**Unlock Tarihi**: 2026-11-15

**Senaryolar**:
- **Nov 14, 2026 23:59**: Claim locked → "🔒 CLAIM (LOCKED X DAYS)"
- **Nov 15, 2026 00:00**: Claim unlocked → "💚 CLAIM AIRDROP" (green)

**Kontrat Veri Doğrulaması** (Basescan'de):
1. AirdropVault → Read Contract → fixedUnlockDate
2. Beklenen: Unix timestamp = Nov 15, 2026 midnight UTC
3. Bugün vs unlock date fark = daysUntilUnlock ✓

**Geçme Koşulu**: ✅ Frontend countdown doğru, kontrat kilidi çalışıyor

---

### Test 3: Airdrop Whitelist Testi
**Amaç**: Google Sheets'ten gelen adresleri whitelisting  
**Örnek Adresler**:
```
0xF632473935138bcbBdcAC33a6fC88E771C966490  → 100,000 FLZY
0x07cC193314BC474AaA92D56325AEA0C30A698E5E  → 50,000 FLZY
0x492eE2Cc5806Aa5E679Aa19d6deb1cd00cFc43A5  → 75,000 FLZY
```

**Adımlar**:
1. Owner (Deployer) cüzdanıyla bağlanın
2. Hardhat/Etherscan aracılığıyla AirdropVault'ı çağırın:
   ```javascript
   // Etherscan Write Tab'ında:
   addAirdropParticipants(
     ["0xF632...", "0x07cc...", "0x492..."],
     ["100000000000000000000000", "50000000000000000000000", "75000000000000000000000"]
   )
   ```

3. Her cüzdan Frontend'de bağlanı p kontrol edin:
   - Sponsor 1: 100,000 FLZY görmesi gerekir
   - Sponsor 2: 50,000 FLZY görmesi gerekir
   - Sponsor 3: 75,000 FLZY görmesi gerekir

**Geçme Koşulu**: ✅ Tüm adresler whitelist'te, allocation'lar doğru

---

### Test 4: Presale Purchase Testi
**Amaç**: Presale flow'un düzgün çalışması

1. Presale aktif cüzdanla bağlanın (test cüzdanı)
2. "PRESALE" bölümüne gidin
3. ETH girin (örn: 0.1 ETH)
4. "🚀 BUY $FLZY NOW" tıklayın
5. Beklenenler:
   - ✅ Transaction başarılı
   - Total Sold artacak
   - Stage progress güncellenecek
   - User's claimable amounts güncellenecek

**Geçme Koşulu**: ✅ Purchase confirmed, balance güncellendi

---

### Test 5: Presale Post-Deadline Claim
**Amaç**: Presale bitince claim akışının çalışması

1. Deadline geçtikten sonra:
   - Button değişir: "🚀 BUY" → "💎 CLAIM $FLZY"
   - Claimable amount gösterilir
2. "💎 CLAIM" tıklayın
3. Beklenenler:
   - ✅ Transaction başarılı
   - Instant %25 hemen transfer
   - %75 kalan vesting schedule'a göre unlock

**Geçme Koşulu**: ✅ Tokens claimed, balance update

---

### Test 6: NewPurchase Event (Telegram Bot Hazırlığı)
**Amaç**: Event log'unun Telegram Bot tarafından dinlenmesi

**Basescan Event Log:**
1. Presale contract → Events
2. "NewPurchase" event'ini arayın
3. Her purchase bir event emit etmeli:
   ```
   NewPurchase(
     indexed address buyer,
     uint256 tokenAmount
   )
   ```

**Telegram Bot Integration** (Sonra yapılacak):
```javascript
// Bot dinleyecek:
// "Harika! Yeni yatırımcı aramıza katıldı, toplam satılan: XM $FLZY"
```

**Geçme Koşulu**: ✅ Event Basescan'de görülüyor

---

## IV. KONTRAT DOĞRULAMA (VERIFICATION)

### Adım 1: arguments.js Dosyasını Kontrol Edin
```bash
ls contracts/deployments/arguments-base_sepolia.js
```

### Adım 2: Presale Doğrulaması
```bash
npx hardhat verify \
  --network base_sepolia \
  --constructor-args contracts/deployments/arguments-base_sepolia.js \
  0x<presale-address>
```

### Adım 3: TeamVesting Doğrulaması
```bash
npx hardhat verify \
  --network base_sepolia \
  --constructor-args contracts/deployments/arguments-base_sepolia.js \
  0x<teamvesting-address>
```

### Adım 4: AirdropVault Doğrulaması
```bash
npx hardhat verify \
  --network base_sepolia \
  --constructor-args contracts/deployments/arguments-base_sepolia.js \
  0x<airdrop-address>
```

### Adım 5: Token Doğrulaması
```bash
npx hardhat verify \
  --network base_sepolia \
  --constructor-args contracts/deployments/arguments-base_sepolia.js \
  0x<token-address>
```

**Beklenen Sonuç**: ✅ Successfully verified contract

---

## V. MANUEL OWNER OPERASYONLARI

### TeamVesting'i Başlat
```javascript
// Hardhat console'da veya Etherscan Write'da:
startVesting(firstFifthTimestamp)
// Örn: Nov 15, 2026 midnight UTC = 1810185600
```

### Airdrop Whitelist Ekle
```javascript
// Etherscan Write Tab'ında:
addAirdropParticipants(
  ["0x...", "0x..."],  // Users array
  ["1000000000000000000000000", ...]  // Amounts (with 18 decimals)
)
```

### Presale Sonlandır (Opsiyonel)
```javascript
endPresale()
// Automatically sets vestingStart
```

### Unsold Tokens'ı Yak
```javascript
burnUnsold()
// Requires presale ended
```

---

## VI. HATA AYIKLAMA

### Problem: "BigInt" hatası
**Çözüm**: Tüm BigInt işlemleri type-safe hale getirildi
- Team/Airdrop component'lerinde `isMounted` kontrol eklendi
- PresaleWidget'da `claimableAmount` variable'ı kullanılıyor

### Problem: Hydration mismatch
**Çözüm**: `useEffect(() => setIsMounted(true))` eklendi
- Server-render ile client-render arasındaki mismatch giderildi

### Problem: Kontrat deploy başarısız
**Çözüm Adımları**:
1. `.env` dosyasında PRIVATE_KEY'i kontrol edin
2. Deployer cüzdan hesabında Base Sepolia ETH var mı?
3. `npx hardhat compile` ile derlenme kontrol edin

---

## VII. SONRAKI ADIMLAR (SIRADAKI)

### Şu An Yapılacak:
1. ✅ Deployment scriptini çalıştır → Adresler al
2. ✅ Frontend .env.local güncelle
3. ✅ Test senaryolarını tek tek çalıştır
4. ✅ Kontrat doğrulamasını yap (Basescan)

### Sonra (ADIM 8):
1. Telegram Bot setup (NewPurchase event'i dinleme)
2. cPanel deploy (Namecheap)
3. test.flozy.meme domain aktivasyonu

---

## VIII. HIZLI REFERANS

| Kontrat | Adres | Fonksiyon |
|---------|-------|----------|
| **Token** | 0x... | balanceOf, transfer |
| **Presale** | 0x... | buy, claim, getClaimableNow |
| **TeamVesting** | 0x... | startVesting, claim, getBeneficiary |
| **AirdropVault** | 0x... | addAirdropParticipants, claim, getAllocation |

---

## NOTLAR

- Tüm timestamp'ler **UTC Midnight** (00:00)
- Vesting schedule: 15. günü başlangıç, her 30 günde bir tranş
- AirdropVault batch limit: ~1000 adres/transaction (gas limit)
- Telegram Bot: NewPurchase event'i dinleme hazırlığı tamamlandı

---

**Son Güncelleme**: 2026-05-15  
**Durum**: Deployment Hazır ✅
