# Validation — Stellar mainnet deposit + USDC pre-deposit check

## Automated

- **Typecheck passes.** Run the TypeScript compiler in no-emit mode
  (`pnpm exec tsc --noEmit`, or `pnpm typecheck` if/when it exists). No new type
  errors introduced.
- Helper `getStellarDepositBalance` returns a `bigint` in stroops and `0n` (not a
  throw) when the wallet holds none of the token. Reads the **C-address** token
  balance via the Crossmint balances API (Soroban RPC fallback): XLM on testnet,
  USDC SAC on mainnet, per `config.stellar.depositAsset`. Does **not** use Horizon.
- `config.stellar.network === "mainnet"` when `CROSSMINT_ENV=production`, and
  `"testnet"` otherwise; passphrase, Horizon URL, vault, and USDC issuer switch
  together with it (assert by reading `config` under both env values).

## Manual

1. **Staging, sufficient balance:** `CROSSMINT_ENV=staging pnpm example:deposit`
   prints `Environment: staging` / `Network: testnet`, passes the gate, and
   completes a deposit with a testnet explorer link.
2. **Insufficient balance gate:** with a wallet below the deposit amount, the
   example prints required vs available USDC + the wallet address and exits
   non-zero **before** any Crossmint `POST /transactions` call (verify no tx is
   created).
3. **Production wiring (dry):** with `CROSSMINT_ENV=production`, the header
   prints `Network: mainnet`, the mainnet USDC vault address, and a
   `stellar.expert/explorer/public/...` link. (Running a real mainnet deposit is
   optional and uses real funds — gate behavior can be verified without
   completing it.)
4. **No secrets logged:** scan the example output — only addresses, balances,
   amounts, and tx hashes appear; never `STELLAR_SERVER_KEY` or API keys.

## Tone / copy check

- Insufficient-balance message is actionable: states asset, required amount,
  available amount, and wallet address.
- Header output matches the existing examples' step-numbered, boxed style.

## Three-surface sync

- `.env.example`, the relevant `docs/` page, and
  `.claude/skills/crossmint-defindex.md` all describe the production/mainnet path
  and the balance gate consistently with the code.

## Definition of done

- [ ] Network selection (passphrase, Horizon, vault, USDC issuer) is config-driven
      via `CROSSMINT_ENV` and centralized in `src/shared/config.ts`.
- [ ] `getStellarDepositBalance` helper exists, is reusable, and is asset-aware.
- [ ] `03-deposit.ts` aborts before any on-chain action when balance < amount.
- [ ] Deposit example runs on staging and prints correct network/vault/explorer.
- [ ] Typecheck passes; no new dependencies added.
- [ ] Docs, example, and skill updated and consistent.
- [ ] Roadmap Phase 1 item checked off.
