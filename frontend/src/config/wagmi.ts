import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

const isProd = process.env.NEXT_PUBLIC_CHAIN_ID === "8453";
export const targetChain = isProd ? base : baseSepolia;

export const wagmiConfig = createConfig({
  chains: [targetChain],
  connectors: [
    injected({ target: "metaMask" }),
    ...(projectId
      ? [walletConnect({ projectId, showQrModal: true })]
      : []),
  ],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
    [baseSepolia.id]: http("https://sepolia.base.org"),
  },
  ssr: false,
});
