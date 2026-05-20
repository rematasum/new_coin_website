import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

const projectId = (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "").trim();

const isProd = process.env.NEXT_PUBLIC_CHAIN_ID === "8453";
export const targetChain = isProd ? base : baseSepolia;

// `injected()` (no target) → any browser-injected wallet (MetaMask extension,
// Brave wallet, Rabby, etc.). On mobile, the regular browser has no injected
// provider, so users connect via WalletConnect (QR code or deeplink).
export const wagmiConfig = createConfig({
  chains: [targetChain],
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
  },
  ssr: false,
});
