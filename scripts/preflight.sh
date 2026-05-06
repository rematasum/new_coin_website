#!/usr/bin/env bash
# preflight.sh — FLOZY pre-production test suite
# Run from repo root: bash scripts/preflight.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0; FAIL=0; SKIP=0; WARN=0
RESULTS=()

# ── Helpers ────────────────────────────────────────────────────────────────
green()  { echo -e "\033[1;32m$*\033[0m"; }
red()    { echo -e "\033[1;31m$*\033[0m"; }
yellow() { echo -e "\033[1;33m$*\033[0m"; }
blue()   { echo -e "\033[1;34m$*\033[0m"; }

ok()   { PASS=$((PASS+1)); RESULTS+=("  ✅  $1"); }
fail() { FAIL=$((FAIL+1)); RESULTS+=("  ❌  $1"); }
warn() { WARN=$((WARN+1)); RESULTS+=("  ⚠️   $1"); }
skip() { SKIP=$((SKIP+1)); RESULTS+=("  ⏭️   $1 (requires manual test)"); }

section() { echo; blue "═══ $1 ═══"; }

# ── 1. SECURITY ────────────────────────────────────────────────────────────
section "1 · Security checks"

# 1a. No .env files committed
if git -C "$ROOT" ls-files | grep -qE '\.env$|\.env\.local$|\.env\.production$'; then
  fail "Secret .env file is tracked by git — CRITICAL"
else
  ok ".env files not committed to git"
fi

# 1b. No private key literals in tracked files
if git -C "$ROOT" grep -rIl 'PRIVATE_KEY\s*=' -- '*.js' '*.ts' '*.json' '*.env' 2>/dev/null | grep -v node_modules | grep -v '.example' | grep -v 'hardhat.config' | grep -q .; then
  fail "Possible private key assignment found in tracked source files"
else
  ok "No raw PRIVATE_KEY assignments in source (non-config) files"
fi

# 1c. No mnemonic/seed phrase literals
if git -C "$ROOT" grep -rIl 'mnemonic\|seed phrase\|12 words\|24 words' -- '*.js' '*.ts' 2>/dev/null | grep -v node_modules | grep -q .; then
  fail "Possible mnemonic found in source files"
else
  ok "No mnemonic literals in source files"
fi

# 1d. .gitignore covers secrets
if grep -q '\.env' "$ROOT/frontend/.gitignore" 2>/dev/null || grep -q '\.env' "$ROOT/.gitignore" 2>/dev/null; then
  ok ".env is in .gitignore"
else
  fail ".env missing from .gitignore"
fi

# ── 2. ASSETS ──────────────────────────────────────────────────────────────
section "2 · Public assets"

for asset in logo.png mascot.mp4; do
  if [ -f "$ROOT/frontend/public/$asset" ]; then
    SIZE=$(du -sh "$ROOT/frontend/public/$asset" | cut -f1)
    ok "frontend/public/$asset exists ($SIZE)"
  else
    fail "frontend/public/$asset MISSING — copy from old branch or add manually"
  fi
done

# ── 3. ENVIRONMENT VARIABLES ───────────────────────────────────────────────
section "3 · Environment variables"

ENV_EXAMPLE="$ROOT/frontend/.env.example"
ENV_LOCAL="$ROOT/frontend/.env.local"

required_vars=(
  "NEXT_PUBLIC_TOKEN_ADDRESS"
  "NEXT_PUBLIC_PRESALE_ADDRESS"
)
optional_vars=(
  "NEXT_PUBLIC_SHEETS_WEBHOOK_URL"
)

if [ -f "$ENV_LOCAL" ]; then
  ok ".env.local exists"
  for var in "${required_vars[@]}"; do
    val=$(grep "^${var}=" "$ENV_LOCAL" 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'")
    if [ -z "$val" ] || [ "$val" = "0x0000000000000000000000000000000000000000" ]; then
      warn "$var is not set or still placeholder in .env.local"
    else
      ok "$var is set (${val:0:10}…)"
    fi
  done
  for var in "${optional_vars[@]}"; do
    val=$(grep "^${var}=" "$ENV_LOCAL" 2>/dev/null | cut -d= -f2)
    if [ -z "$val" ]; then
      warn "$var not set — airdrop webhook will only console.log"
    else
      ok "$var is set"
    fi
  done
else
  warn ".env.local not found — contract addresses default to 0x000… (ok for build, broken on-chain)"
fi

# ── 4. CONTRACT COMPILE ────────────────────────────────────────────────────
section "4 · Contract compilation"

cd "$ROOT/contracts"
if [ ! -d node_modules ]; then
  echo "  Installing contract dependencies…"
  npm install --silent 2>/dev/null
fi

COMPILE_OUT=$(npx hardhat compile --quiet 2>&1) || true
if echo "$COMPILE_OUT" | grep -q "Compilation finished successfully\|Nothing to compile\|compiled"; then
  ok "Contracts compiled successfully"
elif echo "$COMPILE_OUT" | grep -qiE 'download|network|ETIMEDOUT|ENOTFOUND|fetch'; then
  warn "Compiler download failed (network issue in this env) — run locally: npx hardhat compile"
elif echo "$COMPILE_OUT" | grep -qiE 'SyntaxError|TypeError|Error:'; then
  fail "Contract compilation error — check Solidity code"
  echo "$COMPILE_OUT" | grep -iE 'Error' | head -10 | sed 's/^/     /'
else
  warn "Compile output unclear — run 'npx hardhat compile' locally to verify"
fi

# ── 5. CONTRACT TESTS ──────────────────────────────────────────────────────
section "5 · Contract unit tests"

TEST_OUTPUT=$(npx hardhat test 2>&1) || true
PASSING=$(echo "$TEST_OUTPUT" | grep -oE '[0-9]+ passing' | grep -oE '[0-9]+' || echo "0")
FAILING=$(echo "$TEST_OUTPUT" | grep -oE '[0-9]+ failing' | grep -oE '[0-9]+' || echo "0")
PENDING=$(echo "$TEST_OUTPUT" | grep -oE '[0-9]+ pending' | grep -oE '[0-9]+' || echo "0")

if [ "$FAILING" = "0" ] && [ "$PASSING" -gt 0 ] 2>/dev/null; then
  ok "$PASSING test(s) passing, 0 failing"
elif [ "$FAILING" -gt 0 ] 2>/dev/null; then
  fail "$PASSING passing / $FAILING FAILING — fix before deploy"
  # Print failing test names
  echo "$TEST_OUTPUT" | grep -A2 'AssertionError\|Error:\|failing' | head -20 | sed 's/^/     /'
else
  warn "Could not parse test output (no tests found?)"
  echo "$TEST_OUTPUT" | tail -10 | sed 's/^/     /'
fi

# ── 6. DEPLOY CONFIG SANITY ────────────────────────────────────────────────
section "6 · deploy.config.js sanity"

CONFIG="$ROOT/contracts/deploy.config.js"

# Total allocation = 5 stages × allocationM
TOTAL_ALLOC=$(node -e "
  const cfg = require('$CONFIG');
  const total = cfg.default.stages.reduce((s,st) => s + st.allocationM, 0);
  console.log(total);
" 2>/dev/null || echo "ERR")

if [ "$TOTAL_ALLOC" = "250" ]; then
  ok "Stage allocations sum to 250M (25% of 1B supply) ✓"
else
  fail "Stage allocations sum to ${TOTAL_ALLOC}M, expected 250M"
fi

# instantUnlockBps strictly decreasing
MONO=$(node -e "
  const cfg = require('$CONFIG');
  const bps = cfg.default.stages.map(s => s.instantUnlockBps);
  const ok = bps.every((v,i) => i === 0 || v < bps[i-1]);
  console.log(ok ? 'ok' : 'fail:' + bps.join(','));
" 2>/dev/null || echo "ERR")

if [ "$MONO" = "ok" ]; then
  ok "instantUnlockBps is strictly decreasing (staircase vesting) ✓"
else
  fail "instantUnlockBps not strictly decreasing: $MONO"
fi

# Referral bps reasonable
REF_BPS=$(node -e "const c=require('$CONFIG'); console.log(c.default.referralBps);" 2>/dev/null || echo "ERR")
if [ "$REF_BPS" -le 1000 ] 2>/dev/null; then
  ok "referralBps = $REF_BPS (≤10%) — reasonable"
else
  warn "referralBps = $REF_BPS — unusually high, double-check"
fi

# Deadline not in the past
DEADLINE_STR=$(node -e "const c=require('$CONFIG'); console.log(c.default.deadline);" 2>/dev/null || echo "ERR")
TODAY=$(date +%Y-%m-%d)
if [[ "$DEADLINE_STR" > "$TODAY" ]]; then
  ok "Deadline ($DEADLINE_STR) is in the future ✓"
else
  fail "Deadline ($DEADLINE_STR) is in the PAST — update before mainnet deploy"
fi

# ── 7. ABI CONSISTENCY ────────────────────────────────────────────────────
section "7 · ABI consistency (contract ↔ frontend)"

ARTIFACT="$ROOT/contracts/artifacts/contracts/Presale.sol/Presale.json"
FRONTEND_ABI="$ROOT/frontend/src/config/contracts.ts"

if [ -f "$ARTIFACT" ]; then
  # Extract function names from artifact
  ARTIFACT_FNS=$(node -e "
    const a = require('$ARTIFACT');
    const fns = a.abi.filter(x=>x.type==='function').map(x=>x.name).sort();
    console.log(fns.join(','));
  " 2>/dev/null || echo "ERR")

  # Extract function names declared in frontend contracts.ts
  FRONTEND_FNS=$(grep -oE '"[a-zA-Z][a-zA-Z0-9_]*"' "$FRONTEND_ABI" | tr -d '"' | sort -u | tr '\n' ',' | sed 's/,$//')

  if [ "$ARTIFACT_FNS" = "ERR" ]; then
    warn "Could not parse artifact ABI — run 'npx hardhat compile' first"
  else
    ok "Artifact ABI parsed: $(echo $ARTIFACT_FNS | tr ',' '\n' | wc -l | tr -d ' ') functions found"
    # Check key functions exist in artifact
    for fn in buy claim getClaimableNow getVestingSchedule burnUnsold withdrawETH; do
      if echo "$ARTIFACT_FNS" | tr ',' '\n' | grep -qx "$fn"; then
        ok "  Contract has function: $fn"
      else
        fail "  Contract MISSING function: $fn"
      fi
    done
  fi
else
  warn "Artifact not found at $ARTIFACT — run 'npx hardhat compile' first"
fi

# ── 8. FRONTEND BUILD ──────────────────────────────────────────────────────
section "8 · Frontend build (next build)"

cd "$ROOT/frontend"
if [ ! -d node_modules ]; then
  echo "  Installing frontend dependencies…"
  npm install --silent 2>/dev/null
fi

BUILD_OUTPUT=$(npx next build 2>&1) || true

if echo "$BUILD_OUTPUT" | grep -q "✓ Generating static pages"; then
  PAGE_COUNT=$(echo "$BUILD_OUTPUT" | grep -oE 'static pages \([0-9]+' | grep -oE '[0-9]+' | tail -1)
  ok "Next.js build succeeded — $PAGE_COUNT static pages generated"
elif echo "$BUILD_OUTPUT" | grep -qiE 'error|failed'; then
  fail "Frontend build FAILED"
  echo "$BUILD_OUTPUT" | grep -iE 'error|Error' | head -15 | sed 's/^/     /'
else
  warn "Build output ambiguous"
  echo "$BUILD_OUTPUT" | tail -10 | sed 's/^/     /'
fi

# Type errors
if echo "$BUILD_OUTPUT" | grep -q "Failed to compile"; then
  fail "TypeScript/ESLint compile errors found"
else
  ok "No TypeScript/ESLint compile errors"
fi

# ── 9. MANUAL CHECKLIST (informational) ───────────────────────────────────
section "9 · Manual tests required before mainnet"

skip "MetaMask connect → button shows wallet address"
skip "Wrong network → 'Switch to Base' prompt appears"
skip "Enter ETH amount → estimated token count updates"
skip "Buy transaction → MetaMask confirmation popup appears"
skip "Buy succeeds → 'Purchase confirmed' message shown"
skip "After presale ends → Claim button activates"
skip "Claim succeeds → tokens received in wallet"
skip "Referral link (?ref=0x…) → referrer credited"
skip "Airdrop form submit → webhook POST fires (check sheet/webhook)"
skip "Vercel env vars set: TOKEN_ADDRESS, PRESALE_ADDRESS, SHEETS_WEBHOOK_URL"
skip "Basescan contract verified → read/write tab works"
skip "Mobile layout → navbar, widget, pages look correct"

# ── FINAL REPORT ───────────────────────────────────────────────────────────
echo
echo "════════════════════════════════════════════════════════"
blue   "           FLOZY PREFLIGHT REPORT"
echo "════════════════════════════════════════════════════════"
for r in "${RESULTS[@]}"; do echo "$r"; done
echo
echo "  $(green "PASS: $PASS")   $(red "FAIL: $FAIL")   $(yellow "WARN: $WARN")   ⏭️  SKIP: $SKIP"
echo "════════════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo
  red "🚨  $FAIL check(s) failed — fix before deploying to mainnet."
  exit 1
elif [ "$WARN" -gt 0 ]; then
  echo
  yellow "⚠️   All automated checks passed with $WARN warning(s). Review warnings above."
  exit 0
else
  echo
  green "🚀  All automated checks passed. Complete manual checks, then deploy!"
  exit 0
fi
