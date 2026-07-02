import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { config } from "./lib/shared/config.js";
import { CrossmintRestClient } from "./lib/shared/crossmint-rest.js";
import {
  adminSignerPublicKey,
  formatUnits,
  getTokenBalance,
  getTokenDecimals,
  stellarTransfer,
} from "./lib/wallets/crossmint-stellar-wallet.js";

/**
 * Self-contained Crossmint Stellar wallet demo — create → inspect → transfer.
 *
 *   [1] Get-or-create the Stellar smart wallet (idempotent by email locator).
 *   [2] Read and print balances via Soroban RPC (never Horizon).
 *   [3] Optionally transfer the network asset out (USDC on mainnet, XLM on
 *       testnet), gated on mainnet by a balance check; skipped if no recipient.
 *
 * No bridge, no vault — wallet-native operations only. Never logs secrets.
 */
async function main() {
  if (!config.apiKey || !config.stellarServerKey) {
    console.error(
      "Missing config: set CROSSMINT_SERVER_API_KEY and STELLAR_SERVER_KEY in .env"
    );
    process.exit(1);
  }

  const network = config.stellar.network;
  console.log(`Crossmint Stellar wallet — ${network}\n`);

  const restClient = new CrossmintRestClient(config.apiKey, config.baseUrl);
  const adminSigner = adminSignerPublicKey();

  // [1] Create or reuse the wallet.
  console.log("[1] Wallet");
  const { address, created } = await restClient.getOrCreateStellarWallet(
    adminSigner
  );
  console.log(`  ${created ? "Created" : "Found"} wallet (C-address): ${address}`);
  console.log(`  Admin signer (G-address): ${adminSigner}\n`);

  // [2] Balances (Soroban RPC — the wallet is a contract, invisible on Horizon).
  console.log("[2] Balances");
  await printBalances(address);
  console.log("");

  // [3] Transfer step. Recipient comes from STELLAR_TRANSFER_TO, or is prompted
  // interactively (blank input skips the transfer).
  console.log("[3] Transfer");
  const to = config.transfer.to || (await promptRecipient());
  if (!to) {
    console.log("  No recipient — transfer skipped.\n");
    console.log("Done.");
    return;
  }

  const asset = config.stellar.transferAsset;
  const decimals = await getTokenDecimals(asset.contract);
  const amountStroops = toStroops(config.transfer.amount, decimals);
  const balance = await getTokenBalance(address, asset.contract);

  console.log(
    `  Sending ${config.transfer.amount} ${asset.symbol} → ${to}`
  );

  // Mainnet moves real funds — gate on sufficient balance. Testnet XLM is free.
  if (!config.isStaging && balance < amountStroops) {
    console.log(
      `  Balance gate: wallet holds ${formatUnits(balance, decimals)} ${asset.symbol}, ` +
        `need ${config.transfer.amount}. Skipping transfer (nothing moved).\n`
    );
    console.log("Done.");
    return;
  }

  const txHash = await stellarTransfer(
    restClient,
    address,
    asset.contract,
    to,
    amountStroops
  );
  console.log(`  Transfer confirmed: ${txHash}\n`);

  console.log("[4] Balances after transfer");
  await printBalances(address);
  console.log("");
  console.log("Done.");
}

/**
 * Prompts for the transfer recipient when STELLAR_TRANSFER_TO is unset. Returns
 * a trimmed address, or "" to skip (blank input, or non-interactive stdin).
 */
async function promptRecipient(): Promise<string> {
  if (!stdin.isTTY) return "";

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    while (true) {
      const answer = (
        await rl.question("  Recipient address (blank to skip): ")
      ).trim();
      if (!answer) return "";
      if (/^[GC][A-Z2-7]{55}$/.test(answer)) return answer;
      console.log("  Not a valid Stellar G-/C-address — try again.");
    }
  } finally {
    rl.close();
  }
}

async function printBalances(address: string): Promise<void> {
  for (const asset of config.stellar.balanceAssets) {
    const decimals = await getTokenDecimals(asset.contract);
    const balance = await getTokenBalance(address, asset.contract);
    console.log(`  ${asset.symbol}: ${formatUnits(balance, decimals)}`);
  }
}

/** Converts a human amount string (e.g. "0.1") to base-unit stroops. */
function toStroops(amount: string, decimals: number): bigint {
  const [whole, frac = ""] = amount.split(".");
  const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
