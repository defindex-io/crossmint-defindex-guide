# Stellar Smart Wallet

Crossmint Stellar wallets are smart wallets on the Stellar network. The `adminSigner` is
a Stellar ed25519 public key derived from `STELLAR_SERVER_KEY`. No email OTP required.

---

## Create / Get Wallet

```ts
const stellarAddress = await restClient.getStellarWalletAddress();
// Returns "G..." — Stellar public key of the smart wallet
```

**REST flow:**

```
GET /api/2025-06-09/wallets/email:user@example.com:stellar
  └─ 200 → return { address }
  └─ 404 → create:

POST /api/2025-06-09/wallets
{
  "chainType": "stellar",
  "type": "smart",
  "owner": "email:user@example.com",
  "config": {
    "adminSigner": {
      "type": "external-wallet",
      "address": "GYOUR_STELLAR_PUBLIC_KEY"
    }
  }
}
→ { "address": "G..." }
```

The `adminSigner` address is the **Stellar public key** derived from `STELLAR_SERVER_KEY`:

```ts
import { Keypair } from "@stellar/stellar-base";

const keypair = Keypair.fromSecret(process.env.STELLAR_SERVER_KEY);
const stellarPublicKey = keypair.publicKey(); // "G..."
```

---

## XLM Funding

Crossmint automatically funds newly created Stellar wallets with enough XLM for:
- Base reserve (2 XLM)
- Transaction fees

No manual funding or friendbot required.

---

## Signing Stellar Transactions

Stellar transaction approvals from Crossmint are **base64-encoded XDR** — not hex bytes.

```ts
// CORRECT — Stellar approval signing
const messageBytes = Buffer.from(pending.message, "base64");
const signature = keypair.sign(messageBytes).toString("base64");

// WRONG — do not use ethers.getBytes() for Stellar messages
// const signature = await evmSigner.signMessage(ethers.getBytes(pending.message));
```

The signing algorithm is also different: Ed25519 (Stellar) vs ECDSA secp256k1 (EVM).

---

## Soroban Contract-Call Pattern

All Defindex vault interactions on Stellar use the `contract-call` transaction type:

```ts
POST /api/2025-06-09/wallets/{stellarAddress}/transactions
{
  "params": {
    "transaction": {
      "type": "contract-call",
      "contractId": "CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK",
      "method": "deposit",
      "args": { ... }
    },
    "signer": "external-wallet:GYOUR_STELLAR_PUBLIC_KEY"
  }
}
→ { "id": "tx_...", "status": "awaiting-approval",
    "approvals": { "pending": [{ "message": "<base64 XDR>" }] } }

→ sign with keypair.sign(Buffer.from(message, "base64"))
→ POST /approvals
→ poll until onChain.txId
```

**No Horizon polling required.** Crossmint handles Stellar transaction submission and
confirmation internally. The `onChain.txId` returned is the final Stellar transaction hash.
