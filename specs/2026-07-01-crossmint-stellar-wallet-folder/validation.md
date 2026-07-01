# Validation — Phase 3 Crossmint Stellar wallet folder

## Automated

- `pnpm exec tsc --noEmit -p stellar-wallet/tsconfig.json` — typechecks clean.
- Repo-wide typecheck (existing command) still passes; no regressions in `src/`.
- The folder imports nothing from `src/` — verify with
  `grep -rn "from \"\.\./\.\./src\|from \"src/" stellar-wallet/` returning no
  matches.
- **No dead / non-wallet code bundled.** Every file and every exported symbol
  under `stellar-wallet/lib/` is reachable from `main.ts`. There must be **no
  leftover bridge/SODAX/EVM/Defindex-vault code** carried over from the copy:
  - `grep -rniE "sodax|bridge|evm|ethers|vault|defindex" stellar-wallet/lib/`
    returns nothing (except an incidental comment); no such files exist under
    `stellar-wallet/lib/` (no `sodax*.ts`, no `crossmint-evm-wallet.ts`, no
    `crossmint-defindex-wallet.ts`, no `bridge-types.ts`).
  - Typecheck with `noUnusedLocals` / `noUnusedParameters` (already on in the
    shared tsconfig) passes, and a dead-export scan (e.g. `ts-prune` or a manual
    grep that each exported name in `lib/` is imported somewhere) shows no unused
    exports. Trim any config field, helper, or import that only existed to serve
    the bridge/vault flow.

## Manual

1. **First run (create):** with a fresh `CROSSMINT_WALLET_EMAIL`, run
   `pnpm stellar-wallet`. Expect: logs "not found... creating", prints a Stellar
   **C-address** (starts with `C`), prints adminSigner **G-address**, prints
   balances (XLM ≥ 0 from auto-fund, USDC likely 0). Exits 0.
2. **Second run (idempotent):** run `pnpm stellar-wallet` again. Expect: **no**
   creation log, **same** C-address returned, balances printed again. Nothing
   created on-chain.
3. **Balances source:** confirm balances come from Soroban RPC / Crossmint API,
   not Horizon (no Horizon URL in code or network calls).
4. **Transfer skipped by default:** with `STELLAR_TRANSFER_TO` unset, run — the
   transfer step logs "skipped" and the script still finishes with address +
   balances. No transaction is created.
5. **Testnet XLM transfer:** `CROSSMINT_ENV=staging`, set `STELLAR_TRANSFER_TO`
   and a small `STELLAR_TRANSFER_AMOUNT`, run — expect a contract-call to the
   native XLM SAC, a printed on-chain tx hash, and the sender's XLM balance drops
   by ~amount (+fee) on the re-printed balances.
6. **Mainnet USDC path + gate:** `CROSSMINT_ENV=production`. With the wallet
   underfunded, expect the balance gate to log and skip cleanly (no tx). With
   sufficient USDC, expect a `transfer` contract-call to the USDC SAC and a
   printed tx hash. (Run underfunded first to see the gate.)
7. **Missing-env guard:** unset `STELLAR_SERVER_KEY`, run — expect a clear error
   message and non-zero exit, no stack-trace spam, no secret printed.
8. **No secret leakage:** scan run output — only C-address, adminSigner public
   key, balances, and tx hashes appear; no private keys or API key.

## Tone check

- `stellar-wallet/README.md` reads as a short linear walkthrough matching
  `showcase/README.md`: what-it-does → prerequisites → env table → run command →
  expected output. The C-address vs G-address gotcha is explicitly called out.

## Definition of done

- [ ] `stellar-wallet/` folder is self-contained (own `lib/`, `tsconfig.json`,
      `README.md`, `main.ts`); no imports from `src/`.
- [ ] `pnpm stellar-wallet` creates-or-reuses the wallet and prints C-address +
      balances.
- [ ] Second run is idempotent (same address, nothing created).
- [ ] Balances via Soroban RPC / Crossmint API only.
- [ ] Transfer works: XLM on testnet, USDC on mainnet, via SAC `transfer`
      contract-call; skipped when `STELLAR_TRANSFER_TO` unset; mainnet
      balance-gated.
- [ ] Typecheck passes; no new runtime dependencies; `.env.example` updated with
      `STELLAR_TRANSFER_TO` / `STELLAR_TRANSFER_AMOUNT`.
- [ ] Roadmap Phase 3 item checked `[x]`.
