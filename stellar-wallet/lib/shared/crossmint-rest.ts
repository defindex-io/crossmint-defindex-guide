import { config } from "./config.js";

const API_VERSION = "2025-06-09";

export interface CrossmintTransaction {
  id: string;
  status: string;
  approvals?: {
    pending: Array<{ signer: { locator: string }; message: string }>;
  };
  onChain?: { txId?: string };
}

/**
 * Thin REST client for the Crossmint Wallet API (v2025-06-09), Stellar-only.
 *
 * Crossmint Stellar smart wallets are Soroban smart-contract wallets: the wallet
 * address is a contract **C-address**, and the adminSigner is a Stellar ed25519
 * key (derived from STELLAR_SERVER_KEY) that authorizes transactions server-side
 * without email OTP.
 *
 * This client carries only what the wallet folder needs — create/lookup plus the
 * generic contract-call transaction + approval endpoints. There is no EVM path.
 */
export class CrossmintRestClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
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
   * Gets or creates a server-controlled Stellar smart wallet for the configured
   * email. Lookup uses the deterministic locator `email:{email}:stellar`; on 404
   * it creates the wallet with `adminSigner = external-wallet` (the Stellar
   * ed25519 public key). XLM is funded automatically by Crossmint on creation.
   *
   * @returns `{ address, created }` — the wallet C-address and whether it was
   *          just created (vs found).
   */
  async getOrCreateStellarWallet(
    adminSignerAddress: string
  ): Promise<{ address: string; created: boolean }> {
    const locator = `email:${config.walletEmail}:stellar`;
    try {
      const existing = await this.request<{ address: string }>(
        "GET",
        `wallets/${encodeURIComponent(locator)}`
      );
      return { address: existing.address, created: false };
    } catch (err: any) {
      if (!err.message?.includes("404")) throw err;
    }

    const wallet = await this.request<{ address: string }>("POST", "wallets", {
      chainType: "stellar",
      type: "smart",
      owner: `email:${config.walletEmail}`,
      config: {
        adminSigner: {
          type: "external-wallet",
          address: adminSignerAddress,
        },
      },
    });
    return { address: wallet.address, created: true };
  }

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
