# Sodax Bridge: Base → Stellar

Cross-chain swap of USDC from Base (EVM) to Stellar using the Sodax intent protocol.
The Crossmint EVM smart wallet executes the swap via the REST API.

---

## Architecture

```
Crossmint EVM Smart Wallet (Base)
  │  1. ERC-20 approve (via Crossmint REST)
  │  2. createIntent   (via Crossmint REST)
  ▼
Sodax Spoke Contract (Base)
  │  Relayer picks up intent
  ▼
Sodax Hub (Sonic chain)
  │  Solver fills intent → SOLVED
  ▼
Crossmint Stellar Wallet receives USDC
```

---

## Step 1 — Initialize Sodax

```ts
import { Sodax } from "@sodax/sdk";

const sodax = new Sodax();
const result = await sodax.initialize();
if (!result.ok) throw new Error(`Init failed: ${result.error}`);
```

**Transient -999 errors:** Retry up to 5 times with 5-second delays.

---

## Step 2 — Get Quote

```ts
import { BASE_MAINNET_CHAIN_ID, STELLAR_MAINNET_CHAIN_ID } from "@sodax/sdk";

const quoteResult = await sodax.swaps.getQuote({
  token_src: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",   // USDC on Base
  token_src_blockchain_id: BASE_MAINNET_CHAIN_ID,
  token_dst: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",  // USDC on Stellar
  token_dst_blockchain_id: STELLAR_MAINNET_CHAIN_ID,
  amount: 100_000n,    // bigint, 6 decimals (USDC on Base)
  quote_type: "exact_input",
});
// quoteResult.value.quoted_amount → bigint in Stellar stroops (7 decimals)
```

---

## Step 3 — Execute Swap (Allowance + Intent)

The `CrossmintEvmSodaxAdapter` connects Sodax's `IEvmWalletProvider` interface to the
Crossmint REST API. Every `sendTransaction` call goes through the full REST signing flow.

```ts
import { CrossmintEvmSodaxAdapter } from "../shared/crossmint-adapters.js";

const crossmintAdapter = new CrossmintEvmSodaxAdapter(
  restClient,
  evmAddress,
  walletLocator,
  "base",    // chain string for Crossmint tx calls
  provider
);

const { srcTxHash, statusHash } = await bridgeService.executeSwap(
  crossmintAdapter,
  swapParams,
  quote
);
```

Internally this triggers two Crossmint REST transactions:
1. ERC-20 approve (if allowance insufficient)
2. Sodax `createIntent` call

Each follows the same flow: POST → awaiting-approval → sign hex bytes → POST approvals → poll.

---

## Step 4 — Poll Until SOLVED

```ts
const { destTxHash, amountReceived } = await bridgeService.pollStatus(statusHash);
// amountReceived → bigint, Stellar stroops (7 decimals)
// destTxHash     → Stellar transaction hash
```

**Status codes:**

| Code | Label |
|---|---|
| -1 | NOT_FOUND (API still indexing) |
| 1 | NOT_STARTED_YET |
| 2 | STARTED_NOT_FINISHED (processing on Hub/Sonic) |
| 3 | SOLVED ✅ |
| 4 | FAILED ❌ |

**Getting the settled amount** (not the quoted amount):
```ts
const intentState = await sodax.swaps.getFilledIntent(fillTxHash);
const amountReceived = intentState.receivedOutput;  // actual settled stroops
```

---

## Full Code

See `src/examples/06-full-bridge.ts` for the complete end-to-end implementation.

---

## Decimal Reference

| Token | Decimals | 1 unit |
|---|---|---|
| USDC (Base) | 6 | `1_000_000` |
| USDC (Stellar SAC) | 7 | `10_000_000` stroops |
| XLM | 7 | `10_000_000` stroops |
