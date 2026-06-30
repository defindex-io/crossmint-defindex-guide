/**
 * Example 03 — Defindex Deposit (network-aware)
 *
 * Deposits the active network's asset into its Defindex vault using a Crossmint
 * Stellar smart wallet. The network is selected by CROSSMINT_ENV:
 *   - staging    → Stellar testnet, XLM vault
 *   - production → Stellar mainnet, USDC vault
 *
 * Before depositing it checks the wallet's balance of the deposit asset and
 * aborts — without creating any transaction — if it is insufficient.
 *
 * Prerequisites:
 *   - CROSSMINT_ENV set (staging or production)
 *   - Stellar smart wallet exists and holds the deposit asset
 *   - STELLAR_SERVER_KEY is set
 */
import { CrossmintRestClient } from "../shared/crossmint-rest.js";
import {
  getStellarWalletAddress,
  getStellarDepositBalance,
  getStellarTokenDecimals,
} from "../wallets/crossmint-stellar-wallet.js";
import { depositToDefindexVault } from "../wallets/crossmint-defindex-wallet.js";
import { config } from "../shared/config.js";

const DEPOSIT_AMOUNT_BASE_UNITS = 1_000_000n; // 0.1 units at 7 decimals

// Human-readable amount, scaled by the token's actual decimals.
function toUnits(baseUnits: bigint, decimals: number): string {
  return (Number(baseUnits) / 10 ** decimals).toString();
}

async function main() {
  const { network, depositVault, depositAsset } = config.stellar;
  const explorer = network === "mainnet" ? "public" : "testnet";

  // Decimals are a property of the token — read them, don't assume 7.
  const decimals = await getStellarTokenDecimals();

  console.log("Defindex Deposit — Example 03");
  console.log("─────────────────────────────────────────");
  console.log(`Environment: ${config.isStaging ? "staging" : "production"}`);
  console.log(`Network:     ${network}`);
  console.log(`Vault:       ${depositVault}`);
  console.log(`Asset:       ${depositAsset.symbol} (${decimals} decimals)`);
  console.log(
    `Amount:      ${DEPOSIT_AMOUNT_BASE_UNITS} (${toUnits(
      DEPOSIT_AMOUNT_BASE_UNITS,
      decimals
    )} ${depositAsset.symbol})`
  );

  const restClient = new CrossmintRestClient(config.apiKey, config.baseUrl);

  console.log("\n[1/3] Getting Stellar wallet...");
  const stellarAddress = await getStellarWalletAddress(restClient);
  console.log(`  Address: ${stellarAddress}`);

  console.log("\n[2/3] Checking balance...");
  const balance = await getStellarDepositBalance(stellarAddress);
  console.log(
    `  Balance: ${balance} (${toUnits(balance, decimals)} ${depositAsset.symbol})`
  );

  if (balance < DEPOSIT_AMOUNT_BASE_UNITS) {
    console.error(
      `\n❌ Insufficient ${depositAsset.symbol} balance.\n` +
        `   Required:  ${toUnits(DEPOSIT_AMOUNT_BASE_UNITS, decimals)} ${depositAsset.symbol}\n` +
        `   Available: ${toUnits(balance, decimals)} ${depositAsset.symbol}\n` +
        `   Wallet:    ${stellarAddress}\n` +
        `   Fund the wallet with ${depositAsset.symbol} before depositing.`
    );
    process.exit(1);
  }

  console.log("\n[3/3] Depositing into Defindex vault...");
  const txHash = await depositToDefindexVault(
    restClient,
    stellarAddress,
    depositVault,
    DEPOSIT_AMOUNT_BASE_UNITS
  );

  console.log(`\n✅ Deposit complete!`);
  console.log(`   Tx Hash:  ${txHash}`);
  console.log(
    `   Explorer: https://stellar.expert/explorer/${explorer}/tx/${txHash}`
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
