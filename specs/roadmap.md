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

- [x] Self-contained folder for creating and using a Crossmint wallet on Stellar (create, inspect balances, transfer USDC on mainnet / XLM on testnet)

## Phase 4 — One-page integration guide

- [ ] Single-page guide teaching how to integrate Defindex using a Crossmint Stellar wallet

## Phase 5 — Guide implementation (accuracy test)

- [ ] Self-contained folder implementing the Phase 4 guide from a Crossmint Stellar wallet, validating the guide is accurate

---

## Backlog (unscheduled)

Ideas not yet slotted into a numbered phase.

- [ ] **Graceful insufficient-balance handling on transfer/deposit.** When the
  Crossmint wallet lacks funds, the REST API returns a `422 execution_reverted`
  whose `revert.reasonData.simulationData` contains a SAC `contract_call_error`
  like *"Balance error in SAC contract … The sender's balance is too low for the
  requested amount."* Today this surfaces as a raw wall of JSON. Instead:
  (a) apply the balance gate on **all** networks, not just mainnet (testnet XLM
  transfers currently bypass it and hit this revert); and (b) parse the Crossmint
  422 revert payload to detect the insufficient-balance case and print a concise,
  actionable message (asset, required vs available, wallet address to fund)
  rather than the full simulation dump.
