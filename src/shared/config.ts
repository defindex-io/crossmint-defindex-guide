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
