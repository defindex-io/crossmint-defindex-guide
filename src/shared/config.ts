import "dotenv/config";
import {
  BASE_MAINNET_CHAIN_ID,
  STELLAR_MAINNET_CHAIN_ID,
  SONIC_MAINNET_CHAIN_ID,
} from "@sodax/sdk";

const env = process.env.CROSSMINT_ENV ?? "staging";
const isStaging = env === "staging";

export const SOROSWAP_EARN_USDC_VAULT =
  "CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK";
export const XLM_DEFINDEX_VAULT_TESTNET =
  "CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6";

// Native XLM Stellar Asset Contract (SAC) — deterministic per network.
const XLM_SAC_TESTNET =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
// Mainnet USDC SAC (CCW67…) is reused from the sodax block below.

const STELLAR_PASSPHRASE_TESTNET = "Test SDF Network ; September 2015";
const STELLAR_PASSPHRASE_MAINNET =
  "Public Global Stellar Network ; September 2015";

export const config = {
  apiKey: process.env.CROSSMINT_SERVER_API_KEY ?? "",
  baseUrl: isStaging
    ? "https://staging.crossmint.com"
    : "https://www.crossmint.com",
  chain: isStaging ? "base-sepolia" : "base",
  walletEmail: process.env.CROSSMINT_WALLET_EMAIL ?? "",
  isStaging,

  evmPrivateKey: process.env.EVM_PRIVATE_KEY ?? "",
  stellarServerKey: process.env.STELLAR_SERVER_KEY ?? "",
  baseRpcUrl: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",

  sodax: {
    baseUsdc: isStaging
      ? "0x14196F08a4Fa0B66B7331bC40dd6bCd8A1dEeA9F" // USDXM on base-sepolia
      : "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on base mainnet
    stellarUsdc: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
    stellarUsdcIssuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    usdcDecimals: 6,
    stellarDecimals: 7,
    baseChainId: BASE_MAINNET_CHAIN_ID,
    stellarChainId: STELLAR_MAINNET_CHAIN_ID,
    hubChainId: SONIC_MAINNET_CHAIN_ID,
  },

  bridge: {
    amount: process.env.BRIDGE_AMOUNT ?? "0.1",
    usdcDecimals: 6,
  },

  // Stellar network selection — driven by CROSSMINT_ENV (staging → testnet,
  // production → mainnet). The deposit example reads everything from here.
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
    // Defindex vault to deposit into for the active network.
    depositVault: isStaging
      ? XLM_DEFINDEX_VAULT_TESTNET
      : SOROSWAP_EARN_USDC_VAULT,
    // Asset the vault accepts: native XLM on testnet, USDC on mainnet.
    // `contract` is the SAC contract whose `balance(addr)` the gate reads.
    // Decimals are NOT stored here — read from the token's `decimals()` at runtime
    // via getStellarTokenDecimals(), since they are a property of the token.
    depositAsset: isStaging
      ? { symbol: "XLM", contract: XLM_SAC_TESTNET }
      : {
          symbol: "USDC",
          contract: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
        },
  },

  defindexApiUrl: process.env.DEFINDEX_API_URL ?? "https://api.defindex.io",
  defindexVaultAddress:
    process.env.DEFINDEX_VAULT_ADDRESS ?? SOROSWAP_EARN_USDC_VAULT,
  defindexApiKey: process.env.DEFINDEX_API_KEY ?? "",
};

if (!config.apiKey) {
  console.warn(
    "Warning: CROSSMINT_SERVER_API_KEY is not set. Most scripts will fail."
  );
}
