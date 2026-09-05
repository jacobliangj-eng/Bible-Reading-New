import { Bookmark, BibleVersion, ReadingMode } from '../types';

const STORAGE_KEY = 'bible_app_bookmarks';
const BACKUP_STORAGE_KEY = 'bible_app_bookmarks_backup';
const IDB_NAME = 'BibleAppDatabase';
const IDB_STORE = 'bookmarks';
const IDB_VERSION = 1;

let inMemoryBookmarks: Bookmark[] | null = null;

// Helper to open IndexedDB
function openIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// Persist bookmarks to IndexedDB in the background
async function syncToIndexedDB(bookmarks: Bookmark[]) {
  try {
    const db = await openIndexedDB();
    if (!db) return;
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.clear();
    for (const b of bookmarks) {
      store.put(b);
    }
  } catch (err) {
    console.warn('[BookmarkService] IndexedDB sync error:', err);
  }
}

// Load bookmarks from IndexedDB as fallback
async function loadFromIndexedDB(): Promise<Bookmark[]> {
  try {
    const db = await openIndexedDB();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result;
        if (Array.isArray(results) && results.length > 0) {
          // Sort descending by savedAt
          results.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
          resolve(results);
        } else {
          resolve([]);
        }
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// Initialize and auto-recover from IndexedDB if localStorage was cleared
if (typeof window !== 'undefined') {
  loadFromIndexedDB().then((idbBookmarks) => {
    if (idbBookmarks.length > 0) {
      const current = getBookmarks();
      if (current.length === 0) {
        inMemoryBookmarks = idbBookmarks;
        try {
          const serialized = JSON.stringify(idbBookmarks);
          localStorage.setItem(STORAGE_KEY, serialized);
          localStorage.setItem(BACKUP_STORAGE_KEY, serialized);
        } catch {
          // Ignore
        }
        window.dispatchEvent(new CustomEvent('bible_bookmarks_updated', { detail: idbBookmarks }));
      }
    }
  });

  // Listen for storage changes across tabs or windows
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === BACKUP_STORAGE_KEY) {
      try {
        if (event.newValue) {
          inMemoryBookmarks = JSON.parse(event.newValue);
        } else {
          inMemoryBookmarks = null;
        }
      } catch {
        inMemoryBookmarks = null;
      }
    }
  });

  window.addEventListener('bible_bookmarks_updated', (e: Event) => {
    const customEvent = e as CustomEvent<Bookmark[]>;
    if (customEvent.detail && Array.isArray(customEvent.detail)) {
      inMemoryBookmarks = customEvent.detail;
    }
  });
}

export function getBookmarkId(b: {
  version: BibleVersion;
  bookId: string;
  chapter: number;
  readingMode?: ReadingMode;
  startVerse?: number;
  endVerse?: number;
  verseNumbers?: number[];
}): string {
  if (b.verseNumbers && b.verseNumbers.length > 0) {
    const sorted = [...b.verseNumbers].sort((a, b) => a - b);
    return `${b.version}_${b.bookId}_${b.chapter}_v${sorted.join('_')}`;
  }
  if ((b.readingMode === 'VERSES' || (b.startVerse !== undefined && b.endVerse !== undefined)) && b.startVerse !== undefined && b.endVerse !== undefined) {
    return `${b.version}_${b.bookId}_${b.chapter}_v${b.startVerse}-${b.endVerse}`;
  }
  return `${b.version}_${b.bookId}_${b.chapter}`;
}

export function getBookmarks(): Bookmark[] {
  if (inMemoryBookmarks !== null) {
    return inMemoryBookmarks;
  }

  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Try backup key if primary key was missing
      raw = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw);
      }
    }

    if (!raw) {
      inMemoryBookmarks = [];
      return [];
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      inMemoryBookmarks = parsed;
      return parsed;
    }
    inMemoryBookmarks = [];
    return [];
  } catch (err) {
    console.error('Failed to load bookmarks:', err);
    inMemoryBookmarks = [];
    return [];
  }
}

export function saveBookmark(bookmark: Omit<Bookmark, 'id' | 'savedAt'>): Bookmark[] {
  const current = getBookmarks();
  const id = getBookmarkId(bookmark);
  
  const index = current.findIndex((b) => b.id === id);
  const newEntry: Bookmark = {
    ...bookmark,
    id,
    savedAt: Date.now(),
  };

  let updated: Bookmark[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = newEntry;
  } else {
    updated = [newEntry, ...current];
  }

  inMemoryBookmarks = updated;

  try {
    const serialized = JSON.stringify(updated);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem(BACKUP_STORAGE_KEY, serialized);
  } catch (err) {
    console.error('Failed to save bookmark to localStorage:', err);
  }

  syncToIndexedDB(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bible_bookmarks_updated', { detail: updated }));
  }

  return updated;
}

export function removeBookmark(id: string): Bookmark[] {
  const current = getBookmarks();
  const updated = current.filter((b) => b.id !== id);
  inMemoryBookmarks = updated;

  try {
    const serialized = JSON.stringify(updated);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem(BACKUP_STORAGE_KEY, serialized);
  } catch (err) {
    console.error('Failed to remove bookmark from localStorage:', err);
  }

  syncToIndexedDB(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bible_bookmarks_updated', { detail: updated }));
  }

  return updated;
}

export function isBookmarked(
  version: BibleVersion,
  bookId: string,
  chapter: number,
  readingMode?: ReadingMode,
  startVerse?: number,
  endVerse?: number,
  verseNumbers?: number[]
): boolean {
  const current = getBookmarks();
  const id = getBookmarkId({ version, bookId, chapter, readingMode, startVerse, endVerse, verseNumbers });
  return current.some((b) => b.id === id);
}
