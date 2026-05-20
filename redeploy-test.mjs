/**
 * redeploy-test.mjs
 *
 * Deploys fresh contracts to Base Sepolia and updates frontend/.env.local automatically.
 * Eliminates the manual copy-paste of contract addresses between test runs.
 *
 * Usage:
 *   node redeploy-test.mjs               # deploy + update .env.local
 *   node redeploy-test.mjs --with-vesting # also run start-vesting.js
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const withVesting = process.argv.includes("--with-vesting");

const CONTRACTS_DIR = resolve(__dirname, "contracts");
const DEPLOY_JSON   = resolve(CONTRACTS_DIR, "deployments/base_sepolia.json");
const ENV_FILE      = resolve(__dirname, "frontend/.env.local");

if (!existsSync(ENV_FILE)) {
  console.error("✗ frontend/.env.local not found. Create it first.");
  process.exit(1);
}

// 1. Deploy
console.log("🚀 Deploying contracts to Base Sepolia...\n");
execSync("npx hardhat run scripts/deploy.js --network base_sepolia", {
  cwd: CONTRACTS_DIR,
  stdio: "inherit",
});

// 2. Read deployment result
const dep = JSON.parse(readFileSync(DEPLOY_JSON, "utf8"));

// 3. Update .env.local — replace existing lines, or append if missing
const replacements = {
  NEXT_PUBLIC_TOKEN_ADDRESS:         dep.tokenAddress,
  NEXT_PUBLIC_PRESALE_ADDRESS:       dep.presaleAddress,
  NEXT_PUBLIC_TEAM_VESTING_ADDRESS:  dep.teamVestingAddress,
  NEXT_PUBLIC_AIRDROP_VAULT_ADDRESS: dep.airdropVaultAddress,
};

let env = readFileSync(ENV_FILE, "utf8");
for (const [key, val] of Object.entries(replacements)) {
  if (new RegExp(`^${key}=`, "m").test(env)) {
    env = env.replace(new RegExp(`^${key}=.*`, "m"), `${key}=${val}`);
  } else {
    env += `\n${key}=${val}`;
  }
}
writeFileSync(ENV_FILE, env);
console.log("\n✅ frontend/.env.local updated");

// 4. Optional: start team vesting
if (withVesting) {
  console.log("\n⏳ Starting team vesting...");
  try {
    execSync("npx hardhat run scripts/start-vesting.js --network base_sepolia", {
      cwd: CONTRACTS_DIR,
      stdio: "inherit",
    });
  } catch (err) {
    // Windows: Hardhat exits with non-zero code after successful execution due to
    // async handle cleanup (UV_HANDLE_CLOSING). Tx is already confirmed on-chain.
    if (err.status !== 3221226505) throw err;
  }
  console.log("✅ Vesting started");
}

// 5. Summary
console.log("\n🎉 Done! New contract addresses:");
console.log("  Token:       ", dep.tokenAddress);
console.log("  Presale:     ", dep.presaleAddress);
console.log("  TeamVesting: ", dep.teamVestingAddress);
console.log("  Airdrop:     ", dep.airdropVaultAddress);
console.log("\n➡  Restart your frontend dev server to pick up the new addresses.");
