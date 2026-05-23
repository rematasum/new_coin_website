# Flozy ($FLZY) — Production'a Geçiş Rehberi

**Hazırlayan:** Claude Code  
**Tarih:** 23 Mayıs 2026  
**Hedef:** Base Mainnet deploy + site yayını  
**Presale açılışı:** 1 Haziran 2026 00:00 UTC

---

## Ön Koşullar (Başlamadan Önce)

- [ ] Owner cüzdanında **en az 0.05 ETH** (Base mainnet)
- [ ] `contracts/.env` dosyasında `PRIVATE_KEY` ve `BASESCAN_API_KEY` mevcut
- [ ] İnternet bağlantısı stabil
- [ ] cPanel erişimi hazır

---

## ADIM 1 — ETH'in Geldiğini Doğrula

1. MetaMask'ı aç
2. Ağı **Base** olarak seç (Ethereum değil, Base)
3. Adres: `0x0773A2064Ee839ec5f25cfE090a08b57B87569c6`
4. Bakiyede **0.05 ETH veya daha fazlası** görünüyor olmalı

Bakiye yoksa veya yeterli değilse deploy yapma. ETH gelene kadar bekle.

---

## ADIM 2 — deploy.config.js Son Kontrol

Dosya yolu: `contracts/deploy.config.js`

Şu değerlerin doğru olduğunu gözle kontrol et:

| Alan | Olması Gereken Değer |
|---|---|
| `startDate` | `"2026-06-01"` |
| `deadline` | `"2026-07-01"` |
| `teamVestingStartDate` | `"2026-07-15"` |
| `fixedAirdropDate` | `"2026-12-30"` |
| `liquidityAddress` | `"0xCE0e20488Da66DE8ce8080412f9094d801f617C4"` |
| Presale dağılımı | 250M |
| Team dağılımı | 250M |
| Airdrop dağılımı | 100M |
| Liquidity dağılımı | 250M |
| Staking dağılımı | 150M |
| **Toplam** | **1.000M = 1 Milyar** |

---

## ADIM 3 — Kontratları Derle

`contracts` klasöründe terminal aç:

```
npx hardhat compile
```

**Beklenen çıktı:** `Compiled X Solidity files successfully`

Hata görürsen devam etme, önce hatayı çöz.

---

## ADIM 4 — Mainnet Deploy

```
npx hardhat run scripts/deploy.js --network base_mainnet
```

Bu komut **2-4 dakika** sürer. MetaMask işlem onayı istemez (private key .env'de).

**Beklenen çıktı (sonunda):**

```
══════════════════════════════════════════════════
  DEPLOYMENT COMPLETE ✓
══════════════════════════════════════════════════

  Contracts:
    Token:           0x...
    Presale:         0x...
    TeamVesting:     0x...
    AirdropVault:    0x...
    Staking:         0x...
    Liquidity (Wallet): 0xCE0e...
```

**Bu 5 adresi hemen not al.** Ayrıca `contracts/deployments/base_mainnet.json` dosyasına otomatik kaydedilir.

---

## ADIM 5 — Frontend .env.local Güncelle

Dosya yolu: `frontend/.env.local`

Dosyayı aç, aşağıdaki satırları deploy çıktısındaki adreslerle güncelle:

```
NEXT_PUBLIC_TOKEN_ADDRESS=0x...          ← ADIM 4'teki Token adresi
NEXT_PUBLIC_PRESALE_ADDRESS=0x...        ← ADIM 4'teki Presale adresi
NEXT_PUBLIC_TEAM_VESTING_ADDRESS=0x...   ← ADIM 4'teki TeamVesting adresi
NEXT_PUBLIC_AIRDROP_VAULT_ADDRESS=0x...  ← ADIM 4'teki AirdropVault adresi
NEXT_PUBLIC_STAKING_ADDRESS=0x...        ← ADIM 4'teki Staking adresi
NEXT_PUBLIC_CHAIN_ID=8453                ← Mainnet (84532 değil, 8453)
```

Şu satırlara **dokunma:**
```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_SHEETS_WEBHOOK_URL=...
```

---

## ADIM 6 — Kontratları Verify Et (BaseScan)

5 ayrı komut. `<ADRES>` kısımlarını ADIM 4'teki adreslerle değiştir:

**Token:**
```
npx hardhat verify --network base_mainnet --constructor-args deployments/arguments-base_mainnet.js <TOKEN_ADRESI>
```

**Presale:**
```
npx hardhat verify --network base_mainnet <PRESALE_ADRESI>
```

**TeamVesting:**
```
npx hardhat verify --network base_mainnet <TEAM_VESTING_ADRESI>
```

**AirdropVault:**
```
npx hardhat verify --network base_mainnet <AIRDROP_VAULT_ADRESI>
```

**Staking:**
```
npx hardhat verify --network base_mainnet --constructor-args deployments/arguments-staking-base_mainnet.js <STAKING_ADRESI>
```

Her biri için **"Successfully verified contract"** görmeli.  
BaseScan'de kontrat adresine girdiğinde "Contract" sekmesinde **✓ Verified** rozeti görünür.

> Not: Verify başarısız olursa presale'i durdurmak gerekmez. Verify sadece şeffaflık içindir, kontrattaki hiçbir şeyi değiştirmez. Tekrar deneyebilirsin.

---

## ADIM 7 — Health Check

```
npx hardhat run scripts/health-check.js --network base_mainnet
```

**Beklenen çıktı:**

```
HEALTH CHECK PASSED
```

Aksi halde hangi kontrolün başarısız olduğu yazar — bana ilet, birlikte bakalım.

---

## ADIM 8 — Frontend Build Al

`frontend` klasöründe:

```
npm run build
```

**Beklenen çıktı (son kısım):**

```
Route (app)                              Size     First Load JS
┌ ○ /                                    64 kB         194 kB
...
○  (Static)  prerendered as static content
```

Hata yoksa `out/` klasörü oluşmuştur.

---

## ADIM 9 — cPanel'e Yükle

1. cPanel File Manager'ı aç
2. `public_html` (veya hangi klasör siteyi yayınlıyorsa) klasörüne gir
3. `out/` klasörünün içindeki **tüm dosya ve klasörleri** yükle (mevcut dosyaların üzerine yaz)

> Dikkat: `out/` klasörünün kendisini değil, **içindekileri** yükle.

---

## ADIM 10 — Site Doğrulaması

Tarayıcıda sitenin adresini aç. Presale henüz başlamadıysa (1 Haziran'dan önce) şunları kontrol et:

- [ ] Presale widget "Presale starts in X days" sayacı gösteriyor
- [ ] Stage tablosu: 5 aşama ve fiyatlar doğru
- [ ] Tokenomics: 5 dilim (Presale 25%, Team 25%, Liquidity 25%, Staking 15%, Airdrop 10%)
- [ ] Team & Sponsors bölümü: 6 kart görünüyor
- [ ] Airdrop form çalışıyor, kayıt gönderilebiliyor
- [ ] MetaMask ile cüzdan bağlanabiliyor
- [ ] Yanlış ağda "Switch to Base" uyarısı çıkıyor

---

## ADIM 11 — Smoke Buy (1 Haziran 00:00 UTC Sonrası)

Presale açıldıktan sonra **kendi cüzdanından** test alımı yap:

1. Siteye gir, MetaMask'ı bağla (Base mainnet)
2. Presale widget'ta **0.001 ETH** gir
3. "BUY $FLZY NOW" butonuna bas, MetaMask'tan onayla
4. Şunları kontrol et:
   - [ ] Widget'ta token bakiyen arttı (~500 FLZY)
   - [ ] Telegram'a buy bildirimi geldi
   - [ ] "Tokens Sold" sayacı güncellendi
5. Her şey tamam → sosyal medya duyurusunu aç

---

## Presale Sonrası Yapılacaklar (1 Temmuz 2026+)

Bu işlemleri presale bittikten sonra yap. Sırası önemlidir.

### 1. Satılmayan Tokenleri Yak

BaseScan'de Presale kontrat adresine git → "Write Contract" → `burnUnsold()` → MetaMask ile onayla.

> Ne yapar: Satılmayan FLZY tokenler kalıcı olarak yakılır (0xdead adresine gönderilir).

### 2. ETH'i Çek

BaseScan'de Presale kontrat adresine git → "Write Contract" → `withdrawETH` → `to` kısmına kendi adresini yaz → MetaMask ile onayla.

> Ne yapar: Presale boyunca toplanan tüm ETH owner cüzdanına gelir.

### 3. Likidite Ekle (1-15 Temmuz Arası)

Liquidity cüzdanındaki 250M FLZY + bir miktar ETH ile DEX'te (Uniswap v3 veya Aerodrome) FLZY/ETH havuzu oluştur. Bu işlem için Claude Code'dan destek alabilirsin.

### 4. Airdrop Katılımcılarını Kontrata Ekle

Google Sheet'te kayıtlı cüzdanları kontrata yaz:

```
npx hardhat run scripts/presale-airdrop-finalize.js --network base_mainnet
```

> Script, Sheet'ten cüzdanları çeker, 200'erli gruplar halinde kontrata yazar.

### 5. Team & Sponsor Claim (15 Temmuz 2026 Sonrası)

TeamVesting kontratı 15 Temmuz'da otomatik açılır. Her beneficiary kendi cüzdanıyla siteden veya BaseScan'den `claim()` çağırır. Senin bir şey yapman gerekmez.

### 6. Airdrop Claim (30 Aralık 2026 Sonrası)

AirdropVault kontratı 30 Aralık'ta otomatik açılır. Kayıtlı kullanıcılar siteden 10.000 FLZY'lerini claim eder. Senin bir şey yapman gerekmez.

---

## Sorun Çıkarsa

Her adımda hata alırsan terminal çıktısını kopyalayıp Claude Code'a yapıştır. Hangi adımda kaldığını belirt.

**Kritik Not:** Deploy işlemi (ADIM 4) başarıyla tamamlanıp adresler alındıktan sonra kontratlar değiştirilemez. Bu yüzden deploy öncesi tüm kontrolleri yap.
