# Phase 2 — Implementation plan

## 1. Folder scaffold

1. Create top-level `showcase/` at repo root.
2. Create `showcase/lib/` for the bundled, self-contained code.
3. Decide the minimal file set the deposit arc needs (see group 2).

## 2. Bundle self-contained code into `showcase/lib/`

Copy the **proven, working `src/` code verbatim**, then trim only what the
EVM → SODAX → Stellar-deposit arc does not need. Do not re-implement or refactor
the working logic. Each copied file gets a header comment noting its `src/`
origin (keep surfaces in sync).

1. Crossmint REST client (`transactions → sign → approvals`).
2. Config / env loader — extend to surface mainnet defaults for the showcase.
3. EVM smart wallet (ERC-4337 on Base) creation + signing.
4. Stellar smart wallet (Soroban contract-call signing).
5. Sodax bridge service (quote → swap → poll SOLVED).
6. Defindex vault deposit operation (deposit only — no withdraw).
7. Shared types/adapters needed by the above.

## 3. Orchestrator script

1. `showcase/main.ts` — single entrypoint running the full flow in sequence:
   - resolve config (mainnet defaults, explicit confirm/balance gate),
   - ensure/create EVM wallet, report address + USDC balance,
   - request SODAX quote, execute swap, poll until SOLVED,
   - confirm Stellar wallet + USDC arrival,
   - deposit into Defindex vault, confirm vault shares.
2. Clear per-phase logging with boundaries; never log secrets.
3. Fail fast with actionable messages if a gate (balance/confirm) is unmet.

## 4. Wiring

1. Add `"showcase": "tsx showcase/main.ts"` to `package.json` scripts.
2. Add any new env vars to `.env.example`.

## 5. Documentation

1. `showcase/README.md`:
   - what the full capability demonstrates (the whole arc, one command),
   - prerequisites + required env vars,
   - mainnet warning and the gating behaviour,
   - how to run (`pnpm showcase`), expected output per phase,
   - pointer back to `docs/` and `src/examples/` for deeper detail.

## 6. Sync check

1. Verify the showcase matches the documented flow in `docs/` and the behaviour
   in `src/examples/06-full-bridge.ts` + deposit example; note any divergence.
