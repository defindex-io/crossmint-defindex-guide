# Crossmint + Sodax + Defindex — Integration Guide

End-to-end reference for integrating Defindex vaults on Stellar using Crossmint smart wallets
and the Sodax cross-chain bridge. Covers wallet creation, deposit, withdraw, withdraw-shares,
and the full Base→Stellar bridge flow.

---

## Quick Navigation

| Document | What it covers |
|---|---|
| [01-prerequisites.md](./01-prerequisites.md) | Crossmint API keys, env vars, staging vs production |
| [02-evm-wallet.md](./02-evm-wallet.md) | EVM smart wallet: create, fund ETH + USDC |
| [03-stellar-wallet.md](./03-stellar-wallet.md) | Stellar smart wallet: create, auto-XLM funding |
| [04-bridge.md](./04-bridge.md) | Sodax bridge: Base USDC → Stellar USDC |
| [05-deposit.md](./05-deposit.md) | Deposit into Defindex vault (Soroban contract-call) |
| [06-withdraw.md](./06-withdraw.md) | Withdraw by underlying amount |
| [07-withdraw-shares.md](./07-withdraw-shares.md) | Withdraw by vault shares (percentage redemption) |
| [08-gotchas.md](./08-gotchas.md) | Known issues and their fixes |

---

## Architecture Overview

```
[Crossmint EVM Smart Wallet — Base (ERC-4337)]
       │
       │  1. ERC-20 approve  (Crossmint REST → sign hex bytes → onChain)
       │  2. createIntent    (Crossmint REST → sign hex bytes → onChain)
       ▼
[Sodax Spoke Contract — Base]
       │
       │  Relayer picks up intent
       ▼
[Sodax Hub — Sonic Chain]
       │
       │  Solver fills intent → SOLVED
       ▼
[Crossmint Stellar Smart Wallet — receives USDC]
       │
       │  No Horizon polling needed — Crossmint handles delivery internally
       ▼
[Defindex Vault — Soroban contract-call via Crossmint REST]
       │
       │  POST /transactions (type: contract-call, method: deposit)
       │  Sign base64 XDR with STELLAR_SERVER_KEY
       │  POST /approvals
       ▼
[Vault shares issued to Stellar wallet]
```

---

## Key Differences from Privy

| Aspect | Crossmint | Privy |
|---|---|---|
| EVM wallet type | Smart wallet (ERC-4337) | EOA (TEE) |
| Auth primitive | `EVM_PRIVATE_KEY` as adminSigner | P-256 Authorization Key |
| Stellar deposit | `contract-call` via Crossmint REST | Manual XDR build + `rawSign` + Horizon POST |
| Horizon polling | Not needed | Required before Defindex deposit |
| XLM funding | Auto on wallet creation | Manual |
| EVM approval msg | Raw hex bytes (`ethers.getBytes()`) | N/A |
| Stellar approval msg | Base64 XDR (`Buffer.from(msg, "base64")`) | N/A |

---

## Chain and Token Reference

```ts
// Base mainnet
USDC_BASE   = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  // 6 decimals

// Base sepolia (staging)
USDXM_BASE  = "0x14196F08a4Fa0B66B7331bC40dd6bCd8A1dEeA9F"  // 6 decimals

// Stellar (mainnet + testnet share same USDC SAC)
USDC_SAC    = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75"  // 7 decimals
USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"

// Defindex vaults
SOROSWAP_EARN_USDC = "CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK"  // mainnet
XLM_VAULT_TESTNET  = "CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6"  // testnet

// Decimals
XLM/USDC on Stellar: 7 decimals → 1 token = 10_000_000 stroops
USDC on Base:        6 decimals → 1 USDC  = 1_000_000
```

---

## Runnable Examples

```bash
pnpm install
cp .env.example .env
# Fill in: CROSSMINT_SERVER_API_KEY, CROSSMINT_WALLET_EMAIL, EVM_PRIVATE_KEY, STELLAR_SERVER_KEY

pnpm example:evm              # EVM smart wallet address + balances
pnpm example:stellar          # Stellar smart wallet address
pnpm example:deposit          # Deposit into testnet vault (CROSSMINT_ENV=staging)
pnpm example:withdraw         # Withdraw by amount (testnet)
pnpm example:withdraw-shares  # Withdraw by shares (testnet)
pnpm example:bridge           # Full mainnet bridge (CROSSMINT_ENV=production)
```
