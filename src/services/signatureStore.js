/**
 * Almacén persistente local de firmas de DNI en IndexedDB.
 */

const DB_NAME = 'anexor_db';
const DB_VERSION = 1;
const STORE_NAME = 'signatures';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'dni' });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function saveSignatureToDb(dni, signatureDataUrl, meta = {}) {
  const cleanDni = String(dni || '').trim().toUpperCase();
  if (!cleanDni) throw new Error('DNI inválido');

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item = {
      dni: cleanDni,
      signatureDataUrl,
      nombre: meta.nombre || '',
      updatedAt: new Date().toISOString()
    };
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

export async function getSignatureFromDb(dni) {
  const cleanDni = String(dni || '').trim().toUpperCase();
  if (!cleanDni) return null;

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(cleanDni);
    req.onsuccess = () => resolve(req.result ? req.result.signatureDataUrl : null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSignaturesFromDb() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const map = {};
      (req.result || []).forEach(item => {
        map[item.dni] = item.signatureDataUrl;
      });
      resolve(map);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSignatureFromDb(dni) {
  const cleanDni = String(dni || '').trim().toUpperCase();
  if (!cleanDni) return;

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(cleanDni);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}
