/**
 * Example 05 — Defindex Withdraw by Shares (testnet)
 *
 * Fetches the current vault share balance for the Stellar wallet, then redeems
 * a configurable percentage of shares from the testnet Defindex XLM vault.
 *
 * Prerequisites:
 *   - CROSSMINT_ENV=staging
 *   - Stellar wallet has vault shares (run 03-deposit first)
 */
import { CrossmintRestClient } from "../shared/crossmint-rest.js";
import { getStellarWalletAddress } from "../wallets/crossmint-stellar-wallet.js";
import {
  getUserVaultShares,
  withdrawSharesFromDefindexVault,
} from "../wallets/crossmint-defindex-wallet.js";
import { config, XLM_DEFINDEX_VAULT_TESTNET } from "../shared/config.js";

const REDEEM_PERCENT = 100n; // Redeem 100% of shares (change to e.g. 50n for half)
const NETWORK = "testnet";

async function main() {
  console.log("Defindex Withdraw by Shares — Example 05 (testnet)");
  console.log("─────────────────────────────────────────────────────");
  console.log(`Vault:          ${XLM_DEFINDEX_VAULT_TESTNET}`);
  console.log(`Redeem percent: ${REDEEM_PERCENT}%`);

  const restClient = new CrossmintRestClient(config.apiKey, config.baseUrl);

  console.log("\n[1/3] Getting Stellar wallet...");
  const stellarAddress = await getStellarWalletAddress(restClient);
  console.log(`  Address: ${stellarAddress}`);

  console.log("\n[2/3] Fetching vault share balance...");
  const totalShares = await getUserVaultShares(
    XLM_DEFINDEX_VAULT_TESTNET,
    stellarAddress,
    NETWORK
  );

  if (totalShares === 0n) {
    console.log("  No shares found. Run example:deposit first.");
    process.exit(0);
  }

  const sharesToRedeem = (totalShares * REDEEM_PERCENT) / 100n;
  console.log(`  Total shares:   ${totalShares} stroops`);
  console.log(`  Shares to redeem: ${sharesToRedeem} stroops (${REDEEM_PERCENT}%)`);

  console.log("\n[3/3] Redeeming shares...");
  const txHash = await withdrawSharesFromDefindexVault(
    restClient,
    stellarAddress,
    XLM_DEFINDEX_VAULT_TESTNET,
    sharesToRedeem
  );

  console.log(`\n✅ Withdraw by shares complete!`);
  console.log(`   Tx Hash:  ${txHash}`);
  console.log(
    `   Explorer: https://stellar.expert/explorer/testnet/tx/${txHash}`
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
