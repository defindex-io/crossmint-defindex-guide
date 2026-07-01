import "dotenv/config";

const env = process.env.CROSSMINT_ENV ?? "staging";
const isStaging = env === "staging";

// Native XLM Stellar Asset Contract (SAC) — deterministic per network.
const XLM_SAC_TESTNET =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const XLM_SAC_MAINNET =
  "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
// Mainnet USDC (Circle) SAC.
const USDC_SAC_MAINNET =
  "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";

const STELLAR_PASSPHRASE_TESTNET = "Test SDF Network ; September 2015";
const STELLAR_PASSPHRASE_MAINNET =
  "Public Global Stellar Network ; September 2015";

/**
 * Wallet-only config for the self-contained Stellar wallet folder.
 *
 * Network is driven by CROSSMINT_ENV (`staging` → testnet, `production` →
 * mainnet). There is deliberately no EVM / bridge / Defindex-vault config here —
 * this folder does wallet-native operations only.
 */
export const config = {
  apiKey: process.env.CROSSMINT_SERVER_API_KEY ?? "",
  baseUrl: isStaging
    ? "https://staging.crossmint.com"
    : "https://www.crossmint.com",
  walletEmail: process.env.CROSSMINT_WALLET_EMAIL ?? "",
  isStaging,
  stellarServerKey: process.env.STELLAR_SERVER_KEY ?? "",

  stellar: {
    network: (isStaging ? "testnet" : "mainnet") as "testnet" | "mainnet",
    networkPassphrase: isStaging
      ? STELLAR_PASSPHRASE_TESTNET
      : STELLAR_PASSPHRASE_MAINNET,
    sorobanRpcUrl:
      process.env.STELLAR_SOROBAN_RPC_URL ??
      (isStaging
        ? "https://soroban-testnet.stellar.org"
        : "https://mainnet.sorobanrpc.com"),

    // Assets whose balances are displayed for the wallet. XLM everywhere; USDC
    // where a known SAC exists (mainnet).
    balanceAssets: isStaging
      ? [{ symbol: "XLM", contract: XLM_SAC_TESTNET }]
      : [
          { symbol: "XLM", contract: XLM_SAC_MAINNET },
          { symbol: "USDC", contract: USDC_SAC_MAINNET },
        ],

    // The asset moved by the transfer step: USDC on mainnet, XLM on testnet.
    transferAsset: isStaging
      ? { symbol: "XLM", contract: XLM_SAC_TESTNET }
      : { symbol: "USDC", contract: USDC_SAC_MAINNET },
  },

  // Transfer step (skipped when `to` is unset). Amount is in human units.
  transfer: {
    to: process.env.STELLAR_TRANSFER_TO ?? "",
    amount: process.env.STELLAR_TRANSFER_AMOUNT ?? "0.1",
  },
};

if (!config.apiKey) {
  console.warn(
    "Warning: CROSSMINT_SERVER_API_KEY is not set. This script will fail."
  );
}
