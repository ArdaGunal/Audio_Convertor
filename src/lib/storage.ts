// IndexedDB Storage Service for Audio Convertor
// Dosyaları tarayıcıda kalıcı olarak saklar

const DB_NAME = 'AudioConvertorDB';
const DB_VERSION = 2;  // Bumped for new editor store
const AUDIO_STORE = 'audioFiles';
const VIDEO_STORE = 'videoFiles';
const EDITOR_STORE = 'editorFiles';

export interface StoredFile {
    id: string;
    name: string;
    size: number;
    originalFormat: string;
    targetFormat: string;
    status: 'waiting' | 'converting' | 'done' | 'error';
    progress: number;
    duration?: number;
    blob?: Blob;
    timestamp: number;
}

// Open or create database
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Create audio files store
            if (!db.objectStoreNames.contains(AUDIO_STORE)) {
                db.createObjectStore(AUDIO_STORE, { keyPath: 'id' });
            }

            // Create video files store
            if (!db.objectStoreNames.contains(VIDEO_STORE)) {
                db.createObjectStore(VIDEO_STORE, { keyPath: 'id' });
            }

            // Create editor files store
            if (!db.objectStoreNames.contains(EDITOR_STORE)) {
                db.createObjectStore(EDITOR_STORE, { keyPath: 'id' });
            }
        };
    });
}

// Helper to get store name
function getStoreName(store: 'audio' | 'video' | 'editor'): string {
    switch (store) {
        case 'audio': return AUDIO_STORE;
        case 'video': return VIDEO_STORE;
        case 'editor': return EDITOR_STORE;
    }
}

// Save file to IndexedDB
export async function saveFileToStorage(file: StoredFile, store: 'audio' | 'video' | 'editor' = 'audio'): Promise<void> {
    const db = await openDB();
    const storeName = getStoreName(store);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const objectStore = transaction.objectStore(storeName);

        const request = objectStore.put({
            ...file,
            timestamp: Date.now()
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
    });
}

// Load all files from IndexedDB
export async function loadFilesFromStorage(store: 'audio' | 'video' | 'editor' = 'audio'): Promise<StoredFile[]> {
    const db = await openDB();
    const storeName = getStoreName(store);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.getAll();

        request.onsuccess = () => {
            // Sort by timestamp, newest first
            const files = request.result.sort((a, b) => b.timestamp - a.timestamp);
            resolve(files);
        };
        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
    });
}

// Delete file from IndexedDB
export async function deleteFileFromStorage(id: string, store: 'audio' | 'video' | 'editor' = 'audio'): Promise<void> {
    const db = await openDB();
    const storeName = getStoreName(store);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
    });
}

// Clear all files from IndexedDB
export async function clearAllFilesFromStorage(store: 'audio' | 'video' | 'editor' = 'audio'): Promise<void> {
    const db = await openDB();
    const storeName = getStoreName(store);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
    });
}

// Update file in IndexedDB
export async function updateFileInStorage(id: string, updates: Partial<StoredFile>, store: 'audio' | 'video' | 'editor' = 'audio'): Promise<void> {
    const db = await openDB();
    const storeName = getStoreName(store);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const objectStore = transaction.objectStore(storeName);

        // First get the existing file
        const getRequest = objectStore.get(id);

        getRequest.onsuccess = () => {
            const existingFile = getRequest.result;
            if (existingFile) {
                const updatedFile = { ...existingFile, ...updates, timestamp: Date.now() };
                const putRequest = objectStore.put(updatedFile);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                resolve(); // File doesn't exist, nothing to update
            }
        };

        getRequest.onerror = () => reject(getRequest.error);
        transaction.oncomplete = () => db.close();
    });
}
