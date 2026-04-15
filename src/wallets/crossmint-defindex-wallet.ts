import { Keypair } from "@stellar/stellar-base";
import { config } from "../shared/config.js";
import { CrossmintRestClient } from "../shared/crossmint-rest.js";

interface CrossmintTransaction {
  id: string;
  status: string;
  approvals?: { pending: Array<{ signer: { locator: string }; message: string }> };
  onChain?: { txId?: string };
}

interface VaultBalance {
  shares: string;
}

/**
 * Signs a Stellar contract-call approval using STELLAR_SERVER_KEY.
 *
 * Crossmint issues a base64-encoded XDR message for Stellar transactions.
 * CRITICAL: This is NOT hex bytes — do NOT use ethers.getBytes() here.
 * Sign using: keypair.sign(Buffer.from(message, "base64"))
 */
async function approveStellarTx(
  restClient: CrossmintRestClient,
  stellarWalletLocator: string,
  tx: CrossmintTransaction,
  stellarKeypair: ReturnType<typeof Keypair.fromSecret>
): Promise<void> {
  const pending = tx.approvals?.pending;
  if (!pending?.length) {
    console.log(`  [Defindex] No pending approvals on tx ${tx.id}`);
    return;
  }

  const message = pending[0].message;
  const messageBytes = Buffer.from(message, "base64");
  const signature = stellarKeypair.sign(messageBytes).toString("base64");
  const signerLocator = `external-wallet:${stellarKeypair.publicKey()}`;

  await restClient.postApproval(stellarWalletLocator, tx.id, {
    approvals: [{ signer: signerLocator, signature }],
  });

  console.log(`  [Defindex] Approval submitted for tx ${tx.id}`);
}

/**
 * Polls until a Crossmint Stellar transaction reaches onChain.txId.
 * Re-approves if the transaction re-enters awaiting-approval during polling.
 */
async function pollStellarTx(
  restClient: CrossmintRestClient,
  stellarWalletLocator: string,
  txId: string,
  stellarKeypair: ReturnType<typeof Keypair.fromSecret>,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const tx = await restClient.getTransaction(stellarWalletLocator, txId);

    if (tx.onChain?.txId) return tx.onChain.txId;

    console.log(`  [Defindex] Attempt ${attempt}/${maxAttempts} — status: ${tx.status}`);

    if (tx.status === "awaiting-approval") {
      await approveStellarTx(restClient, stellarWalletLocator, tx, stellarKeypair);
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  throw new Error(`Defindex tx ${txId} did not confirm within ${maxAttempts} attempts`);
}

/**
 * Core: submits a Soroban contract-call to a Defindex vault via Crossmint REST.
 *
 * All vault operations (deposit, withdraw, withdraw_shares) follow the same flow:
 *   POST /transactions (contract-call) → sign base64 XDR → POST /approvals → poll
 */
async function sendVaultContractCall(
  restClient: CrossmintRestClient,
  stellarWalletLocator: string,
  stellarKeypair: ReturnType<typeof Keypair.fromSecret>,
  vaultAddress: string,
  method: string,
  args: Record<string, unknown>
): Promise<string> {
  const signerLocator = `external-wallet:${stellarKeypair.publicKey()}`;

  console.log(`  [Defindex] contract-call: ${method} on ${vaultAddress}`);

  const tx = await restClient.postTransaction(stellarWalletLocator, {
    params: {
      transaction: {
        type: "contract-call",
        contractId: vaultAddress,
        method,
        args,
      },
      signer: signerLocator,
    },
  });

  console.log(`  [Defindex] Transaction created: ${tx.id} (status: ${tx.status})`);

  if (tx.status === "awaiting-approval") {
    await approveStellarTx(restClient, stellarWalletLocator, tx, stellarKeypair);
  }

  return pollStellarTx(restClient, stellarWalletLocator, tx.id, stellarKeypair);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Deposits into a Defindex vault via Crossmint Soroban contract-call.
 *
 * @param restClient          - CrossmintRestClient instance
 * @param stellarWalletLocator - Stellar G-address of the smart wallet
 * @param vaultAddress        - Defindex vault contract address
 * @param amountStroops       - Amount to deposit in stroops (7 decimals)
 */
export async function depositToDefindexVault(
  restClient: CrossmintRestClient,
  stellarWalletLocator: string,
  vaultAddress: string,
  amountStroops: bigint
): Promise<string> {
  const stellarKeypair = Keypair.fromSecret(config.stellarServerKey);
  const slippageFactor = 0.995;
  const amountMin = BigInt(Math.floor(Number(amountStroops) * slippageFactor));

  return sendVaultContractCall(
    restClient,
    stellarWalletLocator,
    stellarKeypair,
    vaultAddress,
    "deposit",
    {
      amounts_desired: [amountStroops.toString()],
      amounts_min: [amountMin.toString()],
      from: stellarWalletLocator,
      invest: true,
    }
  );
}

/**
 * Withdraws a specific underlying amount from a Defindex vault.
 *
 * @param amountStroops - Amount to withdraw in stroops (7 decimals)
 */
export async function withdrawFromDefindexVault(
  restClient: CrossmintRestClient,
  stellarWalletLocator: string,
  vaultAddress: string,
  amountStroops: bigint
): Promise<string> {
  const stellarKeypair = Keypair.fromSecret(config.stellarServerKey);

  return sendVaultContractCall(
    restClient,
    stellarWalletLocator,
    stellarKeypair,
    vaultAddress,
    "withdraw",
    {
      amounts_to_withdraw: [amountStroops.toString()],
      from: stellarWalletLocator,
    }
  );
}

/**
 * Redeems a specific number of vault shares from a Defindex vault.
 *
 * @param shares - Number of shares to redeem in stroops (7 decimals)
 */
export async function withdrawSharesFromDefindexVault(
  restClient: CrossmintRestClient,
  stellarWalletLocator: string,
  vaultAddress: string,
  shares: bigint
): Promise<string> {
  const stellarKeypair = Keypair.fromSecret(config.stellarServerKey);

  return sendVaultContractCall(
    restClient,
    stellarWalletLocator,
    stellarKeypair,
    vaultAddress,
    "withdraw_shares",
    {
      shares_amount: shares.toString(),
      from: stellarWalletLocator,
    }
  );
}

/**
 * Fetches the vault share balance for a given user address via the Defindex REST API.
 *
 * @returns Share balance in stroops (bigint)
 */
export async function getUserVaultShares(
  vaultAddress: string,
  userAddress: string,
  network: "mainnet" | "testnet" = "testnet"
): Promise<bigint> {
  const url = `${config.defindexApiUrl}/vault/${vaultAddress}/balance?address=${userAddress}&network=${network}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.defindexApiKey}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Defindex balance API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as VaultBalance;
  return BigInt(data.shares ?? "0");
}
