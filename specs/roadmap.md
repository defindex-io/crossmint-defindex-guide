# Roadmap

Phases are ordered. The **next phase to spec** is the first phase whose items
are all unchecked (`[ ]`). Completed work is marked `[x]`.

---

## Phase 0 — Core integration (shipped)

- [x] Crossmint REST client (transactions → sign → approvals)
- [x] EVM smart wallet (ERC-4337 on Base) creation + signing
- [x] Stellar smart wallet creation + Soroban contract-call signing
- [x] Sodax bridge service (quote → swap → poll SOLVED)
- [x] Defindex vault deposit / withdraw / withdraw-by-shares
- [x] 6 runnable example scripts wired to `pnpm example:*`
- [x] Docs 00–08 (overview → prerequisites → wallets → bridge → ops → gotchas)
- [x] `crossmint-defindex` Claude skill + install script

## Phase 1 — Stellar mainnet deposit

- [x] Support deposit for Stellar mainnet

## Phase 2 — Full-capability showcase folder

- [x] Self-contained folder demonstrating the complete flow: EVM → SODAX → Defindex on Stellar

## Phase 3 — Crossmint Stellar wallet folder

- [ ] Self-contained folder for creating and using a Crossmint wallet on Stellar (wallet only, nothing else)

## Phase 4 — Stellar wallet Defindex deposit folder

- [ ] Self-contained folder where a Crossmint Stellar wallet deposits into Defindex
