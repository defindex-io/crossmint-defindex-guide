# Defindex Withdraw by Shares

Redeem a specific number of vault shares from a Defindex vault using a Soroban `contract-call`
via the Crossmint REST API. Shares represent a proportional claim on the vault's assets.

---

## Getting Share Balance

```ts
import { getUserVaultShares } from "../wallets/crossmint-defindex-wallet.js";

const shares = await getUserVaultShares(
  "CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK",  // vault
  stellarAddress,
  "mainnet"
);
// shares → bigint in stroops
```

Uses the Defindex REST API: `GET /vault/{addr}/balance?address={userAddress}&network={network}`

---

## Transaction Body

```json
POST /api/2025-06-09/wallets/{stellarAddress}/transactions
{
  "params": {
    "transaction": {
      "type": "contract-call",
      "contractId": "CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK",
      "method": "withdraw_shares",
      "args": {
        "shares_amount": "5000000",
        "from": "GYOUR_STELLAR_ADDRESS"
      }
    },
    "signer": "external-wallet:GYOUR_STELLAR_PUBLIC_KEY"
  }
}
```

- `shares_amount` — number of shares to redeem (string, stroops)
- `from` — the withdrawer's Stellar address

The approval and polling flow is identical to deposit (base64 XDR signing).

---

## Percentage Redemption

```ts
const totalShares = await getUserVaultShares(vault, stellarAddress, "testnet");
const redeemPercent = 50n;  // 50%
const sharesToRedeem = (totalShares * redeemPercent) / 100n;

const txHash = await withdrawSharesFromDefindexVault(
  restClient, stellarAddress, vault, sharesToRedeem
);
```

---

## Using the Helper

```ts
import { CrossmintRestClient } from "../shared/crossmint-rest.js";
import { withdrawSharesFromDefindexVault } from "../wallets/crossmint-defindex-wallet.js";

const restClient = new CrossmintRestClient(apiKey, baseUrl);
const stellarAddress = await restClient.getStellarWalletAddress();

const txHash = await withdrawSharesFromDefindexVault(
  restClient,
  stellarAddress,
  "CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK",
  shares
);
```

---

## Testnet

```ts
const VAULT = "CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6";
const shares = await getUserVaultShares(VAULT, stellarAddress, "testnet");
await withdrawSharesFromDefindexVault(restClient, stellarAddress, VAULT, shares);
```

Run: `pnpm example:withdraw-shares`
