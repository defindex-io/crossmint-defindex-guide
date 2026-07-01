/**
 * Full-capability showcase — Base (EVM) → SODAX → Defindex on Stellar
 * ───────────────────────────────────────────────────────────────────
 * One command runs the entire arc this integration is built for:
 *
 *   1. Init Crossmint smart wallets (EVM on Base + Stellar)
 *   2. Read EVM balances — gate the run on sufficient ETH + USDC
 *   3. Get a SODAX quote (Base USDC → Stellar USDC)
 *   4. Execute the swap (ERC-20 approve + intent via Crossmint REST)
 *   5. Poll until SOLVED on Stellar
 *   6. Deposit the settled USDC into a Defindex vault (Soroban contract-call)
 *
 * Adapted verbatim from src/examples/06-full-bridge.ts — the proven, working
 * path — with imports pointed at the bundled ./lib copy so this folder is
 * fully self-contained.
 *
 * ⚠️  MAINNET. Defaults to production (real USDC, real funds). The balance gate
 * in step [2] is the only thing standing between a run and moving money — it
 * exits cleanly when the wallet is unfunded, so nothing happens by accident.
 *
 * Run:  pnpm showcase
 * Env:  see showcase/README.md  (CROSSMINT_ENV=production)
 */
import { ethers } from "ethers";
import { CrossmintRestClient } from "./lib/shared/crossmint-rest.js";
import { CrossmintEvmSodaxAdapter } from "./lib/shared/crossmint-adapters.js";
import { initializeSodax } from "./lib/shared/sodax.js";
import { SodaxBridgeService } from "./lib/shared/sodax-service.js";
import { depositToDefindexVault } from "./lib/wallets/crossmint-defindex-wallet.js";
import { config } from "./lib/shared/config.js";
import { SwapParams, BridgeToken } from "./lib/shared/bridge-types.js";

async function main() {
  console.log("Full-capability showcase: Base → SODAX → Defindex (Stellar)");
  console.log("════════════════════════════════════════════════════════════");

  if (config.isStaging) {
    console.log(
      "\n  ⚠️  CROSSMINT_ENV is not 'production' — this showcase targets mainnet."
    );
    console.log("     Set CROSSMINT_ENV=production to run the real arc.");
  }

  // [1] Init Crossmint clients + wallets
  const restClient = new CrossmintRestClient(config.apiKey, config.baseUrl);
  const provider = new ethers.JsonRpcProvider(config.baseRpcUrl);

  console.log("\n[1/5] Initializing wallets...");
  const { address: evmAddress, locator: walletLocator } =
    await restClient.getOrCreateEvmWallet();
  const stellarAddress = await restClient.getStellarWalletAddress();

  console.log(`  EVM Address:     ${evmAddress}`);
  console.log(`  Stellar Address: ${stellarAddress}`);

  // [2] Balance gate — the only guard against moving funds. Exit if unfunded.
  const usdcAbi = ["function balanceOf(address) view returns (uint256)"];
  const usdcContract = new ethers.Contract(config.sodax.baseUsdc, usdcAbi, provider);
  const [ethBalance, usdcBalance] = await Promise.all([
    provider.getBalance(evmAddress),
    usdcContract.balanceOf(evmAddress),
  ]);

  const amountIn = BigInt(
    Math.round(Number(config.bridge.amount) * 10 ** config.bridge.usdcDecimals)
  );
  const minEth = ethers.parseEther("0.001");

  console.log(`\n  Balances:`);
  console.log(`    ETH:  ${ethers.formatEther(ethBalance)}`);
  console.log(`    USDC: ${ethers.formatUnits(usdcBalance, config.sodax.usdcDecimals)}`);

  if (usdcBalance < amountIn || ethBalance < minEth) {
    console.log(`\n  ⚠️  Insufficient funds — gate hit, no funds moved.`);
    console.log(`  Fund the EVM wallet, then re-run:  ${evmAddress}`);
    console.log(`    USDC: at least ${config.bridge.amount}`);
    console.log(`    ETH:  at least 0.001`);
    process.exit(0);
  }

  // [3] Initialize SODAX + quote
  const sodax = await initializeSodax();
  const bridgeService = new SodaxBridgeService(sodax);

  const srcToken: BridgeToken = {
    symbol: "USDC",
    address: config.sodax.baseUsdc,
    decimals: config.sodax.usdcDecimals,
    chainId: config.sodax.baseChainId,
  };

  const dstToken: BridgeToken = {
    symbol: "USDC",
    address: config.sodax.stellarUsdc,
    decimals: config.sodax.stellarDecimals,
    chainId: config.sodax.stellarChainId,
  };

  const swapParams: SwapParams = {
    srcToken,
    dstToken,
    amountIn,
    dstAddress: stellarAddress,
    slippageBps: 100,
  };

  console.log(`\n[2/5] Getting quote for ${config.bridge.amount} USDC...`);
  const quote = await bridgeService.getQuote(swapParams);
  console.log(
    `  Quoted output: ${ethers.formatUnits(quote.amountOut, dstToken.decimals)} USDC (Stellar)`
  );

  // [4] Execute swap
  console.log("\n[3/5] Executing swap (allowance + intent creation)...");
  const crossmintAdapter = new CrossmintEvmSodaxAdapter(
    restClient,
    evmAddress,
    walletLocator,
    config.chain,
    provider
  );
  const { srcTxHash, statusHash } = await bridgeService.executeSwap(
    crossmintAdapter,
    swapParams,
    quote
  );
  console.log(`  Base tx: ${srcTxHash}`);

  // [5] Poll until SOLVED
  console.log("\n[4/5] Waiting for bridge to settle on Stellar...");
  const { destTxHash, amountReceived } = await bridgeService.pollStatus(statusHash);

  console.log(`\n  Bridge settled!`);
  console.log(`  Stellar tx: ${destTxHash}`);
  console.log(`  Amount received: ${amountReceived} stroops`);
  console.log(
    `  Explorer: https://stellar.expert/explorer/mainnet/tx/${destTxHash}`
  );

  // [6] Deposit into Defindex vault
  if (config.defindexVaultAddress && config.defindexApiKey) {
    console.log(`\n[5/5] Depositing into Defindex vault...`);
    console.log(`  Vault: ${config.defindexVaultAddress}`);

    const depositTxHash = await depositToDefindexVault(
      restClient,
      stellarAddress,
      config.defindexVaultAddress,
      amountReceived
    );

    console.log(`\n🎉 Full capability complete — EVM → SODAX → Defindex!`);
    console.log(`   Deposit tx: ${depositTxHash}`);
    console.log(
      `   Explorer: https://stellar.expert/explorer/mainnet/tx/${depositTxHash}`
    );
  } else {
    console.log(`\n🎉 Bridge complete!`);
    console.log(
      `   Set DEFINDEX_VAULT_ADDRESS + DEFINDEX_API_KEY to auto-deposit into a vault.`
    );
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
