import type { Result } from "neverthrow";
import { ok } from "../../domain/result.js";
import type { DbTransaction, DbType } from "../../infrastructure/db/index.js";

/**
 * Sentinel value used to trigger transaction rollback on domain errors.
 * Using a unique symbol ensures we can distinguish from other thrown errors.
 */
const ROLLBACK_SENTINEL = Symbol("domain-error-rollback");

/**
 * Wraps a Drizzle transaction to automatically rollback on `err()` results.
 *
 * Unlike throwing inside a transaction, this preserves the typed Result error
 * while still ensuring the transaction is rolled back.
 *
 * @param db - The database instance to create a transaction on
 * @param fn - The transaction function that returns a Result
 * @returns The Result from the transaction function (either ok or err)
 *
 * @example
 * ```typescript
 * const txResult = await withResultTransaction(db, async (tx) => {
 *   const heatService = new HeatService(createHeatRepository(tx), createScoreRepository(tx));
 *   return heatService.completeHeat(heatId, new Date());
 * });
 *
 * return txResult.match(
 *   () => ({ message: "Success" }),
 *   (error) => throwDomainError(error, errors),
 * );
 * ```
 */
export async function withResultTransaction<T, E extends Error>(
  db: DbType,
  fn: (tx: DbTransaction) => Promise<Result<T, E>>
): Promise<Result<T, E>> {
  let domainResult: Result<T, E> | undefined;

  try {
    const value = await db.transaction(async (tx) => {
      const result = await fn(tx);
      if (result.isErr()) {
        domainResult = result;
        throw ROLLBACK_SENTINEL;
      }
      return result.value;
    });
    return ok(value) as Result<T, E>;
  } catch (error) {
    if (error === ROLLBACK_SENTINEL && domainResult) {
      return domainResult;
    }
    throw error;
  }
}
