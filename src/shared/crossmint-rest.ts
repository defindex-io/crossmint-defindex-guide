import { ethers } from "ethers";
import { Keypair } from "@stellar/stellar-base";
import { config } from "./config.js";

const API_VERSION = "2025-06-09";

interface PendingApproval {
  signer: { locator: string };
  message: string;
}

interface CrossmintTransaction {
  id: string;
  status: string;
  approvals?: { pending: PendingApproval[] };
  onChain?: { txId?: string };
}

/**
 * Thin REST client for Crossmint Wallet API (v2025-06-09).
 *
 * ## Why external-wallet as adminSigner?
 * Crossmint smart wallets have two roles:
 *   - owner     : the identity tied to the wallet (email)
 *   - adminSigner: the key that can authorize transactions
 *
 * By default, the owner's email OTP is required to sign. Setting an `adminSigner`
 * of type `external-wallet` overrides that: our local EVM private key becomes the
 * sole transaction signer — enabling fully server-side, non-interactive automation.
 */
export class CrossmintRestClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly signer: ethers.Wallet;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.signer = new ethers.Wallet(config.evmPrivateKey);
  }

  get signerLocator(): string {
    return `external-wallet:${this.signer.address}`;
  }

  get evmSignerAddress(): string {
    return this.signer.address;
  }

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-API-KEY": this.apiKey,
    };
  }

  private buildUrl(path: string): string {
    return `${this.baseUrl}/api/${API_VERSION}/${path}`;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method,
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(
        `Crossmint REST API error ${response.status}: ${JSON.stringify(json)}`
      );
    }

    return json as T;
  }

  /**
   * Gets or creates a server-controlled EVM smart wallet for the configured email.
   *
   * Lookup uses `email:{email}:evm`. If not found, creates with `adminSigner = external-wallet`
   * (EVM_PRIVATE_KEY address), enabling server-side signing without email OTP.
   */
  async getOrCreateEvmWallet(): Promise<{ address: string; locator: string }> {
    const locator = `email:${config.walletEmail}:evm`;
    try {
      const wallet = await this.request<{ address: string }>(
        "GET",
        `wallets/${encodeURIComponent(locator)}`
      );
      return { address: wallet.address, locator: wallet.address };
    } catch (err: any) {
      if (!err.message?.includes("404")) throw err;
    }

    console.log(`  EVM wallet not found for ${config.walletEmail}, creating...`);
    const wallet = await this.request<{ address: string }>("POST", "wallets", {
      chainType: "evm",
      type: "smart",
      owner: `email:${config.walletEmail}`,
      config: {
        adminSigner: {
          type: "external-wallet",
          address: this.signer.address,
        },
      },
    });
    console.log(`  Created EVM wallet: ${wallet.address}`);
    return { address: wallet.address, locator: wallet.address };
  }

  /**
   * Gets or creates a server-controlled Stellar smart wallet for the configured email.
   *
   * The adminSigner is a Stellar ed25519 public key derived from STELLAR_SERVER_KEY.
   * XLM is funded automatically by Crossmint on wallet creation.
   */
  async getStellarWalletAddress(): Promise<string> {
    if (!config.stellarServerKey) {
      throw new Error(
        "STELLAR_SERVER_KEY is required. Generate a Stellar keypair and set it in .env"
      );
    }

    const stellarKeypair = Keypair.fromSecret(config.stellarServerKey);
    const stellarAddress = stellarKeypair.publicKey();

    const locator = `email:${config.walletEmail}:stellar`;
    try {
      const existing = await this.request<{ address: string }>(
        "GET",
        `wallets/${encodeURIComponent(locator)}`
      );
      return existing.address;
    } catch (err: any) {
      if (!err.message?.includes("404")) throw err;
    }

    console.log(`  Stellar wallet not found, creating with external-wallet adminSigner...`);
    const wallet = await this.request<{ address: string }>("POST", "wallets", {
      chainType: "stellar",
      type: "smart",
      owner: `email:${config.walletEmail}`,
      config: {
        adminSigner: {
          type: "external-wallet",
          address: stellarAddress,
        },
      },
    });
    console.log(`  Created Stellar wallet: ${wallet.address}`);
    return wallet.address;
  }

  /**
   * Sends an EVM transaction via REST API and polls until mined.
   *
   * Flow: POST /transactions → if awaiting-approval, sign hex message with EVM_PRIVATE_KEY
   * → POST /approvals → poll until onChain.txId.
   *
   * @param walletLocator - on-chain smart wallet address (e.g. "0x...")
   * @param tx            - EVM call: to, calldata, optional ETH value
   * @param chain         - Crossmint chain name (e.g. "base", "base-sepolia")
   */
  async sendTransactionAndGetHash(
    walletLocator: string,
    tx: { to: string; data?: string; value?: string | bigint },
    chain: string
  ): Promise<string> {
    const created = await this.request<CrossmintTransaction>(
      "POST",
      `wallets/${encodeURIComponent(walletLocator)}/transactions`,
      {
        params: {
          calls: [
            {
              to: tx.to,
              data: tx.data ?? "0x",
              value:
                tx.value !== undefined
                  ? typeof tx.value === "bigint"
                    ? `0x${tx.value.toString(16)}`
                    : tx.value
                  : "0x0",
            },
          ],
          chain,
          signer: this.signerLocator,
        },
      }
    );

    console.log(
      `[CrossmintREST] Transaction created: ${created.id} (status: ${created.status})`
    );

    if (created.status === "awaiting-approval") {
      await this.approveEvmTransaction(walletLocator, created);
    }

    return this.pollForTxHash(walletLocator, created.id);
  }

  /**
   * Signs the pending EVM approval message with EVM_PRIVATE_KEY and submits it.
   *
   * CRITICAL: The message is raw hex bytes — use ethers.getBytes() to convert before
   * signing. Using signMessage(message) directly would double-hash and produce an invalid
   * signature.
   */
  async approveEvmTransaction(
    walletLocator: string,
    tx: CrossmintTransaction
  ): Promise<void> {
    const pending = tx.approvals?.pending;
    if (!pending || pending.length === 0) return;

    const message = pending[0].message;
    const signature = await this.signer.signMessage(ethers.getBytes(message));

    await this.request(
      "POST",
      `wallets/${encodeURIComponent(walletLocator)}/transactions/${tx.id}/approvals`,
      { approvals: [{ signer: this.signerLocator, signature }] }
    );

    console.log(`[CrossmintREST] Approval submitted for tx ${tx.id}.`);
  }

  async pollForTxHash(
    walletLocator: string,
    transactionId: string,
    maxAttempts = 60,
    intervalMs = 5000
  ): Promise<string> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const tx = await this.request<CrossmintTransaction>(
        "GET",
        `wallets/${encodeURIComponent(walletLocator)}/transactions/${transactionId}`
      );

      if (tx.onChain?.txId) {
        console.log(`[CrossmintREST] Transaction confirmed: ${tx.onChain.txId}`);
        return tx.onChain.txId;
      }

      console.log(
        `[CrossmintREST] Attempt ${attempt}/${maxAttempts} — status: ${tx.status}`
      );

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    throw new Error(
      `Transaction ${transactionId} did not confirm within ${maxAttempts} attempts`
    );
  }

  /** Low-level helper used by crossmint-defindex-wallet. */
  async postTransaction(
    walletLocator: string,
    body: unknown
  ): Promise<CrossmintTransaction> {
    return this.request<CrossmintTransaction>(
      "POST",
      `wallets/${encodeURIComponent(walletLocator)}/transactions`,
      body
    );
  }

  async postApproval(
    walletLocator: string,
    txId: string,
    body: unknown
  ): Promise<unknown> {
    return this.request(
      "POST",
      `wallets/${encodeURIComponent(walletLocator)}/transactions/${txId}/approvals`,
      body
    );
  }

  async getTransaction(
    walletLocator: string,
    txId: string
  ): Promise<CrossmintTransaction> {
    return this.request<CrossmintTransaction>(
      "GET",
      `wallets/${encodeURIComponent(walletLocator)}/transactions/${txId}`
    );
  }
}
