/**
 * Example 03 — Defindex Deposit (testnet)
 *
 * Deposits XLM into the testnet Defindex XLM vault using a Crossmint Stellar
 * smart wallet. No bridge required — the Stellar wallet already holds XLM.
 *
 * Prerequisites:
 *   - CROSSMINT_ENV=staging
 *   - Stellar smart wallet exists and has XLM balance
 *   - STELLAR_SERVER_KEY is set
 */
import { CrossmintRestClient } from "../shared/crossmint-rest.js";
import { getStellarWalletAddress } from "../wallets/crossmint-stellar-wallet.js";
import { depositToDefindexVault } from "../wallets/crossmint-defindex-wallet.js";
import { config, XLM_DEFINDEX_VAULT_TESTNET } from "../shared/config.js";

const DEPOSIT_AMOUNT_STROOPS = 1_000_000n; // 0.1 XLM
const NETWORK = "testnet";

async function main() {
  console.log("Defindex Deposit — Example 03 (testnet)");
  console.log("─────────────────────────────────────────");
  console.log(`Environment: ${config.isStaging ? "staging" : "production"}`);
  console.log(`Vault:       ${XLM_DEFINDEX_VAULT_TESTNET}`);
  console.log(`Amount:      ${DEPOSIT_AMOUNT_STROOPS} stroops (0.1 XLM)`);

  const restClient = new CrossmintRestClient(config.apiKey, config.baseUrl);

  console.log("\n[1/2] Getting Stellar wallet...");
  const stellarAddress = await getStellarWalletAddress(restClient);
  console.log(`  Address: ${stellarAddress}`);

  console.log("\n[2/2] Depositing into Defindex vault...");
  const txHash = await depositToDefindexVault(
    restClient,
    stellarAddress,
    XLM_DEFINDEX_VAULT_TESTNET,
    DEPOSIT_AMOUNT_STROOPS
  );

  console.log(`\n✅ Deposit complete!`);
  console.log(`   Tx Hash:  ${txHash}`);
  console.log(
    `   Explorer: https://stellar.expert/explorer/testnet/tx/${txHash}`
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
