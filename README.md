# crossmint-defindex-guide

Integration guide and runnable examples for depositing, withdrawing, and bridging assets
into [Defindex](https://defindex.io) vaults on Stellar using [Crossmint](https://crossmint.com)
smart wallets and the [Sodax](https://sodax.com) cross-chain bridge.

---

## What's in this repo

| Path | Description |
|---|---|
| `docs/` | Step-by-step integration guides (prerequisites → deposit → withdraw → bridge) |
| `src/shared/` | Crossmint REST client, Sodax service, config |
| `src/wallets/` | EVM wallet, Stellar wallet, Defindex vault operations |
| `src/examples/` | 6 runnable scripts covering every operation |
| `.claude/skills/crossmint-defindex.md` | LLM skill — complete integration playbook |

---

## Quick Start

```bash
pnpm install
cp .env.example .env
# Fill in: CROSSMINT_SERVER_API_KEY (sk_...), CROSSMINT_WALLET_EMAIL,
#          EVM_PRIVATE_KEY, STELLAR_SERVER_KEY
```

### Run examples (testnet)

```bash
CROSSMINT_ENV=staging pnpm example:evm              # EVM smart wallet + balances
CROSSMINT_ENV=staging pnpm example:stellar          # Stellar smart wallet
CROSSMINT_ENV=staging pnpm example:deposit          # Deposit into testnet XLM vault
CROSSMINT_ENV=staging pnpm example:withdraw         # Withdraw by amount
CROSSMINT_ENV=staging pnpm example:withdraw-shares  # Withdraw by shares
```

### Run full mainnet bridge

```bash
# Also set: BASE_RPC_URL, DEFINDEX_VAULT_ADDRESS (optional)
CROSSMINT_ENV=production pnpm example:bridge  # Base USDC → Stellar → Defindex vault
```

---

## Prerequisites

1. [Crossmint account](https://www.crossmint.com/console) with a **server API key** (`sk_...`)
2. `EVM_PRIVATE_KEY` — becomes the `adminSigner` of the EVM smart wallet
3. `STELLAR_SERVER_KEY` — becomes the `adminSigner` of the Stellar smart wallet
4. EVM smart wallet funded with ETH (≥ 0.001) + USDC (≥ bridge amount)

See [docs/01-prerequisites.md](./docs/01-prerequisites.md) for full setup.

---

## Architecture

```
Your EVM Private Key (adminSigner)
       │
       ▼
Crossmint EVM Smart Wallet (ERC-4337, Base)
       │  POST /transactions → sign hex bytes → POST /approvals → onChain.txId
       ▼
Sodax (Base USDC → Stellar USDC via Sonic hub)
       ▼
Crossmint Stellar Smart Wallet
       │  POST /transactions (contract-call) → sign base64 XDR → POST /approvals
       ▼
Defindex Vault (Soroban)
```

No Horizon polling needed — Crossmint handles Stellar transaction submission internally.

---

## Documentation

| Guide | Topic |
|---|---|
| [00-overview.md](./docs/00-overview.md) | Architecture, chain reference, quick start |
| [01-prerequisites.md](./docs/01-prerequisites.md) | API keys, env vars, staging vs production |
| [02-evm-wallet.md](./docs/02-evm-wallet.md) | EVM wallet creation, tx lifecycle, approval signing |
| [03-stellar-wallet.md](./docs/03-stellar-wallet.md) | Stellar wallet, XLM auto-funding, contract-call pattern |
| [04-bridge.md](./docs/04-bridge.md) | Sodax quote → swap → poll SOLVED |
| [05-deposit.md](./docs/05-deposit.md) | Defindex deposit via Soroban contract-call |
| [06-withdraw.md](./docs/06-withdraw.md) | Withdraw by underlying amount |
| [07-withdraw-shares.md](./docs/07-withdraw-shares.md) | Withdraw by vault shares (% redemption) |
| [08-gotchas.md](./docs/08-gotchas.md) | 9 known issues with root causes and fixes |

---

## Key Vault Addresses

```
Soroswap Earn USDC (mainnet): CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK
XLM vault (testnet):          CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6
```

---

## Claude Skill

In any Claude Code session within this repository, invoke the integration playbook with:

```
/crossmint-defindex
```

The skill covers the complete integration in a format optimized for LLM consumption,
including all critical signing patterns, gotchas, and code snippets.
