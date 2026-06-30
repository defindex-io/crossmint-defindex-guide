# Plan — Stellar mainnet deposit + USDC pre-deposit check

Task groups are ordered but each is independently implementable.

## 1. Config — network selection

1. In `src/shared/config.ts`, add a `stellar` block driven by `isStaging`:
   - `network`: `"testnet" | "mainnet"`
   - `networkPassphrase`: Test vs Public passphrase strings
   - `sorobanRpcUrl`: testnet vs mainnet Soroban RPC base URL (fallback path)
   - `depositVault`: `XLM_DEFINDEX_VAULT_TESTNET` vs `SOROSWAP_EARN_USDC_VAULT`
   - `depositAsset`: `{ symbol: "XLM", contract: <native SAC> }` on testnet vs
     `{ symbol: "USDC", contract: sodax.stellarUsdc }` on mainnet — drives the
     gate (which token balance to read) and the example's asset label
2. Keep the existing exported vault constants; reference them from the new block.
3. Add any new `.env` knobs (if needed, e.g. `STELLAR_HORIZON_URL` override) with
   sensible defaults so nothing is required beyond `CROSSMINT_ENV`.

## 2. Balance helper

1. Add `getStellarDepositBalance(restClient, walletAddress): Promise<bigint>`
   (stroops, 7 decimals) in `src/wallets/crossmint-stellar-wallet.ts`.
2. Primary implementation: call the Crossmint balances endpoint through
   `CrossmintRestClient` for the Stellar wallet locator, select the token matching
   `config.stellar.depositAsset.contract`, and return its raw amount as stroops.
   Add a `getStellarBalances`/`getTokenBalance` method to `CrossmintRestClient`
   if one doesn't exist. Return `0n` when the token is absent.
3. Fallback (if Crossmint doesn't expose the balance): simulate the SAC
   `balance(C-address)` invocation over Soroban RPC (`config.stellar.sorobanRpcUrl`)
   using `@stellar/stellar-base` to build the op + `fetch` to POST `simulateTransaction`,
   then parse the i128 result. No new npm dependency either way.
4. The wallet address is the **C-address** from `getStellarWalletAddress()`, not
   the adminSigner G-key.

## 3. Deposit example — mainnet + gate

1. Update `src/examples/03-deposit.ts`:
   - Remove the `NETWORK = "testnet"` literal and the hardcoded
     `XLM_DEFINDEX_VAULT_TESTNET`; read `config.stellar.network`,
     `config.stellar.depositVault`, and `config.stellar.depositAsset`.
   - Print environment, network, vault, asset label, and amount in the header.
   - After resolving the wallet address, call `getStellarDepositBalance`; if
     `balance < amount`, print required vs available + asset + wallet address and
     `process.exit(1)` **before** any `postTransaction`. Deposit continues to use
     `depositToDefindexVault` (Crossmint contract-call), not the Defindex REST API.
   - Build the correct explorer URL for the active network.
2. Keep the deposit amount configurable (env `BRIDGE_AMOUNT`/new var) and
   correctly scaled for the active asset's decimals.

## 4. Three-surface sync

1. `.env.example`: document that `CROSSMINT_ENV=production` selects Stellar
   mainnet; add any new optional vars with comments.
2. `docs/`: update the deposit/ops page to describe the mainnet path and the
   USDC balance gate (insufficient-balance behavior).
3. `.claude/skills/crossmint-defindex.md`: reflect the env-driven network
   selection and the pre-deposit balance check.

## 5. Validation

1. Run the project's typecheck (see `validation.md`); fix any type errors.
2. Run `pnpm example:deposit` against staging and confirm the gate + network
   output behave as specified.
