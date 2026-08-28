import type { NoteEvent, Take } from './types';

const DB_NAME = 'takebook';
const STORE = 'takes';
const MAX_NOTES = 10_000;

export type DamagedTake = { id: string; problem: string };
export type TakeLibrary = { takes: Take[]; damaged: DamagedTake[] };

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

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Local storage transaction was cancelled'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Local storage transaction failed'));
  });
}

function finiteNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

function noteProblem(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'a note is not an object';
  const note = value as Partial<NoteEvent>;
  if (!Number.isInteger(note.note) || !finiteNumber(note.note, 0, 127)) return 'a note number is outside 0–127';
  if (!Number.isInteger(note.velocity) || !finiteNumber(note.velocity, 1, 127)) return 'a note velocity is outside 1–127';
  if (!finiteNumber(note.start, 0, 60)) return 'a note start is outside 0–60 seconds';
  if (!finiteNumber(note.duration, 0.001, 60)) return 'a note duration is outside 0–60 seconds';
  if (note.start + note.duration > 60.001) return 'a note ends after the 60-second limit';
  return null;
}

/** Returns a user-safe explanation, or null when the complete stored shape is valid. */
export function takeProblem(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'the entry is not an object';
  const take = value as Partial<Take>;
  if (typeof take.id !== 'string' || !take.id.trim() || take.id.length > 128) return 'the take ID is missing or too long';
  if (typeof take.title !== 'string' || !take.title.trim() || take.title.length > 80) return 'the take name is missing or too long';
  if (typeof take.teacherNote !== 'string' || take.teacherNote.length > 600) return 'the teacher note is not valid';
  if (typeof take.folder !== 'string' || take.folder.length > 60) return 'the folder is not valid';
  if (!Number.isInteger(take.tempo) || !finiteNumber(take.tempo, 30, 240)) return 'the tempo is outside 30–240 BPM';
  if (!validDate(take.createdAt) || !validDate(take.updatedAt)) return 'a saved date is not valid';
  if (!finiteNumber(take.duration, 0, 60)) return 'the take duration is outside 0–60 seconds';
  if (!finiteNumber(take.loopStart, 0, 59.8) || !finiteNumber(take.loopEnd, 0.2, 60) || take.loopStart + 0.2 > take.loopEnd + Number.EPSILON) return 'the loop range is not valid';
  if (!Array.isArray(take.notes) || take.notes.length > MAX_NOTES) return `the note list exceeds ${MAX_NOTES.toLocaleString()} notes`;
  for (const note of take.notes) {
    const problem = noteProblem(note);
    if (problem) return problem;
    const typedNote = note as NoteEvent;
    if (typedNote.start + typedNote.duration > take.duration + 0.001) return 'a note ends after the take duration';
  }
  return null;
}

export function isTake(value: unknown): value is Take { return takeProblem(value) === null; }

export async function loadTakeLibrary(): Promise<TakeLibrary> {
  const db = await openDb();
  try {
    const rows = await requestResult(db.transaction(STORE).objectStore(STORE).getAll() as IDBRequest<unknown[]>);
    const takes: Take[] = [];
    const damaged: DamagedTake[] = [];
    for (const row of rows) {
      const problem = takeProblem(row);
      if (!problem) takes.push(row as Take);
      else {
        const id = typeof row === 'object' && row !== null && typeof (row as { id?: unknown }).id === 'string' ? (row as { id: string }).id : '';
        if (id) damaged.push({ id, problem });
      }
    }
    takes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return { takes, damaged };
  } finally { db.close(); }
}

export async function listTakes(): Promise<Take[]> { return (await loadTakeLibrary()).takes; }

export async function saveTake(take: Take): Promise<void> {
  const problem = takeProblem(take);
  if (problem) throw new Error(`This take cannot be saved because ${problem}.`);
  const db = await openDb();
  try {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(take);
    await transactionDone(transaction);
  } finally { db.close(); }
}

export async function deleteTake(id: string): Promise<void> {
  const db = await openDb();
  try {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(id);
    await transactionDone(transaction);
  } finally { db.close(); }
}

export async function importTakes(value: unknown): Promise<number> {
  if (!Array.isArray(value)) throw new Error('This backup does not contain a take list.');
  const candidates: Take[] = [];
  const ids = new Set<string>();
  for (const [index, item] of value.entries()) {
    const problem = takeProblem(item);
    if (problem) throw new Error(`Take ${index + 1} is not valid: ${problem}. Nothing was imported.`);
    const take = item as Take;
    if (ids.has(take.id)) throw new Error(`Take ${index + 1} repeats an ID. Nothing was imported.`);
    ids.add(take.id);
    candidates.push(take);
  }
  if (!candidates.length) return 0;
  const db = await openDb();
  try {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    for (const take of candidates) store.put(take);
    await transactionDone(transaction);
  } finally { db.close(); }
  return candidates.length;
}
