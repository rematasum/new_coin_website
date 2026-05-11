import { formatEther, parseEther } from "viem";

export function formatTokenAmount(wei: bigint, decimals = 2): string {
  const eth = parseFloat(formatEther(wei));
  if (eth >= 1_000_000_000) return `${(eth / 1_000_000_000).toFixed(decimals)}B`;
  if (eth >= 1_000_000) return `${(eth / 1_000_000).toFixed(decimals)}M`;
  if (eth >= 1_000) return `${(eth / 1_000).toFixed(decimals)}K`;
  return eth.toFixed(decimals);
}

export function formatEthAmount(wei: bigint, decimals = 4): string {
  return parseFloat(formatEther(wei)).toFixed(decimals);
}

export function formatUsdPrice(ethAmount: number, ethPriceUsd: number): string {
  return (ethAmount * ethPriceUsd).toFixed(2);
}

export function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return "Ended";
  const d = Math.floor(secondsLeft / 86400);
  const h = Math.floor((secondsLeft % 86400) / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m ${s}s`;
}

export function calcTokensFromEth(ethWei: bigint, priceWei: bigint): bigint {
  if (priceWei === 0n) return 0n;
  return (ethWei * parseEther("1")) / priceWei;
}

/**
 * Returns the next N unlock dates starting from vestingStart (Unix seconds),
 * each 30 days apart, formatted as "15 Jun 2025".
 */
export function formatMonthlyVestingDates(vestingStartSec: bigint, count = 3): string[] {
  if (!vestingStartSec || vestingStartSec === 0n) return [];
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    const ts = Number(vestingStartSec) + i * 30 * 86400;
    results.push(new Date(ts * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }));
  }
  return results;
}
