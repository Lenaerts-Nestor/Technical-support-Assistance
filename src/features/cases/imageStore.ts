import type { CaseImage } from './caseImages'

/**
 * The pictures pasted into the draft, kept in this browser's IndexedDB (the draft itself is in
 * localStorage, which is too small for pictures). Nothing leaves this computer.
 */
const DB_NAME = 'support-hub-cases'
const STORE = 'images'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, start: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = start(db.transaction(STORE, mode).objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export const loadImages = (): Promise<CaseImage[]> => run<CaseImage[]>('readonly', (store) => store.getAll()).catch(() => [])

export const saveImage = (image: CaseImage): Promise<IDBValidKey> => run('readwrite', (store) => store.put(image))

export const deleteImage = (id: number): Promise<undefined> => run('readwrite', (store) => store.delete(id))
