/**
 * Example 06 — Full Bridge: Base → Stellar → Defindex (mainnet)
 *
 * End-to-end flow:
 *   1. Init Crossmint wallets (EVM on Base, Stellar)
 *   2. Check EVM balances — exit early if insufficient
 *   3. Get Sodax quote (Base USDC → Stellar USDC)
 *   4. Execute swap (ERC-20 approve + create intent via Crossmint REST)
 *   5. Poll until SOLVED on Stellar
 *   6. Deposit settled USDC into Defindex vault (Soroban contract-call)
 *
 * Prerequisites:
 *   - CROSSMINT_ENV=production
 *   - EVM wallet has ETH (≥ 0.001) + USDC (≥ BRIDGE_AMOUNT)
 *   - STELLAR_SERVER_KEY is set
 *   - DEFINDEX_VAULT_ADDRESS is set (or leave unset to skip vault deposit)
 */
import { ethers } from "ethers";
import { CrossmintRestClient } from "../shared/crossmint-rest.js";
import { CrossmintEvmSodaxAdapter } from "../shared/crossmint-adapters.js";
import { initializeSodax } from "../shared/sodax.js";
import { SodaxBridgeService } from "../shared/sodax-service.js";
import { depositToDefindexVault } from "../wallets/crossmint-defindex-wallet.js";
import { config } from "../shared/config.js";
import { SwapParams, BridgeToken } from "../shared/bridge-types.js";

async function main() {
  console.log("Base → Stellar → Defindex (Crossmint + Sodax)");
  console.log("──────────────────────────────────────────────");

  // [1] Init Crossmint clients
  const restClient = new CrossmintRestClient(config.apiKey, config.baseUrl);
  const provider = new ethers.JsonRpcProvider(config.baseRpcUrl);

  console.log("\n[1/5] Initializing wallets...");
  const { address: evmAddress, locator: walletLocator } =
    await restClient.getOrCreateEvmWallet();
  const stellarAddress = await restClient.getStellarWalletAddress();

  console.log(`  EVM Address:     ${evmAddress}`);
  console.log(`  Stellar Address: ${stellarAddress}`);

  // [2] Check EVM balances
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
    console.log(`\n  ⚠️  Insufficient funds — please fund the EVM wallet before bridging.`);
    console.log(`  Send to: ${evmAddress}`);
    console.log(`    USDC: at least ${config.bridge.amount}`);
    console.log(`    ETH:  at least 0.001`);
    process.exit(0);
  }

  // [3] Initialize Sodax + get quote
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

    console.log(`\n🎉 Bridge + Vault complete!`);
    console.log(`   Deposit tx: ${depositTxHash}`);
    console.log(
      `   Explorer: https://stellar.expert/explorer/mainnet/tx/${depositTxHash}`
    );
  } else {
    console.log(`\n🎉 Bridge complete!`);
    console.log(
      `   Set DEFINDEX_VAULT_ADDRESS to auto-deposit into a Defindex vault.`
    );
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
