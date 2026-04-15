# Defindex Withdraw by Amount

Withdraw a specific underlying amount from a Defindex vault using a Soroban `contract-call`
via the Crossmint REST API.

> **Note:** The contract-call method name (`withdraw`) and args (`amounts_to_withdraw`, `from`)
> are inferred from the Defindex API/SDK naming. Verify with the Defindex team before
> production use.

---

## Transaction Body

```json
POST /api/2025-06-09/wallets/{stellarAddress}/transactions
{
  "params": {
    "transaction": {
      "type": "contract-call",
      "contractId": "CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK",
      "method": "withdraw",
      "args": {
        "amounts_to_withdraw": ["5000000"],
        "from": "GYOUR_STELLAR_ADDRESS"
      }
    },
    "signer": "external-wallet:GYOUR_STELLAR_PUBLIC_KEY"
  }
}
```

- `amounts_to_withdraw` — amount to withdraw in stroops (strings), per asset in the vault
- `from` — the withdrawer's Stellar address

The approval and polling flow is identical to deposit (base64 XDR signing).

---

## Using the Helper

```ts
import { CrossmintRestClient } from "../shared/crossmint-rest.js";
import { withdrawFromDefindexVault } from "../wallets/crossmint-defindex-wallet.js";

const restClient = new CrossmintRestClient(apiKey, baseUrl);
const stellarAddress = await restClient.getStellarWalletAddress();

const txHash = await withdrawFromDefindexVault(
  restClient,
  stellarAddress,
  "CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK",  // vault
  5_000_000n  // 0.5 USDC in stroops
);

console.log(`Withdraw tx: ${txHash}`);
```

---

## Testnet

```ts
const VAULT = "CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6";
await withdrawFromDefindexVault(restClient, stellarAddress, VAULT, 500_000n);
```

Run: `pnpm example:withdraw`
