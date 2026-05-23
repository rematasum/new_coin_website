import { createConfig, http } from "wagmi";
import { base, baseSepolia, hardhat } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

const projectId = (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "").trim();

const chainIdEnv = process.env.NEXT_PUBLIC_CHAIN_ID;
// NOTE: hardhat (31337) is for LOCAL TESTING ONLY — remove before prod build if desired.
export const targetChain =
  chainIdEnv === "8453"  ? base       :
  chainIdEnv === "31337" ? hardhat    :
                           baseSepolia;

// `injected()` (no target) → any browser-injected wallet (MetaMask extension,
// Brave wallet, Rabby, etc.). On mobile, the regular browser has no injected
// provider, so users connect via WalletConnect (QR code or deeplink).
//
// We list ALL chains the wallet might be on (not just targetChain) so wagmi
// can track chainId changes when the user switches networks in MetaMask. If
// the wallet's current chain is not in this list, wagmi reports chainId=undefined
// and we lose the "wrong network" detection. With all three chains listed,
// `isWrongChain = chainId !== targetChain.id` works correctly.
export const wagmiConfig = createConfig({
  chains: [base, baseSepolia, hardhat],
  connectors: [
    injected(),
    ...(projectId
      ? [walletConnect({
          projectId,
          showQrModal: true,
          metadata: {
            name: "FLOZY",
            description: "FLOZY ($FLZY) — Biggest Meme on Base",
            url: typeof window !== "undefined" ? window.location.origin : "https://flozy.meme",
            icons: ["https://flozy.meme/logo.png"],
          },
        })]
      : []),
    coinbaseWallet({
      appName: "FLOZY",
      appLogoUrl: "https://flozy.meme/logo.png",
    }),
  ],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
    [baseSepolia.id]: http("https://sepolia.base.org"),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
  ssr: false,
});
