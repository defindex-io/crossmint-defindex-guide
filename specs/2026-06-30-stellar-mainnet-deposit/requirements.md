# Requirements — Stellar mainnet deposit + USDC pre-deposit check

Phase 1 of the roadmap: **Support deposit for Stellar mainnet**, with a USDC
balance gate so a deposit is never attempted from an underfunded wallet.

## Scope

### In scope

1. **Environment-driven Stellar network selection.** Reuse the existing
   `CROSSMINT_ENV` flag (`staging` → testnet, `production` → mainnet) to select
   the Stellar network for the deposit flow, instead of the current mix of a
   hardwired testnet vault constant and mainnet-only `sodax` constants.
2. **USDC balance gate before deposit.** A reusable helper reads the Stellar
   smart wallet's USDC balance and the deposit example aborts — before creating
   any Crossmint transaction — with a clear message if the balance is below the
   deposit amount.
3. **A mainnet-capable deposit example** that resolves vault, network, and asset
   from config rather than from a `NETWORK = "testnet"` literal.
4. **Three-surface sync:** update `.env.example`, the relevant `docs/` page(s),
   and the `crossmint-defindex` skill to describe the production/mainnet path
   and the balance gate.

### Out of scope

- Bridge changes (the `sodax` flow already targets mainnet).
- EVM-side balance checks.
- Withdraw / withdraw-shares examples (deposit only for this phase).
- Any new runtime dependency.

### Config fields (driven by `isStaging`)

| Field | staging (testnet) | production (mainnet) |
|---|---|---|
| Stellar network label | `testnet` | `mainnet` |
| Network passphrase | Test SDF Network ; September 2015 | Public Global Stellar Network ; September 2015 |
| Defindex vault | `XLM_DEFINDEX_VAULT_TESTNET` (XLM vault `CCLV4H7…`) | `SOROSWAP_EARN_USDC_VAULT` (USDC vault `CA2FIPJ…`) |
| Deposit asset | native **XLM** | **USDC** SAC `CCW67TSZ…` (issuer `GA5ZS…`) |
| Balance to gate on | XLM balance of the C-address | USDC SAC balance of the C-address |
| Balance source | Crossmint balances API (Soroban RPC fallback) | Crossmint balances API (Soroban RPC fallback) |

> Vault/asset pairing is confirmed against the Defindex known-addresses table:
> testnet = XLM vault, mainnet = USDC vault. The gate therefore checks XLM on
> testnet and USDC on mainnet; the example must print the active asset.

## Decisions

- **Network selection extends `isStaging` in `src/shared/config.ts`** (chosen over
  a new `STELLAR_NETWORK` var) — keeps a single environment switch, matching the
  existing convention in `specs/tech-stack.md` ("Environment selection via
  `CROSSMINT_ENV`").
- **Balance check = reusable helper + guard in the deposit example** (chosen over
  a standalone script). Helper lives in `src/shared` (or `src/wallets`) and is
  called by `src/examples/03-deposit.ts`, which aborts before any on-chain action
  if `balance < amount`.
- **Balance is read via the Crossmint balances API — not Horizon.** Crossmint
  Stellar smart wallets are **Soroban smart-contract wallets (C-addresses)**:
  `getStellarWalletAddress()` returns `wallet.address` (the contract), while the
  ed25519 G-key is only the adminSigner. Horizon `/accounts/{id}` does **not**
  index contract balances, so the gate reads the wallet's token balance through
  Crossmint's wallet **balances endpoint** via the existing `CrossmintRestClient`
  (`GET /wallets/{locator}/balances?tokens=...`), keyed off
  `config.stellar.depositAsset`. No new runtime dependency.
  - **Mainnet:** USDC SAC balance (`CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`).
  - **Testnet:** the testnet vault is an **XLM** vault, so read XLM balance.
  - The helper is **asset-aware**, keyed off `config.stellar.depositAsset`.
  - **Fallback if the balances endpoint can't be used:** simulate the SAC
    `balance(C-address)` call over **Soroban RPC** — still no new npm dep
    (`@stellar/stellar-base` builds the invocation; submit via `fetch`).
- **Deposit stays on the existing Crossmint contract-call flow.** Deposits go
  through `sendVaultContractCall` (POST /transactions → sign base64 XDR → POST
  /approvals → poll), **not** the Defindex `/deposit`+`/send` REST API. This
  feature only adds network selection + the balance gate around that flow.
- **Defindex `/vault/{addr}/balance` is not the gate source.** That endpoint
  returns vault *shares* (`dfTokens`), not the wallet's spendable token balance,
  so it cannot determine whether a deposit can be funded.

## Context

- **Testnet-first principle (mission.md):** mainnet stays opt-in and clearly
  gated. The deposit example must print the active environment and network, and
  the balance gate must fail loudly with an actionable message (current balance,
  required amount, asset, wallet address) — never a silent or cryptic failure.
- **No secret leakage:** the helper logs balances and addresses only, never keys.
- **Centralized config:** all env/network branching goes through
  `src/shared/config.ts`; examples read from `config`, not from literals.
- **Existing patterns to follow:** `fetch` + bearer-token REST calls as in
  `getUserVaultShares`; the `console.log` step-numbered output style of the
  existing examples; `getStellarWalletAddress(restClient)` to resolve the wallet.
- **Three surfaces stay in sync:** any flow change implies a check of docs,
  examples, and `.claude/skills/crossmint-defindex.md`.
