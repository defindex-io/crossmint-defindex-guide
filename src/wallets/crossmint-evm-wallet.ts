import { ethers } from "ethers";
import { CrossmintRestClient } from "../shared/crossmint-rest.js";
import { config } from "../shared/config.js";

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

/**
 * Gets or creates the server-controlled EVM smart wallet and returns its balances.
 */
export async function getEvmWalletInfo(restClient: CrossmintRestClient): Promise<{
  address: string;
  ethBalance: bigint;
  usdcBalance: bigint;
}> {
  const { address } = await restClient.getOrCreateEvmWallet();
  const provider = new ethers.JsonRpcProvider(config.baseRpcUrl);
  const usdcContract = new ethers.Contract(config.sodax.baseUsdc, ERC20_ABI, provider);

  const [ethBalance, usdcBalance] = await Promise.all([
    provider.getBalance(address),
    usdcContract.balanceOf(address),
  ]);

  return { address, ethBalance, usdcBalance };
}
