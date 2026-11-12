import { OitivaMetadata, StoredRecoveryChunk } from '../types/oitiva';

const DB_NAME = 'clio_recovery_db';
const DB_VERSION = 1;
const STORE_SESSIONS = 'sessions';
const STORE_CHUNKS = 'chunks';

interface ActiveSessionRecord {
  id: string;
  metadata: OitivaMetadata;
  startedAt: string;
  mimeType: string;
  isCompleted: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
        const chunkStore = db.createObjectStore(STORE_CHUNKS, { keyPath: ['sessionId', 'chunkIndex'] });
        chunkStore.createIndex('sessionId', 'sessionId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Initializes a new crash-safe journal session
 */
export async function initRecoverySession(id: string, metadata: OitivaMetadata, mimeType: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_SESSIONS], 'readwrite');
    const store = tx.objectStore(STORE_SESSIONS);

    const record: ActiveSessionRecord = {
      id,
      metadata,
      startedAt: new Date().toISOString(),
      mimeType,
      isCompleted: false,
    };

    store.put(record);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to init recovery session in IndexedDB:', err);
  }
}

/**
 * Appends a recorded chunk into IndexedDB immediately
 */
export async function saveRecoveryChunk(sessionId: string, chunkIndex: number, data: Blob): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_CHUNKS], 'readwrite');
    const store = tx.objectStore(STORE_CHUNKS);

    const chunkRecord: StoredRecoveryChunk = {
      sessionId,
      chunkIndex,
      data,
      timestamp: Date.now(),
    };

    store.put(chunkRecord);
  } catch (err) {
    console.warn('Failed to persist chunk in IndexedDB journal:', err);
  }
}

/**
 * Marks session as gracefully finished
 */
export async function finalizeRecoverySession(sessionId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_SESSIONS], 'readwrite');
    const store = tx.objectStore(STORE_SESSIONS);

    const req = store.get(sessionId);
    req.onsuccess = () => {
      const record = req.result as ActiveSessionRecord | undefined;
      if (record) {
        record.isCompleted = true;
        store.put(record);
      }
    };
  } catch (err) {
    console.error('Failed to finalize recovery session:', err);
  }
}

/**
 * Checks if any unfinalized (crashed/interrupted) sessions exist
 */
export async function checkInterruptedSessions(): Promise<Array<{
  session: ActiveSessionRecord;
  chunkCount: number;
  totalSize: number;
}>> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_SESSIONS, STORE_CHUNKS], 'readonly');
    const sessionStore = tx.objectStore(STORE_SESSIONS);
    const chunkStore = tx.objectStore(STORE_CHUNKS);

    return new Promise((resolve) => {
      const getAllSessionsReq = sessionStore.getAll();
      getAllSessionsReq.onsuccess = () => {
        const allSessions = (getAllSessionsReq.result || []) as ActiveSessionRecord[];
        const interrupted = allSessions.filter((s) => !s.isCompleted);

        if (interrupted.length === 0) {
          resolve([]);
          return;
        }

        const getAllChunksReq = chunkStore.getAll();
        getAllChunksReq.onsuccess = () => {
          const allChunks = (getAllChunksReq.result || []) as StoredRecoveryChunk[];

          const results = interrupted.map((session) => {
            const sessionChunks = allChunks.filter((c) => c.sessionId === session.id);
            const totalSize = sessionChunks.reduce((acc, c) => acc + (c.data?.size || 0), 0);
            return {
              session,
              chunkCount: sessionChunks.length,
              totalSize,
            };
          }).filter((r) => r.chunkCount > 0);

          resolve(results);
        };
        getAllChunksReq.onerror = () => resolve([]);
      };
      getAllSessionsReq.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error('Error checking interrupted sessions:', err);
    return [];
  }
}

/**
 * Reconstructs a full playable Blob from recovered chunks in order
 */
export async function recoverSessionBlob(sessionId: string): Promise<{ blob: Blob; mimeType: string } | null> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_SESSIONS, STORE_CHUNKS], 'readonly');
    const sessionStore = tx.objectStore(STORE_SESSIONS);
    const chunkStore = tx.objectStore(STORE_CHUNKS);

    return new Promise((resolve, reject) => {
      const sessionReq = sessionStore.get(sessionId);
      sessionReq.onsuccess = () => {
        const session = sessionReq.result as ActiveSessionRecord | undefined;
        if (!session) {
          resolve(null);
          return;
        }

        const index = chunkStore.index('sessionId');
        const chunksReq = index.getAll(IDBKeyRange.only(sessionId));

        chunksReq.onsuccess = () => {
          const chunks = (chunksReq.result || []) as StoredRecoveryChunk[];
          chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

          if (chunks.length === 0) {
            resolve(null);
            return;
          }

          const blobParts = chunks.map((c) => c.data);
          const mimeType = session.mimeType || 'video/webm';
          const combinedBlob = new Blob(blobParts, { type: mimeType });
          resolve({ blob: combinedBlob, mimeType });
        };
        chunksReq.onerror = () => reject(chunksReq.error);
      };
      sessionReq.onerror = () => reject(sessionReq.error);
    });
  } catch (err) {
    console.error('Failed to recover session blob:', err);
    return null;
  }
}

/**
 * Clears an old or recovered session from storage
 */
export async function deleteRecoverySession(sessionId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_SESSIONS, STORE_CHUNKS], 'readwrite');
    tx.objectStore(STORE_SESSIONS).delete(sessionId);

    const chunkStore = tx.objectStore(STORE_CHUNKS);
    const index = chunkStore.index('sessionId');
    const req = index.getAllKeys(IDBKeyRange.only(sessionId));

    req.onsuccess = () => {
      const keys = req.result || [];
      keys.forEach((key) => chunkStore.delete(key));
    };
  } catch (err) {
    console.error('Failed to delete recovery session:', err);
  }
}
