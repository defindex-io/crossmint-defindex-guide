---
name: crossmint-defindex
description: End-to-end playbook for integrating Defindex vaults on Stellar using Crossmint smart wallets and Sodax bridge. Covers EVM wallet (ERC-4337), Stellar wallet, Soroban contract-call deposit/withdraw/withdraw-shares, and full Base→Stellar bridge. Use when building Crossmint + Defindex integrations or answering questions about the Crossmint/Sodax/Stellar/Defindex stack.
---

# Crossmint + Sodax + Defindex Integration Playbook

## When to use this skill

Use when building integrations that:
- Create Crossmint smart wallets (EVM on Base, Stellar)
- Bridge USDC from Base to Stellar via Sodax
- Deposit, withdraw, or redeem shares from Defindex vaults on Stellar

## Architecture

```
Crossmint EVM Smart Wallet (ERC-4337, Base)
  │  EVM txs: POST /transactions → sign hex bytes → POST /approvals → poll
  ▼
Sodax (Base USDC → Stellar USDC via Sonic hub)
  ▼
Crossmint Stellar Smart Wallet
  │  Stellar txs: POST /transactions (contract-call) → sign base64 XDR → POST /approvals → poll
  ▼
Defindex Vault (Soroban)
```

## Prerequisites

```bash
CROSSMINT_SERVER_API_KEY=sk_production_...   # Must start with sk_ (not ck_)
CROSSMINT_WALLET_EMAIL=user@example.com
CROSSMINT_ENV=production                     # or "staging"
EVM_PRIVATE_KEY=0x...                        # adminSigner for EVM wallet
STELLAR_SERVER_KEY=S...                      # adminSigner for Stellar wallet
BASE_RPC_URL=https://mainnet.base.org
```

## Key Constants

```ts
// Defindex vaults
SOROSWAP_EARN_USDC = "CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK"  // mainnet
XLM_VAULT_TESTNET  = "CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6"  // testnet

// Tokens
USDC_BASE      = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  // 6 decimals
USDC_STELLAR   = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75"  // 7 decimals

// Decimals
// 1 USDC Stellar = 10_000_000 stroops
// 1 USDC Base    = 1_000_000
```

## Step 1 — EVM Wallet

```ts
import { CrossmintRestClient } from "./src/shared/crossmint-rest.js";

const restClient = new CrossmintRestClient(apiKey, "https://www.crossmint.com");
const { address, locator } = await restClient.getOrCreateEvmWallet();
// address = "0x..." — use this for ALL transaction calls (not the email locator)
```

**Critical patterns:**
- `adminSigner: external-wallet` must be set at wallet CREATION time
- Never use `api-key` as signer (deprecated in API 2025-06-09)
- Always use on-chain address (not `email:...:evm`) for transaction endpoints

## Step 2 — Stellar Wallet

```ts
const stellarAddress = await restClient.getStellarWalletAddress();
// Returns G-address. XLM auto-funded by Crossmint on first creation.
```

## Step 3 — EVM Transaction Flow

```ts
// Creates tx → signs if awaiting-approval → polls until onChain.txId
const txHash = await restClient.sendTransactionAndGetHash(
  evmAddress,  // on-chain address
  { to: "0x...", data: "0x...", value: "0x0" },
  "base"
);

// CRITICAL: EVM approval message is raw hex bytes
const signature = await signer.signMessage(ethers.getBytes(message));
// NOT: signer.signMessage(message)  ← double-hashes!
```

## Step 4 — Stellar Contract-Call Flow

```ts
// All Defindex vault ops use this pattern
POST /wallets/{stellarAddress}/transactions
{
  "params": {
    "transaction": {
      "type": "contract-call",
      "contractId": vaultAddress,
      "method": "deposit",  // or "withdraw" / "withdraw_shares"
      "args": { ... }
    },
    "signer": "external-wallet:GYOUR_STELLAR_PUBLIC_KEY"
  }
}
→ awaiting-approval → sign base64 XDR → POST /approvals → poll

// CRITICAL: Stellar message is base64 XDR, not hex bytes
const messageBytes = Buffer.from(pending.message, "base64");
const signature = keypair.sign(messageBytes).toString("base64");
// NOT: ethers.getBytes(message)  ← wrong encoding + wrong algorithm!
```

## Step 5 — Defindex Deposit

```ts
import { depositToDefindexVault } from "./src/wallets/crossmint-defindex-wallet.js";

const txHash = await depositToDefindexVault(
  restClient,
  stellarAddress,
  vaultAddress,
  amountStroops  // bigint
);
```

**Contract args:**
```json
{
  "amounts_desired": ["10000000"],
  "amounts_min": ["9950000"],   // 0.5% slippage
  "from": "G...",
  "invest": true
}
```

## Step 6 — Defindex Withdraw

```ts
import { withdrawFromDefindexVault } from "./src/wallets/crossmint-defindex-wallet.js";

const txHash = await withdrawFromDefindexVault(
  restClient, stellarAddress, vaultAddress, amountStroops
);
```

**Contract args:**
```json
{ "amounts_to_withdraw": ["5000000"], "from": "G..." }
```

## Step 7 — Defindex Withdraw by Shares

```ts
import { getUserVaultShares, withdrawSharesFromDefindexVault } from "./src/wallets/crossmint-defindex-wallet.js";

const shares = await getUserVaultShares(vaultAddress, stellarAddress, "mainnet");
const txHash = await withdrawSharesFromDefindexVault(
  restClient, stellarAddress, vaultAddress, shares
);
```

**Contract args:**
```json
{ "shares_amount": "5000000", "from": "G..." }
```

## Step 8 — Sodax Bridge

```ts
import { SodaxBridgeService } from "./src/shared/sodax-service.js";
import { CrossmintEvmSodaxAdapter } from "./src/shared/crossmint-adapters.js";

const adapter = new CrossmintEvmSodaxAdapter(restClient, evmAddress, locator, "base", provider);
const quote = await bridgeService.getQuote(swapParams);
const { statusHash } = await bridgeService.executeSwap(adapter, swapParams, quote);
const { amountReceived } = await bridgeService.pollStatus(statusHash);
// No Horizon polling — amountReceived is ready to deposit immediately
```

## Critical Gotchas (Top 5)

1. **EVM signing:** `ethers.getBytes(message)` — never `signMessage(message)` (double-hash)
2. **Stellar signing:** `Buffer.from(message, "base64")` — never `ethers.getBytes()` (wrong encoding + wrong algorithm)
3. **adminSigner at creation:** can't add `external-wallet` signer post-creation without email OTP
4. **sk_ API key required:** `ck_` keys don't have wallet transaction signing permissions

## File Map

| File | Purpose |
|---|---|
| `src/shared/config.ts` | Env vars + vault constants |
| `src/shared/crossmint-rest.ts` | `CrossmintRestClient` — EVM wallet lifecycle + tx flow |
| `src/shared/crossmint-adapters.ts` | `CrossmintEvmSodaxAdapter` — IEvmWalletProvider for Sodax |
| `src/shared/sodax.ts` | `initializeSodax`, `handleAllowance`, `sleep` |
| `src/shared/sodax-service.ts` | `SodaxBridgeService` — getQuote, executeSwap, pollStatus |
| `src/wallets/crossmint-defindex-wallet.ts` | deposit, withdraw, withdrawShares, getUserVaultShares |
| `src/examples/01-evm-wallet.ts` | EVM wallet + balances |
| `src/examples/02-stellar-wallet.ts` | Stellar wallet |
| `src/examples/03-deposit.ts` | Testnet deposit |
| `src/examples/04-withdraw.ts` | Testnet withdraw |
| `src/examples/05-withdraw-shares.ts` | Testnet withdraw by shares |
| `src/examples/06-full-bridge.ts` | Mainnet Base→Stellar→Defindex |
