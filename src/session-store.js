const DATABASE_NAME = "kisap-private-recovery";
const DATABASE_VERSION = 1;
const STORE_NAME = "sessions";
const SESSION_KEY = "active";
export const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

let databasePromise;

function openDatabase() {
  if (!window.indexedDB) return Promise.reject(new Error("Local recovery is unavailable."));
  databasePromise ||= new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Local recovery could not start."));
  });
  return databasePromise;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Local recovery failed."));
  });
}

export async function saveSessionRecovery(snapshot) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  await requestResult(store.put({
    id: SESSION_KEY,
    updatedAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    ...snapshot,
  }));
}

export async function loadSessionRecovery() {
  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const stored = await requestResult(transaction.objectStore(STORE_NAME).get(SESSION_KEY));
    if (!stored) return null;
    if (!stored.expiresAt || stored.expiresAt <= Date.now()) {
      await clearSessionRecovery();
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

export async function clearSessionRecovery() {
  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    await requestResult(transaction.objectStore(STORE_NAME).delete(SESSION_KEY));
  } catch {
    // Recovery is best-effort and never blocks the photo booth.
  }
}
