# EVM Smart Wallet

Crossmint EVM smart wallets are ERC-4337 accounts. The wallet identity is an email address,
but control is delegated to an `adminSigner` — your `EVM_PRIVATE_KEY`. No email prompts,
no OTP, fully server-side.

---

## Create / Get Wallet

```ts
import { CrossmintRestClient } from "../shared/crossmint-rest.js";

const restClient = new CrossmintRestClient(apiKey, "https://www.crossmint.com");
const { address, locator } = await restClient.getOrCreateEvmWallet();
// address = "0x291d9..."  (on-chain smart wallet address)
// locator = "0x291d9..."  (same — always use on-chain address for tx calls)
```

**REST flow:**

```
GET /api/2025-06-09/wallets/email:user@example.com:evm
  └─ 200 → return { address }
  └─ 404 → create:

POST /api/2025-06-09/wallets
{
  "chainType": "evm",
  "type": "smart",
  "owner": "email:user@example.com",
  "config": {
    "adminSigner": { "type": "external-wallet", "address": "0xYOUR_EVM_KEY" }
  }
}
→ { "address": "0x..." }
```

---

## Why `adminSigner: external-wallet`

The `adminSigner` separates identity (email) from control (private key):

| Role | Value | Who controls it |
|---|---|---|
| `owner` | `email:user@example.com` | Email (identity only) |
| `adminSigner` | `external-wallet:0xYourKey` | Your `EVM_PRIVATE_KEY` |

The email owner never signs anything. `EVM_PRIVATE_KEY` is the sole transaction approver.

**Common mistakes that don't work:**

| Attempt | Error |
|---|---|
| `signer: "api-key"` in tx body | `Invalid address: api-key` — deprecated in API `2025-06-09` |
| Add `external-wallet` as signer post-creation | Email OTP required — must be set as `adminSigner` at creation |
| `owner: "external-wallet:0x..."` | Invalid — `owner` must be `email:` or `userId:` |

---

## Send an EVM Transaction

```ts
const txHash = await restClient.sendTransactionAndGetHash(
  evmAddress,         // on-chain smart wallet address
  {
    to:   "0xContractAddress",
    data: "0xCalldata",
    value: "0x0",
  },
  "base"              // chain name for Crossmint
);
```

**Transaction lifecycle:**

```
POST /wallets/{address}/transactions
{ "params": { "calls": [...], "chain": "base", "signer": "external-wallet:0x..." } }
→ { "id": "tx_...", "status": "awaiting-approval",
    "approvals": { "pending": [{ "message": "0x..." }] } }

// Sign approval — message is raw hex bytes (NOT UTF-8)
const signature = await signer.signMessage(ethers.getBytes(message));

POST /wallets/{address}/transactions/{txId}/approvals
{ "approvals": [{ "signer": "external-wallet:0x...", "signature": "0x..." }] }

GET /wallets/{address}/transactions/{txId}  (poll every 5s)
→ { "onChain": { "txId": "0x..." } }
```

**Critical:** always use `ethers.getBytes(message)` to convert the hex message before signing.
Using `signer.signMessage(message)` directly double-hashes it (EIP-191 prefix + hash of hash).

---

## Check Balances

```ts
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
const usdcAbi = ["function balanceOf(address) view returns (uint256)"];
const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, provider);

const [eth, usdcBal] = await Promise.all([
  provider.getBalance(evmAddress),
  usdc.balanceOf(evmAddress),
]);

console.log(ethers.formatEther(eth));           // ETH
console.log(ethers.formatUnits(usdcBal, 6));    // USDC
```

---

## Wallet Locator Format

```
email:<email>:<chainType>           ← lookup by email (GET only)
0x291d9Cd5150888eC475EF9A362A40B...  ← on-chain address (use for ALL tx calls)
```

Always use the on-chain address for transaction endpoints. The `email:...:evm` locator
only works for wallet lookup (GET).
