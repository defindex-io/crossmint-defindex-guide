/**
 * Example 02 — Stellar Smart Wallet
 *
 * Gets or creates a Crossmint Stellar smart wallet for the configured email.
 * The wallet uses STELLAR_SERVER_KEY as adminSigner, enabling server-side
 * Soroban transaction signing without email OTP.
 *
 * XLM is funded automatically by Crossmint when the wallet is first created.
 */
import { CrossmintRestClient } from "../shared/crossmint-rest.js";
import { getStellarWalletAddress } from "../wallets/crossmint-stellar-wallet.js";
import { config } from "../shared/config.js";

async function main() {
  console.log("Crossmint Stellar Wallet — Example 02");
  console.log("────────────────────────────────────────");
  console.log(`Environment: ${config.isStaging ? "staging" : "production"}`);

  const restClient = new CrossmintRestClient(config.apiKey, config.baseUrl);

  console.log("\n[1/1] Getting Stellar wallet...");
  const stellarAddress = await getStellarWalletAddress(restClient);

  console.log(`\n✅ Stellar wallet ready`);
  console.log(`   Address:  ${stellarAddress}`);
  console.log(
    `   Explorer: https://stellar.expert/explorer/mainnet/account/${stellarAddress}`
  );
  console.log("\n   Note: XLM funded automatically by Crossmint on first creation.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
