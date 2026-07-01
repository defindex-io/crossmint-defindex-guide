# Crossmint Stellar wallet — create → inspect → transfer

A **self-contained**, one-command demo of a Crossmint smart wallet on Stellar:

> Get-or-create a Crossmint **Stellar smart wallet** → read its balances →
> optionally **transfer** funds out (USDC on mainnet, XLM on testnet).

Wallet-native operations only — **no bridge, no vault, no Defindex**. It bundles
its own copy of the clients under `stellar-wallet/lib/`, so you can read, lift,
and run this folder on its own — it does **not** import from `src/`.

## ⚠️ C-address, not G-address

Crossmint Stellar smart wallets are **Soroban smart-contract wallets**. The wallet
address is a contract **C-address** (`C...`), not a classic ed25519 **G-address**.
Consequences:

- Balances are **not** on Horizon — they're read by simulating the token SAC's
  `balance(C-address)` over **Soroban RPC**.
- The `STELLAR_SERVER_KEY` ed25519 key is only the **admin signer** (a `G...`
  address); it authorizes transactions but is not the wallet itself.

## Network drives the asset

| `CROSSMINT_ENV` | Network | Transfer asset |
|---|---|---|
| `staging` | Stellar **testnet** | **XLM** (free to move) |
| `production` | Stellar **mainnet** | **USDC** (real funds — balance-gated) |

Creating and inspecting the wallet move no funds, so either environment is safe.
The transfer step is the only fund-moving action: on mainnet it is **gated** on a
sufficient-balance check (underfunded ⇒ skipped cleanly). The recipient comes from
`STELLAR_TRANSFER_TO`, or — if that's unset — you're **prompted for it at runtime**
(blank input skips the transfer).

## Prerequisites

- A Crossmint server API key (`sk_...`) for the target environment.
- A Stellar server key (`STELLAR_SERVER_KEY`) — the wallet's admin signer.
- For a mainnet transfer: the wallet funded with ≥ `STELLAR_TRANSFER_AMOUNT` USDC.
  The first run prints the wallet C-address to fund.

## Environment

Set these in the repo-root `.env` (see `.env.example`):

| Var | Purpose |
|---|---|
| `CROSSMINT_SERVER_API_KEY` | Server key, `sk_...` |
| `CROSSMINT_WALLET_EMAIL` | Wallet identity used in the locator |
| `CROSSMINT_ENV` | `staging` (testnet) or `production` (mainnet) |
| `STELLAR_SERVER_KEY` | Stellar ed25519 secret — the wallet's admin signer |
| `STELLAR_SOROBAN_RPC_URL` | Optional Soroban RPC override (defaults per network) |
| `STELLAR_TRANSFER_TO` | Recipient address; unset ⇒ prompted at runtime (blank skips) |
| `STELLAR_TRANSFER_AMOUNT` | Amount in human units, e.g. `0.1` |

## Run

```bash
pnpm stellar-wallet
```

### What you'll see

1. `[1]` Wallet — get-or-create; prints whether it was **found** or **created**,
   the wallet **C-address**, and the admin-signer **G-address**. Run it twice: the
   second run reuses the same address and creates nothing (idempotent).
2. `[2]` Balances — XLM (and USDC on mainnet), read over Soroban RPC.
3. `[3]` Transfer — prompts for a recipient if `STELLAR_TRANSFER_TO` is unset
   (blank skips); otherwise sends the network asset (mainnet gated on balance),
   prints the on-chain tx hash, and re-prints balances.

No secrets are ever logged — only the C-address, admin-signer public key,
balances, and tx hashes.
