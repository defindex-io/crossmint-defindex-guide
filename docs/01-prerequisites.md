# Prerequisites

---

## Crossmint Account Setup

1. Create a project at [https://www.crossmint.com/console](https://www.crossmint.com/console)
2. Generate a **server API key** — it must start with `sk_` (not `ck_`)
   - Dashboard → API Keys → New Key → Server key
   - `ck_` keys are client-only and will fail for wallet transaction signing

---

## Environment Variables

```bash
# Crossmint
CROSSMINT_SERVER_API_KEY=sk_production_...   # Must start with sk_
CROSSMINT_WALLET_EMAIL=user@example.com      # Used as wallet identity in the locator
CROSSMINT_ENV=production                     # "staging" or "production"

# Signing keys
EVM_PRIVATE_KEY=0x...            # EOA private key — registered as EVM wallet adminSigner
STELLAR_SERVER_KEY=S...          # Stellar ed25519 secret key — registered as Stellar wallet adminSigner

# RPC
BASE_RPC_URL=https://mainnet.base.org

# Bridge
BRIDGE_AMOUNT=0.1                # USDC amount to bridge (6 decimals)

# Defindex (optional — omit to skip vault deposit)
DEFINDEX_API_KEY=...
DEFINDEX_API_URL=https://api.defindex.io
DEFINDEX_VAULT_ADDRESS=CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK
```

---

## Staging vs Production

| Setting | Staging | Production |
|---|---|---|
| `CROSSMINT_ENV` | `staging` | `production` |
| Base URL | `https://staging.crossmint.com` | `https://www.crossmint.com` |
| Chain | `base-sepolia` | `base` |
| USDC on Base | USDXM `0x14196F08...` | USDC `0x833589fC...` |
| API key prefix | `sk_staging_...` | `sk_production_...` |
| Sodax SDK | Always mainnet chain IDs | Same |

> The Sodax SDK always uses mainnet chain IDs (`eip155:8453`, `stellar:pubnet`) regardless
> of `CROSSMINT_ENV`. Do not change these constants when using staging.

---

## Generating Keys

**EVM key** — any EOA private key works (MetaMask export, `cast wallet new`, etc.)

**Stellar key** — generate a new keypair:
```bash
# Using Stellar Laboratory or any Stellar SDK:
node -e "
const { Keypair } = require('@stellar/stellar-base');
const kp = Keypair.random();
console.log('Public:', kp.publicKey());
console.log('Secret:', kp.secret());
"
```

---

## Minimum Balances

| Asset | Wallet | Minimum | Who funds |
|---|---|---|---|
| ETH | EVM smart wallet | 0.001 ETH | You — send to the smart wallet address |
| USDC | EVM smart wallet | ≥ `BRIDGE_AMOUNT` | You |
| XLM | Stellar smart wallet | Auto | Crossmint (on first wallet creation) |

The smart wallet address is printed by `pnpm example:evm`. Fund it before running the bridge.
