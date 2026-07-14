export interface IsolatedFailure {
  key: string
  error: string
}

export interface BisectionResult {
  persisted: number
  failed: IsolatedFailure[]
}

/**
 * Persists a batch, recursively halving only failed batches. A one-row failure
 * is quarantined while every independent good row remains durable.
 */
export async function upsertWithBisection<T>(
  rows: T[],
  persist: (batch: T[]) => Promise<void>,
  keyOf: (row: T) => string,
): Promise<BisectionResult> {
  if (rows.length === 0) return { persisted: 0, failed: [] }

  try {
    await persist(rows)
    return { persisted: rows.length, failed: [] }
  } catch (error) {
    if (rows.length === 1) {
      return {
        persisted: 0,
        failed: [{
          key: keyOf(rows[0]!),
          error: error instanceof Error ? error.message : String(error),
        }],
      }
    }

    const midpoint = Math.floor(rows.length / 2)
    const [left, right] = await Promise.all([
      upsertWithBisection(rows.slice(0, midpoint), persist, keyOf),
      upsertWithBisection(rows.slice(midpoint), persist, keyOf),
    ])
    return {
      persisted: left.persisted + right.persisted,
      failed: [...left.failed, ...right.failed],
    }
  }
}
