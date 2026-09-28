/**
 * sec.ts — encrypted client-side vault (IndexedDB + AES-GCM, key derived via HKDF
 * from a Django-issued session seed).
 *
 * Key fixes vs. previous version:
 *  1. New tabs / windows ask already-open tabs for the seed (SESSION_REQUEST handshake)
 *     instead of failing with "Session seed missing" and sending unauthenticated requests.
 *  2. A missing seed is a normal logged-out state: no console noise.
 *  3. Secondary tabs no longer wipe the (shared) IndexedDB on logout — that raced with
 *     a fresh login and could delete the new tokens.
 *  4. IndexedDB: single shared open() promise (no duplicate connections), writes resolve on
 *     transaction commit (tx.oncomplete), automatic reconnect on a closed connection,
 *     and clear() is actually awaited.
 *  5. Derived CryptoKey is cached per seed instead of re-running HKDF on every call.
 *  6. Entries written under another seed are ignored (never auto-deleted), and
 *     rotateSessionSeed() re-encrypts data when the backend issues a new seed.
 *  7. Seed hex is validated; sessionStorage access is guarded (private mode / SSR).
 */

const DB_NAME = "SMSCollectionsVaultDB";
const DB_VERSION = 2;
const DATA_STORE = "DataStore"; // Store for encrypted binary payloads
const SYNC_CHANNEL_NAME = "SMS_VAULT_SYNC_CHANNEL";
const SEED_STORAGE_KEY = "app_session_seed";
const IV_LENGTH = 12;
const PEER_SEED_TIMEOUT_MS = 300;

// Domain-separated HKDF salt / info
const HKDF_SALT = new TextEncoder().encode("SMS_VAULT_HKDF_SALT_V1");
const HKDF_INFO = new TextEncoder().encode("app-indexeddb-encryption");

/** Fired on `window` when another tab logs out, so the app can redirect to /login. */
export const SESSION_CLEARED_EVENT = "sec:session-cleared";
/** Fired on `window` when another tab logs in or rotates the seed (cached tokens may be stale). */
export const SESSION_UPDATED_EVENT = "sec:session-updated";

const isBrowser = typeof window !== "undefined";

type SyncMessage =
  | { type: "SESSION_REQUEST"; requestId: string }
  | { type: "SESSION_RESPONSE"; requestId: string; seed: string }
  | { type: "SESSION_UPDATED"; seed: string }
  | { type: "SESSION_CLEARED" };

// ---------------------------------------------------------------------------
// Session seed state
// ---------------------------------------------------------------------------
let inMemorySessionSeed: string | null = null;
let cachedKey: { seed: string; key: Promise<CryptoKey> } | null = null;

function readStoredSeed(): string | null {
  if (!isBrowser) return null;
  try {
    return sessionStorage.getItem(SEED_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredSeed(seed: string | null): void {
  if (!isBrowser) return;
  try {
    if (seed) sessionStorage.setItem(SEED_STORAGE_KEY, seed);
    else sessionStorage.removeItem(SEED_STORAGE_KEY);
  } catch {
    /* sessionStorage unavailable — RAM copy still works for this tab */
  }
}

function applySeed(seed: string | null): void {
  if (seed !== inMemorySessionSeed) cachedKey = null; // invalidate derived key
  inMemorySessionSeed = seed;
  writeStoredSeed(seed);
}

// ---------------------------------------------------------------------------
// Cross-tab sync
// ---------------------------------------------------------------------------
const syncChannel: BroadcastChannel | null =
  isBrowser && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel(SYNC_CHANNEL_NAME)
    : null;

const peerWaiters = new Map<string, (seed: string) => void>();
let pendingPeerRequest: Promise<string | null> | null = null;
// Once peers have been asked and had nothing, don't ask again: any later login
// in another tab broadcasts SESSION_UPDATED, which this tab receives anyway.
let peerLookupDone = false;

syncChannel?.addEventListener("message", (event: MessageEvent<SyncMessage>) => {
  const msg = event.data;
  switch (msg?.type) {
    case "SESSION_REQUEST": {
      const seed = getSessionSeed();
      if (seed) {
        syncChannel.postMessage({ type: "SESSION_RESPONSE", requestId: msg.requestId, seed } satisfies SyncMessage);
      }
      break;
    }
    case "SESSION_RESPONSE": {
      const resolve = peerWaiters.get(msg.requestId);
      if (resolve) {
        peerWaiters.delete(msg.requestId);
        resolve(msg.seed);
      }
      break;
    }
    case "SESSION_UPDATED":
      applySeed(msg.seed);
      window.dispatchEvent(new CustomEvent(SESSION_UPDATED_EVENT));
      break;
    case "SESSION_CLEARED":
      // IndexedDB is shared per origin and was already wiped by the initiating tab.
      // Wiping it again here could delete tokens from a login that happened right after.
      applySeed(null);
      window.dispatchEvent(new CustomEvent(SESSION_CLEARED_EVENT));
      break;
  }
});

function newRequestId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function requestSeedFromPeers(): Promise<string | null> {
  if (!syncChannel || peerLookupDone) return Promise.resolve(null);
  if (pendingPeerRequest) return pendingPeerRequest;

  const requestId = newRequestId();
  pendingPeerRequest = new Promise<string | null>((resolve) => {
    const timer = setTimeout(() => {
      peerWaiters.delete(requestId);
      resolve(null);
    }, PEER_SEED_TIMEOUT_MS);

    peerWaiters.set(requestId, (seed) => {
      clearTimeout(timer);
      resolve(seed);
    });

    syncChannel.postMessage({ type: "SESSION_REQUEST", requestId } satisfies SyncMessage);
  }).then((seed) => {
    pendingPeerRequest = null;
    peerLookupDone = true;
    if (seed && !getSessionSeed()) applySeed(seed);
    return getSessionSeed();
  });

  return pendingPeerRequest;
}

// ---------------------------------------------------------------------------
// Public session API
// ---------------------------------------------------------------------------

/**
 * Save the Django-issued session seed upon login and broadcast it to other tabs.
 * Call this BEFORE any encryptAndStore() in the login flow.
 */
export function setSessionSeed(seed: string): void {
  if (typeof seed !== "string" || seed.trim() === "") {
    throw new Error("[sec.ts] setSessionSeed() requires a non-empty seed string.");
  }
  applySeed(seed);
  peerLookupDone = true;
  syncChannel?.postMessage({ type: "SESSION_UPDATED", seed } satisfies SyncMessage);
}

/** Synchronous lookup: RAM, then this tab's sessionStorage. */
export function getSessionSeed(): string | null {
  if (inMemorySessionSeed) return inMemorySessionSeed;
  const stored = readStoredSeed();
  if (stored) {
    inMemorySessionSeed = stored; // re-hydrate RAM cache
    return stored;
  }
  return null;
}

/**
 * Async lookup: local seed, otherwise ask other open tabs (short timeout).
 * Use this in auth guards / interceptors instead of getSessionSeed().
 */
export async function resolveSessionSeed(): Promise<string | null> {
  return getSessionSeed() ?? (await requestSeedFromPeers());
}

export async function hasActiveSession(): Promise<boolean> {
  return (await resolveSessionSeed()) !== null;
}

/** Purge key material and wipe IndexedDB ciphertext on logout, across all tabs. */
export async function clearSecuritySession(): Promise<void> {
  applySeed(null);
  syncChannel?.postMessage({ type: "SESSION_CLEARED" } satisfies SyncMessage);
  await clearDataStoreInternal();
}

async function clearDataStoreInternal(): Promise<void> {
  try {
    await runTransaction("readwrite", (store) => store.clear());
  } catch (error) {
    console.error("[sec.ts] Error clearing IndexedDB store:", error);
  }
}

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------
const HEX_RE = /^(?:[0-9a-fA-F]{2})+$/;

/**
 * Turn the seed into HKDF input keying material.
 * Hex seeds are decoded to raw bytes; any other format (base64, UUID, signed token…)
 * is used as its UTF-8 bytes. HKDF accepts arbitrary-length input either way.
 */
function seedToBytes(seed: string): Uint8Array {
  if (HEX_RE.test(seed)) {
    const bytes = new Uint8Array(seed.length / 2);
    for (let i = 0; i < seed.length; i += 2) {
      bytes[i / 2] = parseInt(seed.substring(i, i + 2), 16);
    }
    return bytes;
  }
  return new TextEncoder().encode(seed);
}

async function deriveKeyFromSeed(seed: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    seedToBytes(seed) as BufferSource,
    { name: "HKDF" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: HKDF_SALT as BufferSource,
      info: HKDF_INFO as BufferSource,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function getCryptoKey(seed: string): Promise<CryptoKey> {
  if (cachedKey?.seed === seed) return cachedKey.key;
  const key = deriveKeyFromSeed(seed);
  cachedKey = { seed, key };
  key.catch(() => {
    if (cachedKey?.key === key) cachedKey = null;
  });
  return key;
}

// ---------------------------------------------------------------------------
// IndexedDB
// ---------------------------------------------------------------------------
let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (!isBrowser || typeof indexedDB === "undefined") {
    return Promise.reject(new Error("[sec.ts] IndexedDB is not available in this environment."));
  }
  if (dbPromise) return dbPromise;

  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DATA_STORE)) {
        db.createObjectStore(DATA_STORE);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const drop = () => {
        if (dbPromise === promise) dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        drop();
      };
      db.onclose = drop;
      resolve(db);
    };

    request.onblocked = () => {
      console.warn("[sec.ts] IndexedDB open blocked: another tab holds a connection with an older version.");
    };

    request.onerror = () => {
      if (dbPromise === promise) dbPromise = null;
      reject(request.error);
    };
  });

  dbPromise = promise;
  return promise;
}

/**
 * Runs one request in its own transaction and resolves when the transaction COMMITS.
 * Reconnects once if the cached connection was closed underneath us.
 */
async function runTransaction<T>(
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const db = await openDatabase();
    let tx: IDBTransaction;
    try {
      tx = db.transaction(DATA_STORE, mode);
    } catch (err) {
      if (attempt === 0 && err instanceof DOMException && err.name === "InvalidStateError") {
        dbPromise = null; // stale connection — reopen and retry
        continue;
      }
      throw err;
    }

    return new Promise<T>((resolve, reject) => {
      const req = op(tx.objectStore(DATA_STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error ?? req.error);
      tx.onabort = () => reject(tx.error ?? new Error("[sec.ts] IndexedDB transaction aborted."));
    });
  }
  throw new Error("[sec.ts] Unable to open an IndexedDB transaction.");
}

async function writeToDataStore(key: string, value: Uint8Array): Promise<void> {
  await runTransaction("readwrite", (store) => store.put(value, key));
}

async function readFromDataStore(key: string): Promise<Uint8Array | null> {
  const value: unknown = await runTransaction("readonly", (store) => store.get(key));
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return null;
}

export async function removeFromDataStore(key: string): Promise<void> {
  await runTransaction("readwrite", (store) => store.delete(key));
}

// ---------------------------------------------------------------------------
// Encrypt / decrypt primitives
// ---------------------------------------------------------------------------
async function encryptWithKey(cryptoKey: CryptoKey, data: unknown): Promise<Uint8Array> {
  const payload = new TextEncoder().encode(JSON.stringify(data));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    cryptoKey,
    payload as BufferSource
  );
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return combined;
}

/** Throws if the ciphertext was not produced with this key (or is corrupted). */
async function decryptWithKey<T>(cryptoKey: CryptoKey, combined: Uint8Array): Promise<T> {
  if (combined.byteLength <= IV_LENGTH) throw new Error("[sec.ts] Ciphertext too short.");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: combined.slice(0, IV_LENGTH) as BufferSource },
    cryptoKey,
    combined.slice(IV_LENGTH) as BufferSource
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}

// ---------------------------------------------------------------------------
// Encrypt & store
// ---------------------------------------------------------------------------
export async function encryptAndStore(key: string, data: unknown): Promise<void> {
  const activeSeed = await resolveSessionSeed();
  if (!activeSeed) {
    throw new Error("[sec.ts] No active session seed. Call setSessionSeed() before storing data.");
  }

  try {
    const cryptoKey = await getCryptoKey(activeSeed);
    await writeToDataStore(key, await encryptWithKey(cryptoKey, data));
  } catch (error) {
    console.error(`[sec.ts] Error encrypting key "${key}":`, error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Retrieve & decrypt
// ---------------------------------------------------------------------------
/**
 * Returns null when logged out, when the key is absent, or when the entry was written
 * under a different seed. Undecryptable entries are NOT deleted: another tab may be
 * mid-way through a login/seed rotation, and deleting here could destroy fresh data.
 * Stale entries are overwritten by the next write and wiped on logout.
 */
export async function retrieveAndDecrypt<T = unknown>(key: string): Promise<T | null> {
  if (!isBrowser) return null; // SSR: nothing to read

  const activeSeed = await resolveSessionSeed();
  if (!activeSeed) return null; // logged out — expected, not an error

  let combined: Uint8Array | null;
  try {
    combined = await readFromDataStore(key);
  } catch (error) {
    console.error(`[sec.ts] Error reading key "${key}" from IndexedDB:`, error);
    return null;
  }
  if (!combined) return null;

  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await getCryptoKey(activeSeed);
  } catch (error) {
    console.error("[sec.ts] Could not derive encryption key from session seed:", error);
    return null;
  }

  try {
    return await decryptWithKey<T>(cryptoKey, combined);
  } catch {
    console.debug(`[sec.ts] Entry "${key}" was written under a different session seed; ignoring.`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Seed rotation (e.g. backend returns a new session_seed on token refresh)
// ---------------------------------------------------------------------------
/**
 * Switches to a new seed WITHOUT losing stored data: every entry readable with the
 * current seed is re-encrypted under the new one. Plain setSessionSeed() would leave
 * user_details etc. unreadable.
 */
export async function rotateSessionSeed(newSeed: string): Promise<void> {
  const oldSeed = await resolveSessionSeed();
  if (!oldSeed || oldSeed === newSeed) {
    setSessionSeed(newSeed);
    return;
  }

  const oldKey = await getCryptoKey(oldSeed);
  const keys = (await runTransaction("readonly", (store) => store.getAllKeys())).map(String);

  const plaintext: Array<[string, unknown]> = [];
  for (const k of keys) {
    const bytes = await readFromDataStore(k).catch(() => null);
    if (!bytes) continue;
    try {
      plaintext.push([k, await decryptWithKey(oldKey, bytes)]);
    } catch {
      /* already stale — skip */
    }
  }

  setSessionSeed(newSeed);
  const newKey = await getCryptoKey(newSeed);
  for (const [k, data] of plaintext) {
    await writeToDataStore(k, await encryptWithKey(newKey, data));
  }
}