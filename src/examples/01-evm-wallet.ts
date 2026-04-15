/**
 * Example 01 — EVM Smart Wallet
 *
 * Gets or creates a Crossmint EVM smart wallet for the configured email.
 * Prints the wallet address and its ETH + USDC balances.
 *
 * The wallet is controlled by EVM_PRIVATE_KEY (registered as adminSigner),
 * so no email OTP is ever required.
 */
import { ethers } from "ethers";
import { CrossmintRestClient } from "../shared/crossmint-rest.js";
import { getEvmWalletInfo } from "../wallets/crossmint-evm-wallet.js";
import { config } from "../shared/config.js";

async function main() {
  console.log("Crossmint EVM Wallet — Example 01");
  console.log("─────────────────────────────────────");
  console.log(`Environment: ${config.isStaging ? "staging" : "production"}`);
  console.log(`Chain:       ${config.chain}`);

  const restClient = new CrossmintRestClient(config.apiKey, config.baseUrl);

  console.log("\n[1/1] Getting EVM wallet...");
  const { address, ethBalance, usdcBalance } = await getEvmWalletInfo(restClient);

  console.log(`\n✅ EVM wallet ready`);
  console.log(`   Address: ${address}`);
  console.log(`   ETH:     ${ethers.formatEther(ethBalance)}`);
  console.log(
    `   USDC:    ${ethers.formatUnits(usdcBalance, config.sodax.usdcDecimals)}`
  );

  if (ethBalance < ethers.parseEther("0.001")) {
    console.log("\n  ⚠️  Low ETH — send at least 0.001 ETH for gas fees");
    console.log(`      Send to: ${address}`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
