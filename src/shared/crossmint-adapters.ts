import {
  IEvmWalletProvider,
  EvmRawTransaction,
  EvmRawTransactionReceipt,
  Address,
  Hash,
} from "@sodax/types";
import { ethers } from "ethers";
import { CrossmintRestClient } from "./crossmint-rest.js";

/**
 * Adapter connecting Crossmint EVM Smart Wallets to the Sodax SDK.
 *
 * Implements IEvmWalletProvider so the Sodax swap flow (allowance check, approve,
 * createIntent) can delegate all on-chain calls to the Crossmint REST API instead
 * of broadcasting directly from an EOA.
 */
export class CrossmintEvmSodaxAdapter implements IEvmWalletProvider {
  constructor(
    private restClient: CrossmintRestClient,
    private walletAddress: string,
    private walletLocator: string,
    private chain: string,
    private provider: ethers.JsonRpcProvider
  ) {}

  async getWalletAddress(): Promise<Address> {
    return this.walletAddress as Address;
  }

  async sendTransaction(evmRawTx: EvmRawTransaction): Promise<Hash> {
    console.log(`[CrossmintAdapter] Sending transaction to ${evmRawTx.to}...`);

    const txHash = await this.restClient.sendTransactionAndGetHash(
      this.walletLocator,
      {
        to: evmRawTx.to,
        data: evmRawTx.data,
        value: evmRawTx.value,
      },
      this.chain
    );

    console.log(`[CrossmintAdapter] Transaction hash: ${txHash}`);
    return txHash as Hash;
  }

  async waitForTransactionReceipt(txHash: Hash): Promise<EvmRawTransactionReceipt> {
    console.log(`[CrossmintAdapter] Waiting for receipt: ${txHash}...`);

    const receipt = await this.provider.waitForTransaction(txHash);
    if (!receipt) throw new Error(`Receipt not found for: ${txHash}`);

    return {
      transactionHash: receipt.hash,
      transactionIndex: ethers.toQuantity(receipt.index),
      blockHash: receipt.blockHash,
      blockNumber: ethers.toQuantity(receipt.blockNumber),
      from: receipt.from,
      to: receipt.to,
      cumulativeGasUsed: ethers.toQuantity(receipt.cumulativeGasUsed),
      gasUsed: ethers.toQuantity(receipt.gasUsed),
      contractAddress: receipt.contractAddress,
      logs: receipt.logs.map((log) => ({
        address: log.address as Address,
        topics: log.topics as [Hash, ...Hash[]] | [],
        data: log.data as Hash,
        blockHash: log.blockHash as Hash,
        blockNumber: ethers.toQuantity(log.blockNumber) as Address,
        logIndex: ethers.toQuantity(log.index) as Hash,
        transactionHash: log.transactionHash as Hash,
        transactionIndex: ethers.toQuantity(log.transactionIndex) as Hash,
        removed: log.removed,
      })),
      logsBloom: receipt.logsBloom,
      status: ethers.toQuantity(receipt.status ?? 0),
      type: ethers.toQuantity(receipt.type ?? 0),
      effectiveGasPrice: ethers.toQuantity(receipt.gasPrice ?? 0),
    } as EvmRawTransactionReceipt;
  }
}
