/**
 * One-key IndexedDB store for the linked guides folder. A
 * `FileSystemDirectoryHandle` is structured-cloneable, so it can be stashed in
 * IndexedDB and re-used on the next visit (subject to a permission re-prompt).
 * `localStorage` can't hold it — it only takes strings.
 */

const DB_NAME = 'support-hub-guides'
const STORE = 'folder'
const KEY = 'directory-handle'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = run(db.transaction(STORE, mode).objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        request.transaction!.oncomplete = () => db.close()
      }),
  )
}

export function saveFolderHandle(handle: FileSystemDirectoryHandle): Promise<IDBValidKey> {
  return tx('readwrite', (store) => store.put(handle, KEY))
}

export function loadFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  return tx<FileSystemDirectoryHandle | undefined>('readonly', (store) => store.get(KEY))
    .then((h) => h ?? null)
    .catch(() => null)
}

export function clearFolderHandle(): Promise<undefined> {
  return tx('readwrite', (store) => store.delete(KEY))
}
