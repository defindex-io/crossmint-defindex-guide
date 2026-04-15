# Known Gotchas

---

## G1 — `api-key` signer is deprecated

**Error:** `Invalid address: api-key`

**Root cause:** The `api-key` signer type was removed in Crossmint API version `2025-06-09`.
Setting `"signer": "api-key"` in transaction params now returns this error.

**Fix:** Use `external-wallet:<address>` as the signer. Register the external wallet as
`adminSigner` when creating the wallet.

```ts
// Wrong
{ "params": { "signer": "api-key", ... } }

// Correct
{ "params": { "signer": "external-wallet:0xYOUR_EVM_KEY_ADDRESS", ... } }
```

---

## G2 — `evm-keypair:0x...` awaiting approval (email OTP loop)

**Error:** Transaction stuck in `awaiting-approval` with an email OTP message

**Root cause:** Adding `external-wallet` as an operational signer to an existing email-owned
wallet triggers email OTP verification. The signer cannot be added without user action.

**Fix:** Set `adminSigner: external-wallet` at wallet **creation time**. Once the wallet
exists with the correct `adminSigner`, no OTP is ever needed.

```ts
// Must be set at creation — cannot be added later without OTP
POST /wallets
{
  "config": {
    "adminSigner": { "type": "external-wallet", "address": "0x..." }
  }
}
```

---

## G3 — `Locator prefix 'external-wallet' is not valid`

**Root cause:** `external-wallet` is not a valid value for the `owner` field.

**Fix:** `owner` must be `email:<email>` or `userId:<id>`. Use `external-wallet` only in
`adminSigner`.

```ts
// Wrong
POST /wallets { "owner": "external-wallet:0x..." }

// Correct
POST /wallets { "owner": "email:user@example.com",
                "config": { "adminSigner": { "type": "external-wallet", "address": "0x..." } } }
```

---

## G4 — EVM approval message double-hashed

**Error:** Transaction submitted but reverts on-chain, or signature invalid

**Root cause:** Crossmint's EVM approval `message` is raw hex bytes. Calling
`signer.signMessage(message)` treats the string as UTF-8, adds EIP-191 prefix, and hashes it
again — producing the wrong signature.

**Fix:** Convert to `Uint8Array` before signing:
```ts
// Wrong
const signature = await signer.signMessage(message);

// Correct
const signature = await signer.signMessage(ethers.getBytes(message));
```

---

## G5 — Stellar approval signed as EVM hex (wrong algorithm)

**Error:** Crossmint returns `approval rejected` or signature verification failure for Stellar tx

**Root cause:** Stellar approval messages are **base64-encoded XDR**, not hex bytes.
Signing with `ethers.getBytes()` + ECDSA will always fail — Stellar uses Ed25519.

**Fix:** Use the Stellar keypair directly:
```ts
// Wrong — for Stellar
const sig = await evmSigner.signMessage(ethers.getBytes(message));

// Correct — Stellar ed25519
const messageBytes = Buffer.from(message, "base64");
const signature = keypair.sign(messageBytes).toString("base64");
```

---

## G6 — Wrong locator in transaction calls

**Error:** `Wallet not found` or `404` when creating a transaction

**Root cause:** Using the email locator (`email:user@example.com:evm`) for transaction endpoints.
That locator only works for the wallet lookup GET request.

**Fix:** Always use the **on-chain address** for transaction endpoints:
```ts
// Wrong — for tx calls
const locator = `email:${email}:evm`;

// Correct
const { address } = await restClient.getOrCreateEvmWallet();
await restClient.sendTransactionAndGetHash(address, tx, "base");
```

---

## G7 — Sodax quote returns -999 (transient error)

**Error:** `getQuote` returns an error with code `-999`

**Root cause:** Transient solver unavailability. The Sodax relay API occasionally returns
-999 during peak load or brief outages.

**Fix:** Retry up to 5 times with 5-second delays. `SodaxBridgeService.getQuote()` already
implements this retry logic.

---

## G8 — `amountReceived` is `0n` after SOLVED

**Root cause:** The `getStatus()` response does not include the settled output amount.
Reading `amountOut` from the original quote is also wrong (bridge fees reduce it).

**Fix:** Fetch the actual settled amount from `getFilledIntent`:
```ts
const intentState = await sodax.swaps.getFilledIntent(fillTxHash);
const amountReceived = intentState.receivedOutput;  // actual stroops
```

---

## G9 — sk_ key required (not ck_)

**Error:** `Unauthorized` or `403` when calling wallet transaction endpoints

**Root cause:** Client API keys (`ck_`) lack permission to sign wallet transactions.

**Fix:** Use a server API key (`sk_production_...` or `sk_staging_...`).
Generate it at Dashboard → API Keys → New Key → Server key.
