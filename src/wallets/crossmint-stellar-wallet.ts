import { CrossmintRestClient } from "../shared/crossmint-rest.js";

/**
 * Gets or creates the server-controlled Stellar smart wallet.
 * XLM is funded automatically by Crossmint on wallet creation.
 *
 * @returns Stellar G-address of the smart wallet
 */
export async function getStellarWalletAddress(
  restClient: CrossmintRestClient
): Promise<string> {
  return restClient.getStellarWalletAddress();
}
