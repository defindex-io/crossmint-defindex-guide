# Tech Stack

## Language & runtime

- **TypeScript** (strict mode), `target` ES2022, `module`/`moduleResolution`
  NodeNext. ESM only (`"type": "module"`).
- **Node.js** via [`tsx`](https://github.com/privatenumber/tsx) for running
  `.ts` example scripts directly (no build step for examples).
- Package manager: **pnpm** (`pnpm-lock.yaml` is the source of truth).

## Runtime dependencies

| Package | Purpose |
|---|---|
| `@sodax/sdk`, `@sodax/types`, `@sodax/wallet-sdk-core` (1.2.7-beta) | Cross-chain bridge: quote → swap → poll SOLVED |
| `@stellar/stellar-base` (^12) | Stellar/Soroban transaction + XDR handling |
| `ethers` (^6) | EVM signing (adminSigner over ERC-4337 smart wallet) |
| `dotenv` (^16) | Loads `.env` config |

Crossmint is accessed over its **REST API** via a hand-rolled client
(`src/shared/crossmint-rest.ts`) — there is no Crossmint SDK dependency.

## Dev dependencies

`typescript` ^5.7, `tsx` ^4.19, `@types/node` ^25.

## Project layout

```
docs/            Linear integration guides (00-overview → 08-gotchas)
src/shared/      Crossmint REST client, Sodax service, config, adapters, types
src/wallets/     EVM wallet, Stellar wallet, Defindex vault operations
src/examples/    6 runnable scripts (one per pnpm example:* script)
.claude/skills/  crossmint-defindex.md — LLM integration playbook
specs/           Mission, roadmap, tech-stack, and per-feature spec folders
```

## Conventions

- One example script per top-level operation, named `NN-<operation>.ts`,
  wired to a `pnpm example:<name>` script in `package.json`.
- Config and env-var access is centralized in `src/shared/config.ts`.
- Crossmint flow is always **POST /transactions → sign → POST /approvals**;
  EVM signs hex bytes, Stellar signs base64 XDR.
- Environment selection via `CROSSMINT_ENV` (`staging` | `production`).

## Constraints

- **No new runtime dependencies without user approval.** Prefer the existing
  REST client and SDKs.
- Keep examples runnable with `tsx` — no bundler, no transpile-then-run.
- Never log secrets; all keys come from `.env` (see `.env.example`).
