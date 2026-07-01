# Phase 2 — Validation

## Automated

- `pnpm tsc --noEmit` (or the project's typecheck) passes with the new
  `showcase/` folder included.
- `showcase/main.ts` and everything in `showcase/lib/` typecheck under the
  repo's strict TS config; no new runtime dependencies added to `package.json`.
- `pnpm showcase` is a valid, resolvable script.

## Manual

1. **Standalone check** — confirm `showcase/` does not import from `../src`; it
   only references its own `showcase/lib/`. The folder reads as self-contained.
2. **Dry config gate** — run `pnpm showcase` without funds / without confirm and
   verify it stops at the balance/confirm gate with a clear, actionable message
   and moves no funds.
3. **Full mainnet run (funded)** — with a funded Base USDC wallet and confirm set,
   run `pnpm showcase` and observe each phase boundary log:
   EVM wallet ready → SODAX quote → swap submitted → SOLVED → Stellar USDC
   arrived → Defindex deposit confirmed (vault shares returned).
4. **Secret safety** — scan output: no private keys, API keys, or full secrets
   are logged at any phase.
5. **README walkthrough** — follow `showcase/README.md` from scratch; every
   prerequisite and env var it lists is sufficient to run, with no undocumented
   surprises.

## Tone check

- `showcase/README.md` matches the existing docs voice: direct, operational,
  gotchas surfaced, mainnet risk clearly flagged.

## Definition of done

- Top-level `showcase/` folder exists, self-contained, runnable via `pnpm showcase`.
- Orchestrator runs the full EVM → SODAX → Defindex-on-Stellar deposit arc on
  mainnet, gated so it cannot silently move funds.
- `showcase/README.md` documents the capability, prerequisites, and run steps.
- `.env.example` updated for any new vars; typecheck passes; no new deps.
- `roadmap.md` Phase 2 item can be checked once merged.
