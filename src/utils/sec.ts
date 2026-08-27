const DB_NAME = "SMSCollectionsVaultDB";
const DB_VERSION = 2;
const DATA_STORE = "DataStore"; // Store for encrypted binary payloads
const SYNC_CHANNEL_NAME = "SMS_VAULT_SYNC_CHANNEL";

// Domain-separated HKDF Salt to meet NIST compliance guidelines
const HKDF_SALT = new TextEncoder().encode("SMS_VAULT_HKDF_SALT_V1");

// IN-MEMORY SESSION SEED STORAGE & CROSS-TAB SYNC
let inMemorySessionSeed: string | null = null;

// Initialize BroadcastChannel for multi-tab synchronization if running in the browser
let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  syncChannel.onmessage = async (event) => {
    if (event.data?.type === 'SESSION_UPDATED') {
      inMemorySessionSeed = event.data.seed;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('app_session_seed', event.data.seed);
      }
    } else if (event.data?.type === 'SESSION_CLEARED') {
      inMemorySessionSeed = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('app_session_seed');
      }
      await clearDataStoreInternal();
    }
  };
}

/*Save the Django-issued session seed in RAM and sessionStorage upon login and broadcast the update to all other open tabs.*/
export function setSessionSeed(seed: string): void {
  inMemorySessionSeed = seed;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('app_session_seed', seed);
  }
  syncChannel?.postMessage({ type: 'SESSION_UPDATED', seed });
}

/*Retrieve the active session seed from RAM or sessionStorage.*/
export function getSessionSeed(): string | null {
  if (inMemorySessionSeed) return inMemorySessionSeed;

  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('app_session_seed');
    if (stored) {
      inMemorySessionSeed = stored; // Re-hydrate RAM cache
      return stored;
    }
  }
  return null;
}

/**Purge key material from memory/sessionStorage and wipe local IndexedDB*/
export async function clearSecuritySession(): Promise<void> {
  inMemorySessionSeed = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('app_session_seed');
  }
  syncChannel?.postMessage({ type: 'SESSION_CLEARED' });
  await clearDataStoreInternal();
}

/*Wipes all stored ciphertext records from the local browser store.*/
async function clearDataStoreInternal(): Promise<void> {
  try {
    const db = await getValidDatabase();
    const tx = db.transaction(DATA_STORE, "readwrite");
    const store = tx.objectStore(DATA_STORE);
    store.clear();
  } catch (error) {
    console.error("[sec.ts] Error clearing IndexedDB store:", error);
  }
}

// --- HELPER: HEX TO BUFFER ---
function hexToBuffer(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("[sec.ts] Invalid hex string length.");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// --- KEY DERIVATION (HKDF -> AES-GCM 256) ---
async function deriveKeyFromSeed(seedHex: string): Promise<CryptoKey> {
  const seedBytes = hexToBuffer(seedHex);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    seedBytes.buffer as ArrayBuffer,
    { name: "HKDF" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: HKDF_SALT as unknown as BufferSource,
      info: new TextEncoder().encode("app-indexeddb-encryption") as unknown as BufferSource,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

let dbInstance: IDBDatabase | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DATA_STORE)) {
        db.createObjectStore(DATA_STORE);
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;

      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };

      dbInstance.onclose = () => {
        dbInstance = null;
      };

      resolve(dbInstance);
    };

    request.onblocked = () => {
      console.warn("[sec.ts] IndexedDB open blocked: Another tab holds an active connection with an older version.");
    };

    request.onerror = () => reject(request.error);
  });
}

/*Validates that the active database connection is alive before performing transaction operations.*/
async function getValidDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    try {
      dbInstance.transaction(DATA_STORE, "readonly");
      return dbInstance;
    } catch {
      dbInstance = null; // Stale or dead connection reference cleared
    }
  }
  return openDatabase();
}

// DATA STORE READ/WRITE HELPERS
async function writeToDataStore(key: string, value: Uint8Array): Promise<void> {
  const db = await getValidDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DATA_STORE, "readwrite");
    const store = tx.objectStore(DATA_STORE);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function readFromDataStore(key: string): Promise<Uint8Array | null> {
  const db = await getValidDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DATA_STORE, "readonly");
    const store = tx.objectStore(DATA_STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as Uint8Array) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function removeFromDataStore(key: string): Promise<void> {
  const db = await getValidDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DATA_STORE, "readwrite");
    const store = tx.objectStore(DATA_STORE);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// --- ENCRYPT & STORE ---
export async function encryptAndStore(key: string, data: unknown): Promise<void> {
  const activeSeed = getSessionSeed();

  if (!activeSeed) {
    throw new Error("[sec.ts] Security Error: No active session seed in memory or sessionStorage.");
  }

  try {
    const cryptoKey = await deriveKeyFromSeed(activeSeed);
    const jsonString = JSON.stringify(data);
    const encodedPayload = new TextEncoder().encode(jsonString);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      cryptoKey,
      encodedPayload as unknown as BufferSource
    );

    const combined = new Uint8Array(iv.length + ciphertextBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertextBuffer), iv.length);

    await writeToDataStore(key, combined);
  } catch (error) {
    console.error(`[sec.ts] Error encrypting key "${key}":`, error);
    throw error;
  }
}

// --- RETRIEVE & DECRYPT ---
export async function retrieveAndDecrypt<T = unknown>(key: string): Promise<T | null> {
  const activeSeed = getSessionSeed();

  if (!activeSeed) {
    console.warn(`[sec.ts] Session seed missing. Cannot decrypt key "${key}".`);
    return null;
  }

  try {
    const combined = await readFromDataStore(key);
    if (!combined) return null;

    const cryptoKey = await deriveKeyFromSeed(activeSeed);

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      cryptoKey,
      ciphertext as unknown as BufferSource
    );

    const jsonString = new TextDecoder().decode(decryptedBuffer);
    if (!jsonString) throw new Error("Decrypted empty output.");

    return JSON.parse(jsonString) as T;
  } catch (error: any) {
    console.error(`[sec.ts] Error decrypting key "${key}":`, error);
    return null;
  }
}