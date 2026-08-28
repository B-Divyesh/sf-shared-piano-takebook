import type { Take } from './types';

const DB_NAME = 'takebook';
const STORE = 'takes';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage'));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local storage request failed'));
  });
}

export async function listTakes(): Promise<Take[]> {
  const db = await openDb();
  const result = await requestResult(db.transaction(STORE).objectStore(STORE).getAll() as IDBRequest<Take[]>);
  db.close();
  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveTake(take: Take): Promise<void> {
  const db = await openDb();
  await requestResult(db.transaction(STORE, 'readwrite').objectStore(STORE).put(take));
  db.close();
}

export async function deleteTake(id: string): Promise<void> {
  const db = await openDb();
  await requestResult(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id));
  db.close();
}

export async function importTakes(value: unknown): Promise<number> {
  if (!Array.isArray(value)) throw new Error('This backup does not contain a take list.');
  const candidates = value.filter((item): item is Take => Boolean(item && typeof item === 'object' && typeof item.id === 'string' && Array.isArray(item.notes)));
  if (candidates.length !== value.length) throw new Error('Some entries in this backup are not valid takes.');
  for (const take of candidates) await saveTake(take);
  return candidates.length;
}
