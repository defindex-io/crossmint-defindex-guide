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

## Network selection (staging vs production)

The deposit example is network-aware and driven by `CROSSMINT_ENV`:

| `CROSSMINT_ENV` | Stellar network | Vault | Deposit asset |
|---|---|---|---|
| `staging` | testnet | `CCLV4H7…` (XLM vault) | native XLM |
| `production` | mainnet | `CA2FIPJ…` (Soroswap EARN USDC) | USDC |

All of this resolves from `config.stellar` (`src/shared/config.ts`) — network,
passphrase, Soroban RPC URL, vault, and deposit asset — so the example never
hardcodes a network. Override the Soroban RPC endpoint with
`STELLAR_SOROBAN_RPC_URL` if needed.

---

## Pre-deposit balance gate

Before any transaction is created, the example reads the wallet's balance of the
deposit asset and aborts (exit 1) if it is below the deposit amount.

```ts
import { getStellarDepositBalance } from "../wallets/crossmint-stellar-wallet.js";

const balance = await getStellarDepositBalance(stellarAddress); // stroops
if (balance < amountStroops) {
  // print required vs available + wallet address, then process.exit(1)
}
```

> Crossmint Stellar smart wallets are **Soroban contract wallets (C-addresses)**,
> so their token balance is **not** on Horizon. `getStellarDepositBalance`
> simulates the asset's SAC `balance(C-address)` call over Soroban RPC and returns
> stroops (`0n` if the wallet holds none). See `docs/08-gotchas.md`.

---

Run: `pnpm example:deposit` (staging by default; set `CROSSMINT_ENV=production`
for a mainnet USDC deposit).
