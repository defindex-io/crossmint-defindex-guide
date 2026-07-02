# Plan — Phase 3 Crossmint Stellar wallet folder

Target: a new top-level `stellar-wallet/` folder, structured like `showcase/`.

## 1. Folder scaffold

1. Create `stellar-wallet/` with subfolders `stellar-wallet/lib/shared/` and
   `stellar-wallet/lib/wallets/`.
2. Add `stellar-wallet/tsconfig.json` copied from `showcase/tsconfig.json`
   (adjust any relative paths if present).

## 2. Bundle the minimal code (verbatim from src/)

1. Copy `src/shared/config.ts` → `stellar-wallet/lib/shared/config.ts`.
2. Copy `src/shared/crossmint-rest.ts` → `stellar-wallet/lib/shared/crossmint-rest.ts`.
3. Copy `src/wallets/crossmint-stellar-wallet.ts` →
   `stellar-wallet/lib/wallets/crossmint-stellar-wallet.ts`.
4. Copy any transitive imports those files need (e.g. constants used by
   `config.ts` such as the Stellar mainnet chain-id module). Follow the exact set
   `showcase/lib/` bundles; drop EVM/SODAX/Defindex-only files not needed here.
5. Reuse the Stellar sign→approve→poll helpers: lift `approveStellarTx` and
   `pollStellarTx` (and the `postTransaction`/`postApproval`/`getTransaction`
   REST methods) from `src/wallets/crossmint-defindex-wallet.ts` into the bundle
   as a generic `stellarTransfer(...)` — same machinery, `transfer` method on a
   SAC instead of a vault method.
6. Fix relative import paths inside the copied files to resolve within
   `stellar-wallet/lib/` (mirror how `showcase/lib/` was rewired).
7. **Strip non-wallet leftovers from the copies.** The copied `crossmint-rest.ts`
   must not drag in the EVM path: remove the `ethers`/`config.evmPrivateKey`
   admin-signer field and the EVM-only methods (`getOrCreateEvmWallet`,
   `sendTransactionAndGetHash`, `approveEvmTransaction`, EVM polling). Keep only
   what the Stellar create/inspect/transfer flow calls. Likewise trim `config.ts`
   fields that only served bridge/EVM/vault. Target: `grep -riE
   "sodax|bridge|evm|ethers|vault|defindex" stellar-wallet/lib/` comes back
   clean (see validation).

## 3. Balance read helper

1. Ensure the copied `crossmint-stellar-wallet.ts` exposes a balance reader
   using the existing `simulateRead` Soroban path (SAC `balance` on the USDC
   contract, and XLM via native SAC / Crossmint API).
2. If a clean exported `getBalances(restClient, address)` does not already exist,
   add a thin wrapper in the copied file that returns `{ xlm, usdc }` — no
   Horizon, decimals from `config.stellar`.

## 4. Transfer helper

1. Add `stellarTransfer(restClient, walletAddress, keypair, sac, to, amount)`
   using the lifted sign→approve→poll machinery: `postTransaction` with
   `type: "contract-call"`, `contractId: <SAC>`, `method: "transfer"`,
   `args: { from: walletAddress, to, amount: <i128 stroops> }` → `approveStellarTx`
   → `pollStellarTx`. Returns the on-chain tx hash.
2. Resolve asset from network: `production` → USDC SAC + decimals from
   `config.stellar`; `staging` → native XLM SAC. Convert `STELLAR_TRANSFER_AMOUNT`
   (human units) to stroops with the right decimals.

## 5. Entry point `stellar-wallet/main.ts`

1. Load env via the bundled `config.ts`.
2. Instantiate `CrossmintRestClient(config.apiKey, config.baseUrl)`.
3. `[1]` Get-or-create the Stellar wallet; log found vs created; print the
   C-address and the adminSigner public key.
4. `[2]` Fetch and print balances (XLM, USDC) for that address.
5. `[3]` Transfer step: if `STELLAR_TRANSFER_TO` is unset, log "transfer skipped"
   and finish. Otherwise pick the network asset, run the mainnet balance gate
   (skip cleanly if underfunded), then `stellarTransfer(...)` and print the tx
   hash. Re-print balances after.
6. Print a short summary block; exit cleanly. Never print secrets.
7. Guard: if `CROSSMINT_SERVER_API_KEY` / `STELLAR_SERVER_KEY` missing, print a
   clear message and exit non-zero.

## 6. Wiring

1. Add `"stellar-wallet": "tsx stellar-wallet/main.ts"` to `package.json`
   scripts (next to `"showcase"`).
2. Add `STELLAR_TRANSFER_TO` and `STELLAR_TRANSFER_AMOUNT` to root
   `.env.example` with comments.

## 7. README

1. Write `stellar-wallet/README.md` following `showcase/README.md` shape:
   title + one-line what-it-does, "self-contained / does not import from src/"
   note, prerequisites, env table (incl. `STELLAR_TRANSFER_*`), run command
   (`pnpm stellar-wallet`), expected output sample, the network→asset rule
   (USDC mainnet / XLM testnet), the mainnet balance-gate note, and the
   C-address vs G-address gotcha callout.

## 8. Docs sync (per mission "three surfaces stay in sync")

1. Verify no `docs/` change is strictly required for a wallet-only folder; if the
   wallet doc (`docs/03-*wallets*`) references this folder pattern, add a pointer.
   Otherwise note in the PR that docs were reviewed and unchanged.
