# Phase 3 — Crossmint Stellar wallet folder

A self-contained folder (`stellar-wallet/`) that creates, inspects, and can move
funds from a Crossmint Stellar smart wallet — **wallet-native operations only**.
No bridge, no vault, no Defindex. It is the minimal, isolated "hello wallet" for
Stellar (create → inspect → transfer), mirroring the conventions of the Phase 2
`showcase/` folder.

## Scope

### In scope

| Capability | Behaviour |
|---|---|
| **Create wallet** | Get-or-create a Crossmint Stellar (Soroban) smart wallet and print its **contract C-address**. XLM is auto-funded by Crossmint on creation. |
| **Idempotent lookup** | Look up an existing wallet by the deterministic locator `email:{CROSSMINT_WALLET_EMAIL}:stellar` before creating; reuse it if present, create only on 404. A second run must return the same address and create nothing. |
| **Fetch/show balances** | Query and display the wallet's balances via **Crossmint API / Soroban RPC — never Horizon** (the wallet is a Soroban C-address, not a classic G-address; see `crossmint-stellar-wallet-is-contract` memory). Show at least XLM and USDC. |
| **Transfer funds** | Send a token out of the wallet to a recipient address via a Soroban SAC `transfer(from, to, amount)` contract-call. **Asset is network-driven: USDC on mainnet (`production`), XLM on testnet (`staging`).** Full sign → approval → poll lifecycle using `STELLAR_SERVER_KEY`. |

### Out of scope

- Any Defindex, bridge (SODAX), or EVM interaction.
- Transferring arbitrary user-chosen assets — asset is fixed by network (USDC
  mainnet / XLM testnet).
- New runtime dependencies.
- Modifying `src/` — this folder is additive and self-contained.

## Decisions

- **Standalone folder.** The folder bundles its own copy of the code it needs
  under `stellar-wallet/lib/` and does **not** import from `src/`, exactly like
  `showcase/lib/`. `src/` remains the source of truth; the copies are lifted
  verbatim from the proven path (`src/wallets/crossmint-stellar-wallet.ts`,
  `src/shared/crossmint-rest.ts`, `src/shared/config.ts`, plus whatever those
  transitively need).
- **Get-or-create by locator.** Reuse the existing `getStellarWalletAddress()`
  logic which already does 404-driven get-or-create against
  `email:{email}:stellar`. This satisfies both "create wallet" and "idempotent
  lookup" with one code path.
- **Balances via Soroban RPC / Crossmint API.** Reuse the existing `simulateRead`
  read-only Soroban path (SAC `balance` call) already present in
  `src/wallets/crossmint-stellar-wallet.ts`. Do not touch Horizon.
- **Transfer via SAC contract-call.** Reuse the exact
  `postTransaction (contract-call) → approveStellarTx → pollStellarTx` machinery
  from `src/wallets/crossmint-defindex-wallet.ts` — the transfer is a
  contract-call to the token's **SAC** address with method `transfer` and args
  `{ from: <wallet C-address>, to: <recipient>, amount: <i128 stroops> }`. The
  SAC and decimals come from `config.stellar` (USDC contract on mainnet; native
  XLM SAC on testnet). No new signing code — same base64-XDR `keypair.sign` path.
- **Network drives the asset.** `CROSSMINT_ENV=production` → transfer USDC;
  `CROSSMINT_ENV=staging` → transfer XLM. The recipient and amount come from env
  (`STELLAR_TRANSFER_TO`, `STELLAR_TRANSFER_AMOUNT`); the transfer step is skipped
  (not failed) when the recipient is unset, so create+inspect still work alone.
- **One-command entry point.** A single `stellar-wallet/main.ts` runnable via a
  `pnpm stellar-wallet` script, matching the `pnpm showcase` pattern.
- **Own `tsconfig.json` + `README.md`** in the folder, like `showcase/`.

## Context

- **Env via repo-root `.env`.** Reuse existing `config.ts` / `.env.example`
  conventions. Required vars: `CROSSMINT_SERVER_API_KEY`, `CROSSMINT_WALLET_EMAIL`,
  `CROSSMINT_ENV`, `STELLAR_SERVER_KEY`. **New vars for the transfer step:**
  `STELLAR_TRANSFER_TO` (recipient address; unset → transfer skipped) and
  `STELLAR_TRANSFER_AMOUNT` (human units, e.g. `0.1`). Add both to
  `.env.example` with comments.
- **Mainnet transfer moves real USDC.** Gate it: before submitting, check the
  wallet holds ≥ the transfer amount; if not, log and skip cleanly (mirror the
  `showcase/` balance-gate safeguard). Testnet XLM is unrestricted.
- **Never log secrets** — print only the wallet C-address, the adminSigner public
  key, and balances.
- **Minimal deps.** No new runtime dependencies; reuse `@stellar/stellar-base`,
  the hand-rolled REST client, and `dotenv`.
- **Tone.** README is a short, linear walkthrough matching `showcase/README.md`:
  what it does, prerequisites, env table, run command, expected output. Call out
  the C-address vs G-address gotcha explicitly.
- **Env default.** The user did **not** select "testnet-first". Create+inspect
  move no funds, so either env is safe; default to whatever repo-root `.env`
  sets and document both. The transfer step is the one fund-moving action —
  guarded on mainnet (balance gate), free on testnet (XLM), and skipped entirely
  when `STELLAR_TRANSFER_TO` is unset.
