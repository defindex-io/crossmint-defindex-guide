# Full-capability showcase — EVM → SODAX → Defindex on Stellar

This folder is a **self-contained**, one-command demonstration of everything this
integration does end-to-end:

> Start with USDC in a Crossmint **EVM smart wallet on Base** → bridge it through
> **SODAX** → land it in a Crossmint **Stellar smart wallet** → deposit it into a
> **Defindex vault** on Stellar.

It bundles its own copy of the clients and wallet code (`showcase/lib/`), so you
can read, lift, and run this folder on its own — it does not import from `src/`.
The code is copied verbatim from the proven path in
`src/examples/06-full-bridge.ts`; that file remains the source of truth.

## ⚠️ This is mainnet

The showcase defaults to **production** (`CROSSMINT_ENV=production`) — real USDC,
real funds, real vault. The **balance gate** in step `[2]` is the safeguard: if
the EVM wallet doesn't hold enough ETH + USDC, the run exits cleanly and moves
nothing. Run it once unfunded first to see the gate in action.

## Prerequisites

- A Crossmint **production** server API key (`sk_production_...`).
- An EVM wallet admin signer key and a Stellar server key.
- The Base EVM wallet funded with **≥ 0.001 ETH** (gas) and **≥ `BRIDGE_AMOUNT`
  USDC**. The first run prints the EVM address to fund.
- A Defindex API key + vault address (to perform the final deposit).

## Environment

Set these in the repo-root `.env` (see `.env.example`):

| Var | Purpose |
|---|---|
| `CROSSMINT_SERVER_API_KEY` | Production key, `sk_production_...` |
| `CROSSMINT_WALLET_EMAIL` | Wallet identity used in the locator |
| `CROSSMINT_ENV` | `production` (mainnet) for this showcase |
| `EVM_PRIVATE_KEY` | Admin signer of the EVM smart wallet |
| `STELLAR_SERVER_KEY` | Controls the Stellar wallet |
| `BASE_RPC_URL` | Base mainnet RPC |
| `BRIDGE_AMOUNT` | USDC amount to bridge (e.g. `0.1`) |
| `DEFINDEX_API_KEY` | From the Defindex team |
| `DEFINDEX_VAULT_ADDRESS` | Vault to deposit into (optional — unset skips deposit) |

## Run

```bash
pnpm showcase
```

### What you'll see

The orchestrator logs each phase boundary in order:

1. `[1/5]` Wallets initialized — EVM + Stellar addresses printed.
2. `[2/5]` Balances read → **gate**. Unfunded ⇒ clean exit, nothing moved.
3. `[3/5]` SODAX quote, then swap submitted (Base tx hash).
4. `[4/5]` Poll until the bridge settles on Stellar (Stellar tx hash).
5. `[5/5]` Deposit the settled USDC into the Defindex vault (deposit tx hash).

No secrets are ever logged.

## Going deeper

This folder is the "all at once" view. For the step-by-step breakdown, the
individual operations, and the gotchas, see the repo `docs/` and the per-operation
scripts in `src/examples/`.
