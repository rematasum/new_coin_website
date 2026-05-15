# FLOZY ($FLZY) — Sistem Dokümantasyonu

> Base Network üzerinde çalışan aşamalı kripto presale platformunun tam teknik ve işlevsel açıklaması.

---

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Monorepo Yapısı](#monorepo-yapısı)
3. [Akıllı Kontratlar](#akıllı-kontratlar)
   - [Token.sol](#tokensol)
   - [Presale.sol](#presalesol)
   - [Vesting Mekanizması](#vesting-mekanizması)
   - [Referral Sistemi](#referral-sistemi)
   - [Owner Fonksiyonları](#owner-fonksiyonları)
4. [Deploy Süreci](#deploy-süreci)
5. [Frontend Mimarisi](#frontend-mimarisi)
   - [Sayfa Yapısı](#sayfa-yapısı)
   - [Bileşenler](#bileşenler)
   - [Blockchain Bağlantısı (wagmi)](#blockchain-bağlantısı-wagmi)
   - [Veri Akışı](#veri-akışı)
6. [Kullanıcı Akışları](#kullanıcı-akışları)
7. [Airdrop Sistemi](#airdrop-sistemi)
8. [Ağ Konfigürasyonu](#ağ-konfigürasyonu)
9. [Ortam Değişkenleri](#ortam-değişkenleri)
10. [Güvenlik Notları](#güvenlik-notları)

---

## Genel Bakış

FLOZY, Base (Ethereum Layer 2) üzerinde deploy edilmiş bir token presale platformudur. Kullanıcılar MetaMask ile bağlanır ve ETH göndererek $FLZY token satın alır. Sistem şu özelliklere sahiptir:

- **5 aşamalı presale:** Her aşamada fiyat artar, erken alıcılar daha fazla avantaj kazanır.
- **Anında kısmi kilit açma:** Satın alınan aşamaya göre presale bitiminde %5–%25 anında açılır.
- **24 aylık doğrusal vesting:** Kalan tokenlar presale bitiminden itibaren 730 gün boyunca saniye saniye açılır.
- **Referral sistemi:** Her alımda referans adresi belirtilebilir; referans veren kişi bonus token kazanır.
- **Otomatik yakma:** Satılmayan tokenlar owner tarafından `address(0xdead)` adresine transfer edilerek yakılır.
- **Deadline + sell-out:** Presale, belirlenen son tarih VEYA tüm tokenlar satıldığında sona erer.

---

## Monorepo Yapısı

```
new_coin_website/
├── contracts/               # Hardhat projesi (Solidity)
│   ├── contracts/
│   │   ├── Token.sol        # ERC-20 token kontratı
│   │   └── Presale.sol      # Presale + vesting kontratı
│   ├── scripts/
│   │   └── deploy.js        # Deploy scripti
│   ├── test/
│   │   └── Presale.test.js  # Test dosyası
│   ├── deploy.config.js     # Deploy parametreleri (fiyatlar, aşamalar vb.)
│   ├── hardhat.config.js    # Hardhat konfigürasyonu
│   └── deployments/
│       └── base_sepolia.json  # Deploy sonrası kaydedilen adresler
│
└── frontend/                # Next.js uygulaması
    └── src/
        ├── app/             # Next.js App Router sayfaları
        │   ├── layout.tsx   # Global layout (Navbar, MarqueeText, Providers)
        │   ├── page.tsx     # Ana sayfa (Hero + Presale Widget)
        │   ├── tokenomics/  # Token dağılımı sayfası
        │   ├── vesting/     # Vesting bilgi sayfası
        │   └── airdrop/     # Ücretsiz airdrop kayıt sayfası
        ├── components/      # UI bileşenleri
        ├── config/
        │   ├── contracts.ts # ABI, adresler, stage konfigürasyonu
        │   └── wagmi.ts     # wagmi + chain konfigürasyonu
        └── lib/
            ├── providers.tsx  # WagmiProvider + QueryClientProvider sarmalayıcı
            └── format.ts      # Sayı/süre formatlama yardımcıları
```

---

## Akıllı Kontratlar

### Token.sol

Standart bir OpenZeppelin ERC-20 token kontratıdır. Tüm arz deploy anında deployer adresine mint edilir. Özel bir mantık içermez.

```
Toplam Arz: 1,000,000,000 $FLZY (1 milyar)
```

**Deploy sonrası manuel adımlar:**
1. Deployer, 250,000,000 FLZY'yi Presale kontratına transfer eder.
2. Presale sonunda satılmayan tokenlar yakılır.
3. Kalan 750M token dağıtım planına göre yönetilir (Team, Airdrop, CEX/DEX Liquidity).

---

### Presale.sol

Platformun ana kontratı. OpenZeppelin `Ownable` ve `ReentrancyGuard` devralır.

#### Veri Yapıları

```solidity
struct Stage {
    uint256 tokenPrice;       // 1 tam tokenın ETH fiyatı (wei cinsinden, 1e18 ölçekli)
    uint256 tokenAllocation;  // Bu aşamadaki toplam token sayısı (18 desimal)
    uint256 tokensSold;       // Şimdiye kadar satılan token sayısı
    uint256 instantUnlockBps; // Presale bitiminde anında açılan oran (baz puan, 2500 = %25)
}

struct VestingRecord {
    uint256 totalAmount;  // Bu aşamada satın alınan toplam token
    uint256 claimed;      // Bu aşamadan şimdiye kadar çekilen token
}
```

#### State Değişkenleri

| Değişken | Tip | Açıklama |
|---|---|---|
| `token` | `IERC20` | $FLZY token kontrat adresi |
| `stages[]` | `Stage[]` | Tüm aşama verileri |
| `currentStage` | `uint256` | Aktif aşama indeksi (0'dan başlar) |
| `deadline` | `uint256` | Unix timestamp — son katılım zamanı |
| `presaleActive` | `bool` | Owner tarafından durdurulabilir |
| `presaleEnded` | `bool` | Presale bittiğinde `true` olur |
| `presaleEndTime` | `uint256` | Vesting saatinin başladığı an |
| `referralBonusBps` | `uint256` | Referral bonus oranı (baz puan) |
| `vestingRecords` | `mapping(address => mapping(uint256 => VestingRecord))` | Kullanıcı × aşama vesting kayıtları |
| `totalTokensSold` | `uint256` | Tüm aşamalarda satılan toplam token |
| `totalEthRaised` | `uint256` | Toplam toplanan ETH |

---

### `buy()` Fonksiyonu — Satın Alma Akışı

```
Kullanıcı ETH gönderir → buy(referrer) çağrılır
```

1. **`whenActive` modifier** kontrol edilir: Presale aktif mi, bitmedi mi, deadline geçmedi mi?
2. Gelen ETH (`msg.value`) `remaining` değişkenine atanır.
3. **While döngüsü** — ETH bitene veya tüm aşamalar tükenene kadar çalışır:
   - Mevcut aşamada kalan token hesaplanır.
   - Kalan ETH ile kaç token alınabileceği hesaplanır: `tokensToBuy = (remaining × 1e18) / tokenPrice`
   - Eğer o aşama tamamen doluysa **otomatik olarak sonraki aşamaya geçilir** — `_advanceStage()`.
   - Kullanıcının vesting kaydına (`vestingRecords[msg.sender][stageIdx]`) token miktarı eklenir.
4. **ETH tozu iadesi:** Kullanılmayan ETH (tam bölünmez kalıntı) kullanıcıya geri gönderilir.
5. `totalTokensSold` ve `totalEthRaised` güncellenir.
6. **Referral:** Referrer varsa, alınan tokenların `referralBonusBps/10000` oranı referrer'ın vesting kaydına eklenir.
7. Eğer tüm aşamalar bittiyse `_endPresale()` tetiklenir.

> **Önemli:** Satın alma sırasında token transferi yapılmaz. Tokenlar yalnızca `vestingRecords` mapping'inde kayıt altına alınır. Gerçek transfer yalnızca `claim()` çağrıldığında gerçekleşir.

---

### `claim()` Fonksiyonu — Token Çekme

```
Kullanıcı claim() çağırır → Hak kazanılmış tokenlar cüzdana transfer edilir
```

1. Presale sona ermiş olmalı (`_isEnded()` = true).
2. Tüm aşamalar döngüyle taranır.
3. Her aşama için `_calculateUnlockable()` çağrılır:
   - **Anında açılacak miktar:** `total × instantBps / 10000`
   - **Zaman bazlı vesting:** `(vestingAmount × geçenSaniye) / 730gün`
   - Toplam = anında + zaman bazlı vested miktar
4. `record.claimed`'ten fazlası varsa fark çekilebilir.
5. `token.transfer(msg.sender, totalClaimable)` ile tokenlar gönderilir.

`claim()` birden fazla kez çağrılabilir — her seferinde o ana kadar birikmiş ek miktar çekilir.

---

### Vesting Mekanizması

Her presale aşamasının kendi anında açılma oranı vardır. Presale bittiğinde:

| Aşama | Fiyat (ETH/token) | Anında Açılan | 24 Ayda Vesting |
|-------|-------------------|---------------|-----------------|
| Stage 1 | 0.000002 | %25 | %75 |
| Stage 2 | 0.0000022 | %20 | %80 |
| Stage 3 | 0.0000025 | %15 | %85 |
| Stage 4 | 0.000003  | %10 | %90 |
| Stage 5 | 0.000004  | %5  | %95 |

**Vesting hesaplama formülü (`_calculateUnlockable`):**

```
instantAmount = total × instantBps / 10000
vestingAmount = total - instantAmount

eğer şimdiki zaman ≤ presaleEndTime:
    unlockable = instantAmount

eğer şimdiki zaman ≥ presaleEndTime + 730 gün:
    unlockable = total (tümü açık)

aksi halde:
    elapsed = şimdiki zaman - presaleEndTime
    vested  = vestingAmount × elapsed / 730 gün
    unlockable = instantAmount + vested
```

Vesting süresi saniye bazlıdır — her saniye küçük bir miktar daha açılır.

---

### Referral Sistemi

- Kullanıcı `buy(referrerAddress)` çağırırken referans adresi belirtir.
- Referrer kendi kendine referans veremez.
- Bonus = `satın alınan token × referralBonusBps / 10000`
- Bonus, alımın yapıldığı aşamanın vesting kurallarıyla referrer'ın hesabına eklenir.
- Bonus için ekstra token basılmaz — kontratın mevcut token bakiyesinden karşılanır.
- Mevcut deploy konfigürasyonunda: **%5 referral bonusu** (`referralBps: 500`).

---

### Owner Fonksiyonları

| Fonksiyon | Açıklama |
|---|---|
| `endPresale()` | Presale'i manuel olarak sonlandırır |
| `toggleActive(bool)` | Presale'i geçici olarak durdurur/başlatır |
| `updateDeadline(uint256)` | Deadline'ı uzatır (geçmişe alamaz) |
| `updateReferralBonus(uint256)` | Referral oranını değiştirir (max %20) |
| `burnUnsold()` | Satılmayan tokenları `0xdead` adresine gönderir |
| `withdrawETH(address)` | Toplanan ETH'i belirtilen adrese çeker |

---

## Deploy Süreci

### 1. Konfigürasyon (`deploy.config.js`)

Deploy öncesi bu dosya düzenlenir — değerler zincire yazıldıktan sonra değiştirilemez:
- Token adı, sembolü, toplam arz
- Presale bitiş tarihi (deadline)
- Referral bonus oranı
- 5 aşamanın fiyat ve tahsisi

### 2. Deploy Scripti (`scripts/deploy.js`)

```bash
npx hardhat run scripts/deploy.js --network base_sepolia   # testnet
npx hardhat run scripts/deploy.js --network base_mainnet   # mainnet
```

Script sırasıyla şunları yapar:
1. `Token` kontratı deploy edilir (tüm arz deployer'a mint edilir).
2. `Presale` kontratı deploy edilir (Token adresi + tüm parametreler).
3. 250,000,000 FLZY token Presale kontratına transfer edilir.
4. Deploy bilgileri `deployments/<network>.json` dosyasına kaydedilir.
5. Frontend için gereken env değişkenleri ekrana yazdırılır.

### 3. Verify

```bash
npx hardhat verify --network base_sepolia <TOKEN_ADRESI> "Flozy" "FLZY" <ARZ> <DEPLOYER>
npx hardhat verify --network base_sepolia <PRESALE_ADRESI> <TOKEN> <DEADLINE> <REFERRAL_BPS> [...]
```

---

## Frontend Mimarisi

### Sayfa Yapısı

```
/ (Ana sayfa)
├── MarqueeText (sabit şerit — "PRESALE LIVE...")
├── Navbar (sabit üst bar)
│   ├── Logo
│   ├── Navigasyon linkleri
│   └── WalletButton
└── HeroSection
    ├── Animasyonlu bulutlar + dekorasyon
    ├── Sol kolon: başlık, açıklama, MascotDisplay, istatistik kartları, sosyal linkler
    └── Sağ kolon: PresaleWidget (ana etkileşim noktası)

/tokenomics  — Token dağılımı (Sunucu bileşeni, statik)
/vesting     — Aşama bazlı kilit açma bilgisi (Sunucu bileşeni, statik)
/airdrop     — Airdrop kayıt formu (İstemci bileşeni)
```

### Bileşenler

#### `PresaleWidget` — Ana Etkileşim Bileşeni

Tüm on-chain durumu okur ve satın alma / claim işlemlerini yönetir.

**Okunan kontrat verileri (`useReadContracts`):**
- `currentStage` — aktif aşama indeksi
- `currentStageInfo` — aktif aşamanın fiyat, tahsis, satış, anında açılma bilgisi
- `totalTokensSold` — tüm aşamalarda satılan toplam
- `totalAllocation` — toplam presale tahsisi
- `deadline` — bitiş Unix zamanı
- `presaleActive` — aktif mi?
- `isEnded` — bitti mi?
- `totalEthRaised` — toplam ETH
- `stageCount` — aşama sayısı
- `referralBonusBps` — referral oranı
- `presaleEndTime` — vesting başlangıç zamanı

Her 10 saniyede bir otomatik yenilenir.

**UI durumları:**

```
Presale devam ediyor:
  - ETH giriş kutusu + tahmini token gösterimi
  - Cüzdan bağlı DEĞİLSE → WalletButton
  - Cüzdan bağlıysa → "BUY $FLZY NOW" butonu

Presale bitti:
  - Kullanıcının claim edebileceği token miktarı
  - Cüzdan bağlı DEĞİLSE → WalletButton
  - Cüzdan bağlıysa → "CLAIM $FLZY" butonu
```

**Referral URL desteği:**
Sayfa yüklendiğinde `?ref=0x...` parametresi okunur ve satın alma sırasında otomatik olarak kullanılır.

**Tahmin motoru:**
Kullanıcı ETH miktarı girerken `estimateTokens()` kontrat fonksiyonu çağrılır ve anlık token tahmini gösterilir. Bu hesaplama kontrat tarafında yapılır — aşama geçişleri dahil doğru hesaplanır.

---

#### `WalletButton`

wagmi hook'larıyla çalışan cüzdan bağlantı/kesme butonu.

**Durumları:**
1. Yanlış ağda → "Switch to Base" butonu (otomatik ağ değiştirme)
2. Bağlı → `0x1234...abcd` formatında kısaltılmış adres (tıklanınca disconnect)
3. Bağlı değil → "🦊 Connect Wallet" butonu (MetaMask açar)

---

#### `StageTable`

Aktif aşamanın bir öncesi ve bir sonrasıyla birlikte üç aşamayı listeleyen tablo. Aktif aşama sarı vurgulu, geçmiş aşamalar soluk gösterilir. Kullanıcının mevcut konumu bağlamında görsel referans sağlar.

---

#### `VestingModal`

"View your vesting schedule" linkine tıklandığında açılan modal. Kullanıcının cüzdanına göre `getVestingSchedule()` kontrat fonksiyonu çağrılır ve aşama bazlı vesting detayları tablo halinde gösterilir.

---

#### `MascotDisplay`

MP4 video (maskot animasyonu) oynatır. Yüklenemezse `/logo.png` gösterir.

---

#### `MarqueeText`

Ekranın en üstünde sabit kayan metin bandı. Sonsuz döngüyle metin iki kez tekrarlanarak kesintisiz görünüm sağlanır.

---

### Blockchain Bağlantısı (wagmi)

**Konfigürasyon (`config/wagmi.ts`):**

```typescript
createConfig({
  chains: [targetChain],        // Base Mainnet veya Base Sepolia
  connectors: [
    injected({ target: "metaMask" }),
    walletConnect({ projectId }),  // opsiyonel
  ],
  transports: { ... },
  ssr: true,  // Next.js SSR uyumluluğu için kritik
})
```

`ssr: true` ayarı, wagmi'nin cüzdan durumunu React hydration tamamlanmadan önce localStorage'dan okumasını engeller. Bu sayede sunucu ile istemcinin ilk render çıktısı eşleşir ve hydration hatası oluşmaz.

**Providers (`lib/providers.tsx`):**

Tüm uygulama `WagmiProvider` ve `QueryClientProvider` ile sarmalanmıştır. `QueryClient` state olarak tutulur, böylece her render'da yeniden oluşturulmaz.

---

### Veri Akışı

```
On-chain (Base RPC)
        ↓
  useReadContracts / useReadContract   (10-15s aralıkla polling)
        ↓
  PresaleWidget state
        ↓
  UI render (progress bar, countdown, fiyat, stage tablo)
        ↓
  Kullanıcı ETH girer
        ↓
  estimateTokens() (anlık kontrat çağrısı)
        ↓
  Kullanıcı "BUY" tıklar
        ↓
  useWriteContract → buy(referrer, { value: ethWei })
        ↓
  useWaitForTransactionReceipt → onay beklenir
        ↓
  Başarı → refetch() → UI güncellenir
```

**Birim dönüşümü:**  
Token miktarları kontrat içinde 18 desimalli (`1e18`) bigint olarak saklanır. Gösterim için `formatEther()` (viem) ile ETH birimine dönüştürülür, ardından `formatTokenAmount()` ile K/M/B formatında gösterilir.

---

## Kullanıcı Akışları

### Satın Alma

```
1. Kullanıcı siteye girer
2. "Connect Wallet" → MetaMask açılır
3. Base ağı seçili değilse "Switch to Base" uyarısı çıkar
4. Kullanıcı ETH miktarı girer → anlık token tahmini görünür
5. "BUY $FLZY NOW" tıklar → MetaMask işlem onayı ister
6. İşlem onaylanır → presale kontratında vestingRecords güncellenir
7. UI otomatik yenilenir (progress bar, ETH raised vb.)
```

### Referral

```
1. Referrer, kendi adresini içeren link paylaşır:
   https://flozy.io/?ref=0xABC...123
2. Yeni kullanıcı bu linkle siteye girer
3. PresaleWidget URL parametresini okur ve state'e kaydeder
4. Satın alma sırasında referrer adresi otomatik olarak buy() fonksiyonuna iletilir
5. Referrer, alımdan %5 bonus token kazanır (presale bitiminde claim edilebilir)
```

### Claim

```
1. Presale biter (deadline geçer veya tüm tokenlar satılır)
2. Kullanıcı siteye girer — widget "claim" moduna geçer
3. getClaimableNow() anlık claim edilebilir miktarı gösterir
4. "CLAIM $FLZY" tıklar → MetaMask onayı
5. Claim işlemi gerçekleşir — token cüzdana transfer edilir
6. İleride tekrar girerek birikmis vesting miktarlarını da claim edebilir
```

---

## Airdrop Sistemi

`/airdrop` sayfasındaki form tamamen frontend tarafındadır — kontrat ile etkileşimi yoktur.

**Çalışma prensibi:**
1. Kullanıcı X/Twitter kullanıcı adını ve Base cüzdan adresini girer.
2. Form doğrulama: geçerli Twitter formatı + `0x...` formatında Ethereum adresi kontrolü.
3. `NEXT_PUBLIC_SHEETS_WEBHOOK_URL` env değişkeni ayarlıysa, kayıt bir webhook'a POST edilir (Google Sheets veya benzeri).
4. Yoksa konsola log basılır (geliştirme ortamı).

**Vesting:** Airdrop tokenleri dağıtımdan 6 ay sonra başlayan vesting planına tabidir (kontrat dışı yönetilir).

---

## Ağ Konfigürasyonu

| Ağ | Chain ID | RPC | Kullanım |
|---|---|---|---|
| Base Mainnet | 8453 | https://mainnet.base.org | Prodüksiyon |
| Base Sepolia | 84532 | https://sepolia.base.org | Test |

Aktif ağ `NEXT_PUBLIC_CHAIN_ID` env değişkeni ile belirlenir:
- `8453` → Base Mainnet
- Diğer / boş → Base Sepolia

---

## Ortam Değişkenleri

### Frontend (`frontend/.env.local`)

| Değişken | Açıklama | Örnek |
|---|---|---|
| `NEXT_PUBLIC_TOKEN_ADDRESS` | Token kontrat adresi | `0x123...` |
| `NEXT_PUBLIC_PRESALE_ADDRESS` | Presale kontrat adresi | `0x456...` |
| `NEXT_PUBLIC_CHAIN_ID` | Hedef chain ID | `8453` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect proje ID (opsiyonel) | `abc123` |
| `NEXT_PUBLIC_SHEETS_WEBHOOK_URL` | Airdrop kayıt webhook URL (opsiyonel) | `https://...` |

### Contracts (`contracts/.env`)

| Değişken | Açıklama |
|---|---|
| `PRIVATE_KEY` | Deployer cüzdan private key (asla commit edilmez) |
| `BASESCAN_API_KEY` | Basescan verify için API anahtarı |

---

## Güvenlik Notları

### Kontrat Güvenliği

- **ReentrancyGuard:** `buy()` ve `withdrawETH()` fonksiyonları reentrancy saldırılarına karşı korunur.
- **Token transferi satın almada yapılmaz:** Saldırı yüzeyi minimize edilir — tokenlar yalnızca `claim()` çağrısında transfer edilir.
- **ETH tozu iadesi:** Tam bölünemeyen ETH kalıntısı otomatik olarak kullanıcıya iade edilir.
- **Referral limiti:** Kendi kendine referans engellidir; maksimum referral oranı %20 ile sınırlıdır.
- **Owner yetkileri sınırlı:** Deadline geçmişe alınamaz; presale bittikten sonra birçok fonksiyon kilitleniyor.
- **Burn mekanizması:** Satılmayan tokenlar `address(0)` yerine `address(0xdead)` adresine gönderilir (standart yakma adresi).

### Frontend Güvenliği

- **Sadece statik export:** Sunucu tarafında kod çalışmaz, tüm mantık on-chain'dir.
- **Tüm veriler RPC üzerinden okunur:** Backend yoktur — manipüle edilecek merkezi bir nokta yoktur.
- **Private key asla frontend'e gelmez:** Deploy için ayrı ortam, asla `NEXT_PUBLIC_` prefix'i kullanılmaz.

---

## Yardımcı Fonksiyonlar (`lib/format.ts`)

| Fonksiyon | Açıklama |
|---|---|
| `formatTokenAmount(wei)` | bigint → okunabilir (örn: `50.00M`) |
| `formatEthAmount(wei)` | bigint → `0.0042 ETH` |
| `formatCountdown(saniye)` | Geri sayım → `2d 3h 45m` veya `3h 45m 12s` |
| `calcTokensFromEth(eth, price)` | Verilen ETH için tahmini token (frontend hesabı) |

---

*Son güncelleme: 2026-05-11*
