/**
 * presale-airdrop-finalize.js
 *
 * Post-presale airdrop finalization — runs after presale ends.
 *
 * KULLANIM:
 *   1. Google Sheet'te takip etmeyenlerin satırlarını sil (manuel eleme)
 *   2. Şu komutu çalıştır:
 *        npx hardhat run scripts/presale-airdrop-finalize.js --network base_mainnet
 *
 * Script otomatik olarak:
 *   - Google Sheet'ten cüzdan listesini çeker (Apps Script doGet)
 *   - Geçersiz adresleri filtreler
 *   - Zaten eklenmiş olanları atlar (tekrar çalıştırılabilir)
 *   - Kontrat kapasitesini kontrol eder (max 10,000)
 *   - 200'lü batch'ler halinde addAirdropParticipants() çağırır
 */

import hre from "hardhat";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BATCH_SIZE = 200;

// Apps Script URL — doGet() endpoint (same URL as doPost, GET method)
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbwRgt3FYXSiSFRxOVKpPTc6UsV-qtvI8bt_KAW32w6rBj5Kb14yWyTT3WZiD4hxF9UFyQ/exec";

async function fetchWalletsFromSheet() {
  process.stdout.write("Google Sheet'ten liste çekiliyor... ");
  const res = await fetch(SHEETS_URL, { method: "GET", redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const json = await res.json();
  if (!Array.isArray(json.wallets)) throw new Error("Beklenmedik format: 'wallets' dizisi yok");
  console.log(`${json.wallets.length} kayıt bulundu.`);
  return json.wallets;
}

async function main() {
  const network = hre.network.name;
  const deployFile = network === "localhost"
    ? resolve(__dirname, "../deployments/localhost.json")
    : resolve(__dirname, `../deployments/${network}.json`);

  const d = JSON.parse(readFileSync(deployFile, "utf8"));
  const [owner] = await hre.ethers.getSigners();

  const vault = await hre.ethers.getContractAt("AirdropVault", d.airdropVaultAddress);
  const AMOUNT = await vault.AMOUNT_PER_WALLET();
  const MAX    = await vault.MAX_PARTICIPANTS();
  const currentCount = await vault.participantCount();

  console.log("════════════════════════════════════════");
  console.log("  PRESALE AIRDROP FİNALİZASYONU");
  console.log("════════════════════════════════════════");
  console.log(`Network          : ${network}`);
  console.log(`AirdropVault     : ${d.airdropVaultAddress}`);
  console.log(`Owner            : ${owner.address}`);
  console.log(`AMOUNT_PER_WALLET: ${hre.ethers.formatEther(AMOUNT)} FLZY`);
  console.log(`MAX_PARTICIPANTS : ${MAX}`);
  console.log(`Mevcut kayıt     : ${currentCount}`);
  console.log("");

  // Sheet'ten çek
  const rawWallets = await fetchWalletsFromSheet();

  // Geçerli adres filtresi
  const validWallets = rawWallets.filter(w => /^0x[0-9a-fA-F]{40}$/.test(w));
  const invalidCount = rawWallets.length - validWallets.length;
  if (invalidCount > 0) console.log(`⚠️  Geçersiz/boş adres atlandı: ${invalidCount}`);

  // Tekrarlı adresleri kaldır
  const unique = [...new Set(validWallets.map(w => w.toLowerCase()))].map(w =>
    hre.ethers.getAddress(w)
  );
  if (unique.length < validWallets.length) {
    console.log(`⚠️  Duplicate adres atlandı: ${validWallets.length - unique.length}`);
  }

  // Zaten kontrata eklenmiş olanları çıkar
  process.stdout.write("Kontrat duplicate kontrolü yapılıyor... ");
  const toAdd = [];
  for (const addr of unique) {
    const alloc = await vault.allocations(addr);
    if (alloc.totalAmount === 0n) toAdd.push(addr);
  }
  const alreadyAdded = unique.length - toAdd.length;
  console.log("tamam.");
  if (alreadyAdded > 0) console.log(`ℹ️  Zaten eklenmiş (atlanıyor): ${alreadyAdded}`);
  console.log(`Eklenecek yeni adres  : ${toAdd.length}`);
  console.log("");

  if (toAdd.length === 0) {
    console.log("✅ Eklenecek yeni adres yok. İşlem tamamlandı.");
    return;
  }

  // Kapasite kontrolü
  const remaining = Number(MAX) - Number(currentCount);
  if (toAdd.length > remaining) {
    console.error(`❌ Kapasite aşımı: ${toAdd.length} eklemek isteniyor ama sadece ${remaining} slot kaldı.`);
    process.exit(1);
  }

  // Batch gönder
  const batchCount = Math.ceil(toAdd.length / BATCH_SIZE);
  console.log(`Batch sayısı: ${batchCount} (her batch max ${BATCH_SIZE} adres)`);
  console.log("");

  let totalAdded = 0;
  for (let i = 0; i < toAdd.length; i += BATCH_SIZE) {
    const batch = toAdd.slice(i, i + BATCH_SIZE);
    const amounts = Array(batch.length).fill(AMOUNT);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`Batch ${batchNum}/${batchCount}: ${batch.length} adres gönderiliyor... `);
    const tx = await vault.connect(owner).addAirdropParticipants(batch, amounts);
    await tx.wait();
    totalAdded += batch.length;
    console.log("✓");
  }

  console.log("");
  console.log("════════════════════════════════════════");
  console.log("✅ TAMAMLANDI");
  console.log(`   Eklenen       : ${totalAdded} cüzdan`);
  console.log(`   Toplam kayıt  : ${await vault.participantCount()}`);
  console.log(`   Toplam FLZY   : ${hre.ethers.formatEther(await vault.totalAllocated())} FLZY`);
  console.log("════════════════════════════════════════");
}

main().catch((e) => { console.error(e); process.exit(1); });
