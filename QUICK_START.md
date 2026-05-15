# 🚀 Flozy Deployment - HIZLI BAŞLANGIÇ REHBERİ

## ⏱️ 5 DAKİKA'DA DEPLOYMENT

### 1️⃣ Kontratları Derle (30 saniye)
```bash
cd C:\Users\atame\new_coin_website\contracts
npx hardhat compile
```
✅ Beklenen: "Compiled 1 Solidity file successfully"

---

### 2️⃣ Base Sepolia'ya Deploy Et (2 dakika)
```bash
npx hardhat run scripts/deploy.js --network base_sepolia
```

**Çıktıdan şu adresleri KOPYALA:**
```
Token:           0x________
Presale:         0x________
TeamVesting:     0x________
AirdropVault:    0x________
```

---

### 3️⃣ Frontend'i Güncelle (1 dakika)
```bash
cd C:\Users\atame\new_coin_website\frontend

# .env.local dosyasını aç (yoksa oluştur)
# Bu satırları ekle:
NEXT_PUBLIC_TOKEN_ADDRESS=0x________
NEXT_PUBLIC_PRESALE_ADDRESS=0x________
NEXT_PUBLIC_TEAM_VESTING_ADDRESS=0x________
NEXT_PUBLIC_AIRDROP_VAULT_ADDRESS=0x________
NEXT_PUBLIC_CHAIN_ID=84532
```

---

### 4️⃣ Frontend Build Et (1.5 dakika)
```bash
npm install  # sadece ilk kez
npm run build
npm run dev   # localhost:3000 test et
```

✅ Beklenen: Başarılı build, no errors

---

## 📋 KONTROL LISTESI

| # | Görev | Durum |
|---|-------|-------|
| 1 | Kontratlar derlendi | ☐ |
| 2 | Base Sepolia deployment tamamlandı | ☐ |
| 3 | Adresler .env.local'e yazıldı | ☐ |
| 4 | Frontend build başarılı | ☐ |
| 5 | localhost:3000 açılıp claim widget'ler görülüyor | ☐ |

---

## 🧪 TEMEL TEST (5 dakika)

### Test 1: Presale Widget Görünüyor
- localhost:3000 aç
- "PRESALE" bölümünü görmeli
- Stage info'lar güncellenmiş görülmeli

### Test 2: Cüzdan Bağlanabiliyor
- "CONNECT WALLET" tıkla
- MetaMask açılmalı
- Base Sepolia switch etmeli

### Test 3: Sponsor Claim Hakkı Görülüyor
- Sponsor 1 cüzdanını bağla: 0xF632...
- "TEAM & SPONSORS" bölümünde 30M FLZY görülmeli
- 7.5M claimable (25% instant)

### Test 4: Airdrop Countdown Çalışıyor
- "AIRDROP" bölümünde "Unlocks In X days" görülmeli
- 🔒 CLAIM (LOCKED) butonu görülmeli

---

## 🔥 HEMEN DEPLOYMENT İÇİN

### Senaryolar:

#### Senaryo A: Tamamen Yeni Deploy
```bash
# 1. Contracts
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.js --network base_sepolia

# 2. Çıktı adresleri not et

# 3. Frontend
cd ../frontend
# .env.local düzenle (adresleri yapıştır)
npm run build
npm run dev
```

#### Senaryo B: Sadece Frontend Güncelleme
```bash
cd frontend
# .env.local düzenle (eski adresleri güncelle)
npm run build
npm run dev
```

#### Senaryo C: Production Deploy (mainnet)
```bash
# deploy.config.js kontrol et:
# - deadline: 2026-08-15 (gelecek)
# - fixedAirdropDate: 2026-11-15 (gelecek)

npx hardhat run scripts/deploy.js --network base_mainnet
```

---

## ❌ HATA ÇÖZÜMLERI

### "PRIVATE_KEY not found"
**Çözüm**: `.env` dosyasına ekle
```
PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key
```

### "Insufficient funds"
**Çözüm**: Deployer cüzdanında Base Sepolia ETH var mı?

### "BigInt" hatası
**Çözüm**: Cache temizle (hard refresh: Ctrl+Shift+Delete)

### ".env.local not loading"
**Çözüm**: 
- npm run dev'i yeniden başlat
- `npm install` çalıştır
- node_modules'ü sil: `rm -r node_modules`, `npm install`

---

## 📊 DURUM GÖSTERGESI

```
✅ Kontratlar derlenmiş
✅ BigInt hataları düzeltildi
✅ Hydration hataları çözüldü
✅ NewPurchase event eklendi
✅ arguments.js generation hazır
⏳ BASE SEPOLIA DEPLOYMENT - SIRASI SENIN
⏳ Test senaryoları çalıştırma
⏳ Kontrat doğrulama (Basescan)
⏳ cPanel deployment
⏳ Telegram Bot setup
```

---

## 🎯 SONRAKI ADIMLAR

### SADECESİ 3 KOLAY ADIM:

1. **DEPLOY** (5 min)
   ```bash
   cd contracts
   npx hardhat run scripts/deploy.js --network base_sepolia
   ```

2. **CONFIGURE** (2 min)
   ```bash
   cd frontend
   # .env.local güncelle
   npm run build
   ```

3. **TEST** (5 min)
   - localhost:3000 aç
   - Sponsor 1 cüzdanını bağla
   - Claim widget'ları kontrol et

**Toplam: 12 dakika** ⏱️

---

## 💾 DEPLOYMENT ÇIKTI ÖRNEĞİ

```
═══════════════════════════════════════════════════════
  FLOZY DEPLOYMENT
═══════════════════════════════════════════════════════
Network:   base_sepolia
Deployer:  0xYourAddress

Token Distribution:
  → Presale:       250 FLZY million
  → TeamVesting:   250 FLZY million
  → AirdropVault:  250 FLZY million
  → Liquidity:     250 FLZY million

1. Deploying Presale... ✓ 0xPresaleAddr
2. Deploying TeamVesting... ✓ 0xTeamVestingAddr
3. Deploying AirdropVault... ✓ 0xAirdropVaultAddr
4. Deploying Token... ✓ 0xTokenAddr

CONTRACTS:
  Token:           0xTokenAddr
  Presale:         0xPresaleAddr
  TeamVesting:     0xTeamVestingAddr
  AirdropVault:    0xAirdropVaultAddr
  Liquidity:       0xCE0e20488Da66DE8ce8080412f9094d801f617C4

✓ Saved → contracts/deployments/base_sepolia.json
✓ Arguments → contracts/deployments/arguments-base_sepolia.js
```

---

## 🔗 KONTROL ADRESLERI

### Team Beneficiaries
```
Team & Dev:  0x7375821d0bAC0AC21A3BA81F5804aAE717108C61 (100M)
Sponsor 1:   0xF632473935138bcbBdcAC33a6fC88E771C966490 (30M)
Sponsor 2:   0x07cC193314BC474AaA92D56325AEA0C30A698E5E (30M)
Sponsor 3:   0x492eE2Cc5806Aa5E679Aa19d6deb1cd00cFc43A5 (30M)
Sponsor 4:   0x7a1A48B0f14Cf606a4B320dbD6591c4858F5588e (30M)
Sponsor 5:   0xb1AB86421AB02cbf87d28b654dF4e4ea52355517 (30M)
```

### Liquidity
```
0xCE0e20488Da66DE8ce8080412f9094d801f617C4 (250M)
```

---

## 🎬 TIMELINE

```
Şu An (2026-05-15):
└── Deployment Hazır ✅

Sonraki (2026-05-15 15:00):
├── npx hardhat run scripts/deploy.js (5 min)
├── .env.local güncelle (2 min)
├── npm run build (2 min)
└── localhost:3000 test (5 min)

Sonra (2026-05-16):
├── Kontrat doğrulama (Basescan)
├── Test senaryoları çalıştırma
├── cPanel deployment (Namecheap)
└── Telegram Bot setup
```

---

## 📞 HIZLI SORULAR

**S: Kaç adres whitelist edebilirim?**
A: ~1000 adres bir transaction'da (gas limit). Daha fazla = multiple calls.

**S: Airdrop unlock tarihi değişebilir mi?**
A: Hayır, immutable. Smart contract'ta sabitlendi.

**S: Team vesting ne zaman başlar?**
A: Owner `startVesting()` çağırdığında. Nov 15, 2026 first 15th.

**S: Presale stage'ler otomatik mi ilerler?**
A: Evet, allocation tüklenince otomatik next stage.

**S: NewPurchase event nedir?**
A: Telegram Bot'un her purchase'ı dinlemesi için.

---

## ✅ HAZIR MISIN?

```
DEPLOYMENT BAŞLAMAK İÇİN ÜÇ KOMUT:

1. npx hardhat run scripts/deploy.js --network base_sepolia
2. Adresleri .env.local'e kopyala
3. npm run build && npm run dev

Başla! 🚀
```

---

**Son Güncelleme**: 2026-05-15  
**Hazırlık Durumu**: ✅ TAMAM  
**Devam Et**: Deploy wave başlat!
