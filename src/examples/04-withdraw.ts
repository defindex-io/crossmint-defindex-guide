/**
 * Example 04 — Defindex Withdraw by Amount (testnet)
 *
 * Withdraws a specific underlying amount from the testnet Defindex XLM vault
 * using a Crossmint Stellar smart wallet.
 *
 * NOTE: The withdraw contract-call args are inferred from Defindex API naming.
 * Verify with the Defindex team before production use.
 *
 * Prerequisites:
 *   - CROSSMINT_ENV=staging
 *   - Stellar wallet has an active position in the vault (run 03-deposit first)
 */
import { CrossmintRestClient } from "../shared/crossmint-rest.js";
import { getStellarWalletAddress } from "../wallets/crossmint-stellar-wallet.js";
import { withdrawFromDefindexVault } from "../wallets/crossmint-defindex-wallet.js";
import { config, XLM_DEFINDEX_VAULT_TESTNET } from "../shared/config.js";

const WITHDRAW_AMOUNT_STROOPS = 500_000n; // 0.05 XLM
const NETWORK = "testnet";

async function main() {
  console.log("Defindex Withdraw — Example 04 (testnet)");
  console.log("──────────────────────────────────────────");
  console.log(`Vault:  ${XLM_DEFINDEX_VAULT_TESTNET}`);
  console.log(`Amount: ${WITHDRAW_AMOUNT_STROOPS} stroops (0.05 XLM)`);

  const restClient = new CrossmintRestClient(config.apiKey, config.baseUrl);

  console.log("\n[1/2] Getting Stellar wallet...");
  const stellarAddress = await getStellarWalletAddress(restClient);
  console.log(`  Address: ${stellarAddress}`);

  console.log("\n[2/2] Withdrawing from Defindex vault...");
  const txHash = await withdrawFromDefindexVault(
    restClient,
    stellarAddress,
    XLM_DEFINDEX_VAULT_TESTNET,
    WITHDRAW_AMOUNT_STROOPS
  );

  console.log(`\n✅ Withdraw complete!`);
  console.log(`   Tx Hash:  ${txHash}`);
  console.log(
    `   Explorer: https://stellar.expert/explorer/testnet/tx/${txHash}`
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
