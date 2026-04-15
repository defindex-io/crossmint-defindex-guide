# POC Roadmap — Crossmint + Sodax + Defindex

Each task extends or verifies the existing examples. The core integration (deposit, bridge)
is already implemented. Outstanding work focuses on verification, production readiness, and
additional patterns.

---

## Priority 1 — Verify Withdraw + Withdraw-Shares Contract Args

The `withdraw` and `withdraw_shares` Soroban contract-call args are **inferred** from the
Defindex API naming. They must be confirmed against the live contract or with the Defindex team.

- [ ] Contact Defindex team or inspect contract ABI: confirm `withdraw` method args
      (expected: `amounts_to_withdraw: Vec<i128>`, `from: Address`)
- [ ] Confirm `withdraw_shares` method args
      (expected: `shares_amount: i128`, `from: Address`)
- [ ] Test `pnpm example:withdraw` on testnet — verify txHash and amount returned
- [ ] Test `pnpm example:withdraw-shares` on testnet — verify share redemption
- [ ] Update `src/wallets/crossmint-defindex-wallet.ts` if arg names differ
- [ ] Update `docs/06-withdraw.md` and `docs/07-withdraw-shares.md` with confirmed args
- [ ] Remove `// NOTE: verify with Defindex team` comments after confirmation

---

## Priority 2 — Mainnet E2E Test

- [ ] Run `pnpm example:bridge` with real USDC on Base mainnet
- [ ] Verify USDC arrives on Stellar Crossmint wallet after SOLVED
- [ ] Verify Defindex deposit TX is confirmed on Stellar explorer
- [ ] Document actual gas cost for EVM side + Stellar fees

---

## Priority 3 — Multi-Vault Batch Deposit

- [ ] `src/examples/07-batch-deposit.ts` — deposit into multiple vaults after a single bridge
- [ ] Handle sequential vs parallel deposits (Stellar sequence number conflicts if parallel)
- [ ] Document recommended pattern: sequential deposits from one wallet

---

## Priority 4 — Auto-Compound Cron Script

- [ ] `src/examples/08-auto-compound.ts`:
  - Check vault shares balance
  - Withdraw yield (shares above initial deposit)
  - Re-deposit into same vault
  - Skip if position below threshold
- [ ] Document: how to detect yield (share price appreciation vs raw balance)

---

## Priority 5 — Staging End-to-End Test

- [ ] Verify staging flow (`CROSSMINT_ENV=staging`, `base-sepolia`, USDXM token)
- [ ] Confirm USDXM bridging works through Sodax (Sodax always uses mainnet chain IDs)
- [ ] Document staging-specific behavior: USDXM vs USDC, testnet vault addresses

---

## Priority 6 — Crossmint vs Privy Comparison Guide

- [ ] `docs/09-crossmint-vs-privy.md` — side-by-side comparison:
  - Wallet model (smart wallet vs TEE EOA)
  - Signing patterns (REST + approval vs rawSign)
  - XLM funding (auto vs manual)
  - Defindex interaction (contract-call vs XDR build + Horizon)
  - When to choose each

---

## Completed

- [x] EVM smart wallet: get/create with external-wallet adminSigner (`01-evm-wallet.ts`)
- [x] Stellar smart wallet: get/create with external-wallet adminSigner (`02-stellar-wallet.ts`)
- [x] Defindex deposit via Soroban contract-call (`03-deposit.ts`, `crossmint-defindex-wallet.ts`)
- [x] Defindex withdraw by amount — implementation (`04-withdraw.ts`) [needs verification]
- [x] Defindex withdraw by shares — implementation (`05-withdraw-shares.ts`) [needs verification]
- [x] Full mainnet bridge: Base → Stellar → Defindex (`06-full-bridge.ts`)
- [x] Documentation: all 8 docs + gotchas
- [x] Claude skill file (`.claude/skills/crossmint-defindex.md`)
