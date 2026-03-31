import { dequeue, markSynced, markFailed, getPendingCount } from './transactionQueue'

let intervalId: ReturnType<typeof setInterval> | null = null
let isRunning = false

export async function syncOne(): Promise<boolean> {
  const tx = await dequeue()
  if (!tx) return false

  try {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx.data),
    })

    if (res.ok) {
      await markSynced(tx.id)
      return true
    }

    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    await markFailed(tx.id, err.error ?? 'Sync failed')
    return false
  } catch (err) {
    await markFailed(tx.id, String(err))
    return false
  }
}

export function start() {
  if (isRunning) return
  isRunning = true
  intervalId = setInterval(async () => {
    if (!navigator.onLine) return
    const count = await getPendingCount()
    if (count > 0) await syncOne()
  }, 5000)
}

export function stop() {
  isRunning = false
  if (intervalId) { clearInterval(intervalId); intervalId = null }
}

export async function syncAll(): Promise<number> {
  let synced = 0
  while (true) {
    const result = await syncOne()
    if (!result) break
    synced++
  }
  return synced
}
