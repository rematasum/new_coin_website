import "@nomicfoundation/hardhat-toolbox";
import { config as loadEnv } from "dotenv";
loadEnv({ override: true });

const rawKey = (process.env.PRIVATE_KEY || "").trim();
const PRIVATE_KEY = rawKey.startsWith("0x") ? rawKey : rawKey ? "0x" + rawKey : "0x" + "0".repeat(64);
const BASESCAN_API_KEY = (process.env.BASESCAN_API_KEY || "").trim();

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {},
    base_sepolia: {
      url: "https://sepolia.base.org",
      accounts: [PRIVATE_KEY],
      chainId: 84532,
    },
    base_mainnet: {
      url: "https://mainnet.base.org",
      accounts: [PRIVATE_KEY],
      chainId: 8453,
    },
  },
  etherscan: {
    apiKey: {
      base_sepolia: BASESCAN_API_KEY,
      base_mainnet: BASESCAN_API_KEY,
    },
    customChains: [
      {
        network: "base_sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base_mainnet",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
    ],
  },
};
