const DB_NAME = 'oasis-pos-offline'
const DB_VERSION = 1
const STORE_NAME = 'transactions'

export interface OfflineTransaction {
  id: string
  created_at: string
  data: Record<string, unknown>
  sync_status: 'pending' | 'syncing' | 'failed' | 'synced'
  retry_count: number
  last_error: string | null
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('sync_status', 'sync_status', { unique: false })
        store.createIndex('created_at', 'created_at', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueue(tx: OfflineTransaction): Promise<string> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const txn = db.transaction(STORE_NAME, 'readwrite')
    txn.objectStore(STORE_NAME).put(tx)
    txn.oncomplete = () => resolve(tx.id)
    txn.onerror = () => reject(txn.error)
  })
}

export async function dequeue(): Promise<OfflineTransaction | null> {
  const db = await openDB()
  return new Promise((resolve) => {
    const txn = db.transaction(STORE_NAME, 'readonly')
    const idx = txn.objectStore(STORE_NAME).index('sync_status')
    const req = idx.openCursor(IDBKeyRange.only('pending'))
    req.onsuccess = () => resolve(req.result?.value ?? null)
  })
}

export async function markSynced(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve) => {
    const txn = db.transaction(STORE_NAME, 'readwrite')
    const store = txn.objectStore(STORE_NAME)
    const req = store.get(id)
    req.onsuccess = () => {
      if (req.result) { store.put({ ...req.result, sync_status: 'synced' }) }
      resolve()
    }
  })
}

export async function markFailed(id: string, error: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve) => {
    const txn = db.transaction(STORE_NAME, 'readwrite')
    const store = txn.objectStore(STORE_NAME)
    const req = store.get(id)
    req.onsuccess = () => {
      if (req.result) {
        const entry = req.result as OfflineTransaction
        const newCount = entry.retry_count + 1
        store.put({ ...entry, sync_status: newCount >= 5 ? 'failed' : 'pending', retry_count: newCount, last_error: error })
      }
      resolve()
    }
  })
}

export async function getPendingCount(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve) => {
    const txn = db.transaction(STORE_NAME, 'readonly')
    const req = txn.objectStore(STORE_NAME).index('sync_status').count(IDBKeyRange.only('pending'))
    req.onsuccess = () => resolve(req.result)
  })
}

export async function getAll(): Promise<OfflineTransaction[]> {
  const db = await openDB()
  return new Promise((resolve) => {
    const txn = db.transaction(STORE_NAME, 'readonly')
    const req = txn.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result)
  })
}
