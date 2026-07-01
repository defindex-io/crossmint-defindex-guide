# Phase 2 — Full-capability showcase folder

## Scope

A new **top-level `showcase/` folder** that demonstrates the complete capability
of this integration in one place: starting from an EVM (Base) Crossmint smart
wallet, bridging USDC through **SODAX** to Stellar, and depositing into a
**Defindex** vault on Stellar — the entire EVM → SODAX → Defindex-on-Stellar arc.

The folder is **self-contained**: it bundles its own copy of the clients and
wallet wrappers it needs so it can be read, copied, and run as a standalone
reference without reaching into `src/`.

### Included

| Item | Detail |
|---|---|
| `showcase/` top-level folder | Lives at repo root, separate from `src/` |
| Orchestrator script | Single runnable entrypoint that runs the whole flow end-to-end in sequence: EVM wallet → SODAX bridge → Stellar Defindex deposit |
| Self-contained code | Bundled copy of the needed Crossmint REST client, EVM wallet, Stellar wallet, Sodax service, Defindex vault ops, config — folder stands fully alone |
| `showcase/README.md` | Folder-level walkthrough: what the full capability is, prerequisites, env vars, and how to run it |
| `pnpm` script | A `pnpm showcase` (or similar) entry wired in `package.json` |

### Not included

- No new runtime dependencies (reuse `@sodax/*`, `@stellar/stellar-base`,
  `ethers`, `dotenv`).
- No withdraw / withdraw-by-shares in the showcase (deposit arc only).
- No changes to the existing `src/examples/*` scripts or `docs/`.
- Not a refactor of `src/` — the showcase copies what it needs; `src/` stays.

## Decisions

- **Top-level `showcase/` folder** (not under `src/examples/`) so the full-capability
  demo is discoverable and clearly distinct from the per-operation examples.
- **Self-contained copy** of clients/wallets rather than importing `src/`. This
  trades some duplication for a folder that can be lifted out and run on its own —
  the primary value of a "showcase." Where practical, copied files should track
  their `src/` origin so the "three surfaces stay in sync" principle still holds
  (note origin in a header comment).
- **The existing repo already works end-to-end.** The showcase bundles by
  **copying the proven `src/` code verbatim** (then trimming to the deposit arc) —
  it does NOT re-implement or "improve" the working clients/wallets/services.
  Behaviour parity with the running `src/examples/06-full-bridge.ts` + deposit
  path is the baseline; any deviation must be deliberate and noted.
- **Mainnet showcase**: defaults to production (`CROSSMINT_ENV=production`,
  Stellar mainnet, real USDC) to demonstrate the real end-to-end capability.
  This is a deliberate exception to the testnet-first principle because the
  showcase exists to prove the production flow. Gate execution on a balance /
  explicit-confirm check so it cannot silently move funds.
- **Orchestrator** runs steps sequentially and logs each phase boundary clearly
  (wallet ready → quote → swap → SOLVED → deposit confirmed), never logging secrets.

## Context

- Tone: match existing docs/examples — direct, operational, gotchas surfaced.
- Stack: TypeScript ESM, run via `tsx`, no build step (see `specs/tech-stack.md`).
- Crossmint flow stays **POST /transactions → sign → POST /approvals**; EVM signs
  hex bytes, Stellar signs base64 XDR.
- Reuse the existing env model: keys in `.env`, selection via `CROSSMINT_ENV`.
  Add any new env vars to `.env.example`.
- Existing reference points to copy from: `src/shared/crossmint-rest.ts`,
  `src/shared/sodax-service.ts` (or equivalent), `src/wallets/*`,
  `src/examples/06-full-bridge.ts` (closest existing precedent for the full arc),
  `src/shared/config.ts`.
- Open question for implementation: how much of `src/` to copy verbatim vs.
  trim to the deposit-only path — keep the showcase minimal, only what the arc needs.
