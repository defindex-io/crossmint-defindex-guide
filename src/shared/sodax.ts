import {
  Sodax,
  SolverIntentStatusCode,
  SONIC_MAINNET_CHAIN_ID,
} from "@sodax/sdk";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const formatError = (error: any): string => {
  if (error instanceof Error) return error.message;
  return JSON.stringify(error, (_k, v) =>
    typeof v === "bigint" ? v.toString() : v
  );
};

export const getStatusLabel = (code: number): string => {
  switch (code) {
    case -1: return "NOT_FOUND (API indexing...)";
    case 1:  return "NOT_STARTED_YET (Pending on Relayer)";
    case 2:  return "STARTED_NOT_FINISHED (Processing on Hub/Sonic)";
    case 3:  return "SOLVED (Funds delivered on Stellar)";
    case 4:  return "FAILED";
    default: return `UNKNOWN_CODE (${code})`;
  }
};

export async function initializeSodax(): Promise<Sodax> {
  console.log("[Sodax] Initializing...");
  const sodax = new Sodax();
  const result = await sodax.initialize();
  if (!result.ok) throw new Error(`Sodax init failed: ${formatError(result.error)}`);
  console.log("[Sodax] Initialized.");
  return sodax;
}

/**
 * Checks and sets ERC-20 allowance for a Sodax swap intent.
 * Used by SodaxBridgeService before executeSwap.
 */
export async function handleAllowance(
  sodaxService: any,
  intentParams: any,
  spokeProvider: any,
  walletProvider: any
): Promise<void> {
  console.log("[Allowance] Checking token allowance...");

  const allowanceResult = await sodaxService.isAllowanceValid({
    intentParams,
    params: intentParams,
    spokeProvider,
  });

  if (!allowanceResult.ok) {
    throw new Error(`Allowance check failed: ${formatError(allowanceResult.error)}`);
  }

  if (!allowanceResult.value) {
    console.log("  Allowance insufficient — sending approval...");
    const approveResult = await sodaxService.approve({
      intentParams,
      params: intentParams,
      spokeProvider,
    });
    if (!approveResult.ok) {
      throw new Error(`Approval failed: ${formatError(approveResult.error)}`);
    }
    console.log(`  Approval tx: ${approveResult.value}`);
    await walletProvider.waitForTransactionReceipt(approveResult.value as `0x${string}`);
    console.log("  Approval confirmed.");
  } else {
    console.log("  Allowance sufficient.");
  }
}
