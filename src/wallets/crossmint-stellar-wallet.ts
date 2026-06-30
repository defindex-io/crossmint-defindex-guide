import {
  Account,
  Address,
  Contract,
  TransactionBuilder,
  scValToNative,
  xdr,
} from "@stellar/stellar-base";
import { CrossmintRestClient } from "../shared/crossmint-rest.js";
import { config } from "../shared/config.js";

// A known funded account used only as the simulation source. A
// `simulateTransaction` call is never signed or submitted, so this just needs to
// be a valid, funded account to cover the (notional) fee — no secret required.
const SIMULATION_SOURCE =
  "GALAXYVOIDAOPZTDLHILAJQKCVVFMD4IKLXLSZV5YHO7VY74IWZILUTO";

/**
 * Gets or creates the server-controlled Stellar smart wallet.
 * XLM is funded automatically by Crossmint on wallet creation.
 *
 * NOTE: Crossmint Stellar smart wallets are Soroban smart-contract wallets — the
 * returned address is a contract C-address, not a classic ed25519 G-address. The
 * STELLAR_SERVER_KEY ed25519 key is only the adminSigner.
 *
 * @returns Stellar C-address (contract) of the smart wallet
 */
export async function getStellarWalletAddress(
  restClient: CrossmintRestClient
): Promise<string> {
  return restClient.getStellarWalletAddress();
}

/**
 * Read-only Soroban call: simulates `contractId.method(...args)` and returns the
 * decoded native value, or `null` if the simulation errored or returned nothing.
 *
 * Simulation is never signed or submitted, so a known funded account (sequence 0)
 * is a sufficient source — no STELLAR_SERVER_KEY needed.
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
 * Reads a Soroban token contract's `decimals()`.
 *
 * Stellar classic-asset SACs are protocol-fixed at 7, but decimals are a property
 * of the token, not an assumption — so we read them from the contract. Falls back
 * to 7 only if the contract doesn't answer.
 *
 * @param tokenContract - the token's SAC/contract address (defaults to the
 *                        active deposit asset)
 */
export async function getStellarTokenDecimals(
  tokenContract: string = config.stellar.depositAsset.contract
): Promise<number> {
  const decimals = await simulateRead(tokenContract, "decimals");
  return decimals == null ? 7 : Number(decimals);
}

/**
 * Reads the smart wallet's spendable balance of the active deposit asset
 * (`config.stellar.depositAsset`) in the token's base unit (stroops).
 *
 * Because the wallet is a Soroban contract (C-address), its token balance is NOT
 * visible on Horizon. Instead we simulate the asset's SAC `balance(C-address)`
 * call over Soroban RPC — deterministic and dependency-free.
 *
 * @param walletAddress - the C-address from getStellarWalletAddress()
 * @returns balance in the token's base unit; 0n if the wallet holds none
 */
export async function getStellarDepositBalance(
  walletAddress: string
): Promise<bigint> {
  // A classic-asset SAC (e.g. USDC) errors with "trustline entry is missing" when
  // the holder has no trustline; native XLM just returns 0. Either way — no
  // trustline, no value, or a sim error — nothing is depositable, so treat as 0.
  const balance = await simulateRead(
    config.stellar.depositAsset.contract,
    "balance",
    [new Address(walletAddress).toScVal()]
  );
  return balance == null ? 0n : BigInt(balance as bigint);
}
