import hre from "hardhat";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const d = JSON.parse(readFileSync(resolve(__dirname, "../deployments/localhost.json"), "utf8"));
  const [owner, user1, user2] = await hre.ethers.getSigners();

  const vault = await hre.ethers.getContractAt("AirdropVault", d.airdropVaultAddress);
  const AMOUNT = await vault.AMOUNT_PER_WALLET();
  const MAX   = await vault.MAX_PARTICIPANTS();

  console.log(`AMOUNT_PER_WALLET : ${hre.ethers.formatEther(AMOUNT)} FLZY`);
  console.log(`MAX_PARTICIPANTS  : ${MAX}`);
  console.log(`participantCount  : ${await vault.participantCount()}`);
  console.log("");

  // ── M5: Yanlış miktar — 20.000 FLZY ─────────────────────────────────────
  try {
    await vault.connect(owner).addAirdropParticipants(
      [user2.address],
      [hre.ethers.parseEther("20000")]
    );
    console.log("❌ M5 FAILED — 20.000 FLZY kabul edildi (beklenmeyen!)");
  } catch (e) {
    const msg = e.message.includes("Must be exactly 10000 FLZY");
    console.log(`✅ M5 PASS — 20.000 FLZY reddedildi: "${msg ? "Must be exactly 10000 FLZY" : e.message.slice(0,80)}"`);
  }

  // ── M5b: Yanlış miktar — 1 FLZY ─────────────────────────────────────────
  try {
    await vault.connect(owner).addAirdropParticipants(
      [user2.address],
      [hre.ethers.parseEther("1")]
    );
    console.log("❌ M5b FAILED — 1 FLZY kabul edildi (beklenmeyen!)");
  } catch (e) {
    const msg = e.message.includes("Must be exactly 10000 FLZY");
    console.log(`✅ M5b PASS — 1 FLZY reddedildi: "${msg ? "Must be exactly 10000 FLZY" : e.message.slice(0,80)}"`);
  }

  // ── M6a: Duplicate adres ─────────────────────────────────────────────────
  // user1 zaten eklendi (add-airdrop-user.js'den), tekrar eklemeyi dene
  try {
    await vault.connect(owner).addAirdropParticipants([user1.address], [AMOUNT]);
    console.log("❌ M6a FAILED — duplicate kabul edildi (beklenmeyen!)");
  } catch (e) {
    const msg = e.message.includes("Already added");
    console.log(`✅ M6a PASS — duplicate reddedildi: "${msg ? "Already added" : e.message.slice(0,80)}"`);
  }

  // ── M6b: Kapasite aşımı — 10.001. kişi ──────────────────────────────────
  // Şu an count=1, max=10000. 10000 adet sahte adres gönder → aşım olur
  const fakeAddrs = Array.from({ length: 10000 }, (_, i) =>
    hre.ethers.getAddress("0x" + (i + 1000).toString(16).padStart(40, "0"))
  );
  try {
    await vault.connect(owner).addAirdropParticipants(fakeAddrs, Array(10000).fill(AMOUNT));
    console.log("❌ M6b FAILED — kapasite aşımı kabul edildi (beklenmeyen!)");
  } catch (e) {
    const msg = e.message.includes("Participant cap reached");
    console.log(`✅ M6b PASS — kapasite aşımı reddedildi: "${msg ? "Participant cap reached" : e.message.slice(0,80)}"`);
  }

  console.log("");
  console.log(`participantCount sonrası: ${await vault.participantCount()} (değişmedi)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
