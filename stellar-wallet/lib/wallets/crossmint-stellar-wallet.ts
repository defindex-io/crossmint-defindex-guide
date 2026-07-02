import {
  Account,
  Address,
  Contract,
  Keypair,
  TransactionBuilder,
  scValToNative,
  xdr,
} from "@stellar/stellar-base";
import {
  CrossmintRestClient,
  CrossmintTransaction,
} from "../shared/crossmint-rest.js";
import { config } from "../shared/config.js";

// A known funded account used only as the simulation source. A
// `simulateTransaction` call is never signed or submitted, so this just needs to
// be a valid account to cover the (notional) fee — no secret required.
const SIMULATION_SOURCE =
  "GALAXYVOIDAOPZTDLHILAJQKCVVFMD4IKLXLSZV5YHO7VY74IWZILUTO";

/**
 * The Stellar ed25519 admin signer (public key) derived from STELLAR_SERVER_KEY.
 * This key is the sole transaction authorizer for the smart wallet.
 */
export function adminSignerPublicKey(): string {
  if (!config.stellarServerKey) {
    throw new Error(
      "STELLAR_SERVER_KEY is required. Generate a Stellar keypair and set it in .env"
    );
  }
  return Keypair.fromSecret(config.stellarServerKey).publicKey();
}

/**
 * Read-only Soroban call: simulates `contractId.method(...args)` and returns the
 * decoded native value, or `null` if the simulation errored or returned nothing.
 *
 * Simulation is never signed or submitted, so a known account (sequence 0) is a
 * sufficient source — no STELLAR_SERVER_KEY needed. Uses Soroban RPC directly;
 * Horizon is never involved.
 */
async function simulateRead(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = []
): Promise<unknown | null> {
  const { sorobanRpcUrl, networkPassphrase } = config.stellar;
  const source = new Account(SIMULATION_SOURCE, "0");

  const tx = new TransactionBuilder(source, { fee: "100", networkPassphrase })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(30)
    .build();

  const response = await fetch(sorobanRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "simulateTransaction",
      params: { transaction: tx.toXDR() },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Soroban RPC error ${response.status}: ${await response.text()}`
    );
  }

  const json = (await response.json()) as {
    result?: { error?: string; results?: Array<{ xdr?: string }> };
  };

  const retXdr = json.result?.results?.[0]?.xdr;
  if (json.result?.error || !retXdr) return null;

  return scValToNative(xdr.ScVal.fromXDR(retXdr, "base64"));
}

/**
 * Reads a Soroban token contract's `decimals()`. Classic-asset SACs are fixed at
 * 7, but decimals are a property of the token, so we read them — falling back to
 * 7 only if the contract doesn't answer.
 */
export async function getTokenDecimals(tokenContract: string): Promise<number> {
  const decimals = await simulateRead(tokenContract, "decimals");
  return decimals == null ? 7 : Number(decimals);
}

/**
 * Reads the smart wallet's balance of a token in the token's base unit (stroops).
 *
 * Because the wallet is a Soroban contract (C-address), its token balance is NOT
 * visible on Horizon. We simulate the token SAC's `balance(C-address)` over
 * Soroban RPC instead. A classic-asset SAC with no trustline (or a sim error)
 * yields `0n`.
 *
 * @param walletAddress - the wallet C-address
 * @param tokenContract - the token SAC/contract address
 */
export async function getTokenBalance(
  walletAddress: string,
  tokenContract: string
): Promise<bigint> {
  const balance = await simulateRead(tokenContract, "balance", [
    new Address(walletAddress).toScVal(),
  ]);
  return balance == null ? 0n : BigInt(balance as bigint);
}

/**
 * Formats a stroops balance to a human string using the token's decimals.
 */
export function formatUnits(stroops: bigint, decimals: number): string {
  const negative = stroops < 0n;
  const abs = negative ? -stroops : stroops;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = (abs % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  const sign = negative ? "-" : "";
  return frac ? `${sign}${whole}.${frac}` : `${sign}${whole}`;
}

/**
 * Signs a Stellar contract-call approval using STELLAR_SERVER_KEY.
 *
 * Crossmint issues a base64-encoded XDR message for Stellar transactions.
 * CRITICAL: this is NOT hex bytes — sign the raw base64-decoded bytes.
 */
async function approveStellarTx(
  restClient: CrossmintRestClient,
  walletLocator: string,
  tx: CrossmintTransaction,
  keypair: ReturnType<typeof Keypair.fromSecret>
): Promise<void> {
  const pending = tx.approvals?.pending;
  if (!pending?.length) return;

  const messageBytes = Buffer.from(pending[0].message, "base64");
  const signature = keypair.sign(messageBytes).toString("base64");
  const signerLocator = `external-wallet:${keypair.publicKey()}`;

  await restClient.postApproval(walletLocator, tx.id, {
    approvals: [{ signer: signerLocator, signature }],
  });
}

/**
 * Polls a Crossmint Stellar transaction until it reaches `onChain.txId`,
 * re-approving if it re-enters `awaiting-approval` during polling.
 */
async function pollStellarTx(
  restClient: CrossmintRestClient,
  walletLocator: string,
  txId: string,
  keypair: ReturnType<typeof Keypair.fromSecret>,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const tx = await restClient.getTransaction(walletLocator, txId);
    if (tx.onChain?.txId) return tx.onChain.txId;

    console.log(`  Attempt ${attempt}/${maxAttempts} — status: ${tx.status}`);

    if (tx.status === "awaiting-approval") {
      await approveStellarTx(restClient, walletLocator, tx, keypair);
    }
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  throw new Error(`Transfer ${txId} did not confirm within ${maxAttempts} attempts`);
}

/**
 * Transfers a token out of the smart wallet via a Soroban SAC `transfer` call.
 *
 * Same transaction lifecycle used by every Crossmint Soroban operation:
 *   POST /transactions (contract-call `transfer`) → sign base64 XDR → POST
 *   /approvals → poll until on-chain.
 *
 * @param restClient    - CrossmintRestClient instance
 * @param walletAddress - the sending wallet C-address (also the tx `from`)
 * @param tokenContract - the token SAC address
 * @param to            - recipient address
 * @param amountStroops - amount in the token's base unit
 * @returns the on-chain transaction hash
 */
export async function stellarTransfer(
  restClient: CrossmintRestClient,
  walletAddress: string,
  tokenContract: string,
  to: string,
  amountStroops: bigint
): Promise<string> {
  const keypair = Keypair.fromSecret(config.stellarServerKey);
  const signerLocator = `external-wallet:${keypair.publicKey()}`;

  const tx = await restClient.postTransaction(walletAddress, {
    params: {
      transaction: {
        type: "contract-call",
        contractId: tokenContract,
        method: "transfer",
        args: {
          from: walletAddress,
          to,
          amount: amountStroops.toString(),
        },
      },
      signer: signerLocator,
    },
  });

  console.log(`  Transaction created: ${tx.id} (status: ${tx.status})`);

  if (tx.status === "awaiting-approval") {
    await approveStellarTx(restClient, walletAddress, tx, keypair);
  }

  return pollStellarTx(restClient, walletAddress, tx.id, keypair);
}
