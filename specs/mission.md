# Mission

## What this project is

`crossmint-defindex-guide` is an **integration guide and runnable reference
implementation** for moving assets into and out of [Defindex](https://defindex.io)
vaults on Stellar, using [Crossmint](https://crossmint.com) smart wallets for
custody/signing and the [Sodax](https://sodax.com) bridge for cross-chain transfers.

It is two things at once:

1. **Documentation** (`docs/`) — a linear, step-by-step playbook that takes a
   developer from zero (API keys) to a completed Base USDC → Stellar → Defindex
   vault deposit, with every gotcha called out.
2. **Runnable code** (`src/`) — six TypeScript example scripts, plus the shared
   clients and wallet wrappers they depend on, that execute every operation
   end-to-end against testnet (staging) or mainnet (production).

A third artifact, `.claude/skills/crossmint-defindex.md`, packages the whole
integration as an LLM-optimized skill so an AI agent can perform the integration.

## Who it's for

Developers integrating Defindex vaults who need a worked, copy-pasteable example
of the Crossmint smart-wallet signing flow (EVM ERC-4337 + Stellar Soroban
contract-calls) and the Sodax cross-chain bridge — without having to reverse-engineer
the transaction → sign → approval lifecycle from scratch.

## Principles

- **Runnable over theoretical.** Every documented step maps to an example script
  that actually executes. If it's in the docs, it runs.
- **Testnet-first.** Staging/testnet is the default path; mainnet is opt-in and
  clearly gated.
- **Gotchas are first-class.** Known failure modes are documented with root cause
  and fix, not hidden.
- **Three surfaces stay in sync.** Docs, example code, and the Claude skill
  describe the same flow; a change to one implies a check of the others.
- **No secret leakage.** Keys live in `.env`; examples never log secrets.

## Success looks like

A developer (or an AI agent via the skill) can go from a fresh Crossmint account
to a confirmed vault deposit by following the docs and running the examples,
encountering no undocumented surprises.
