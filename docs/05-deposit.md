# Defindex Deposit

Deposit tokens into a Defindex vault using a Soroban `contract-call` transaction via the
Crossmint REST API. Crossmint handles XDR construction, submission, and confirmation.

---

## Transaction Body

```json
POST /api/2025-06-09/wallets/{stellarAddress}/transactions
{
  "params": {
    "transaction": {
      "type": "contract-call",
      "contractId": "CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK",
      "method": "deposit",
      "args": {
        "amounts_desired": ["10000000"],
        "amounts_min":     ["9950000"],
        "from":            "GYOUR_STELLAR_ADDRESS",
        "invest":          true
      }
    },
    "signer": "external-wallet:GYOUR_STELLAR_PUBLIC_KEY"
  }
}
```

- `amounts_desired` — deposit amount in stroops (strings)
- `amounts_min` — slippage floor: `floor(amounts_desired * 0.995)` (0.5% slippage)
- `from` — the depositor's Stellar address (same as the smart wallet address)
- `invest` — `true` to immediately invest funds in the vault strategy

---

## Approval Signing

The response will be `status: "awaiting-approval"` with a base64-encoded XDR message.

```ts
const message = tx.approvals.pending[0].message;

// CRITICAL: Stellar message is base64 XDR, not hex bytes
const messageBytes = Buffer.from(message, "base64");
const signature = keypair.sign(messageBytes).toString("base64");

// Submit
await fetch(`.../transactions/${tx.id}/approvals`, {
  method: "POST",
  body: JSON.stringify({
    approvals: [{ signer: "external-wallet:G...", signature }]
  })
});
```

---

## Using the Helper

```ts
import { CrossmintRestClient } from "../shared/crossmint-rest.js";
import { depositToDefindexVault } from "../wallets/crossmint-defindex-wallet.js";

const restClient = new CrossmintRestClient(apiKey, baseUrl);
const stellarAddress = await restClient.getStellarWalletAddress();

const txHash = await depositToDefindexVault(
  restClient,
  stellarAddress,
  "CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK",  // vault
  10_000_000n  // 1 USDC in stroops
);

console.log(`Deposit tx: ${txHash}`);
```

---

## Poll Until Confirmed

After submitting the approval, poll until `onChain.txId` appears:

```ts
// GET /wallets/{stellarAddress}/transactions/{txId}
// → { "status": "...", "onChain": { "txId": "..." } }
```

No Horizon polling required — Crossmint returns the confirmed Stellar tx hash directly.

---

## Testnet

For testnet, use the XLM vault:
```ts
const VAULT = "CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6";
await depositToDefindexVault(restClient, stellarAddress, VAULT, 1_000_000n);
```

Run: `pnpm example:deposit`
