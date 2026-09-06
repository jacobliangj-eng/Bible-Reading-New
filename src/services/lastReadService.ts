import { BibleVersion, ReadingMode } from '../types';

export interface LastReadRecord {
  bookId: string;
  bookName: string;
  chapter: number;
  verse?: number;
  version: BibleVersion;
  readingMode?: ReadingMode;
  startVerse?: number;
  endVerse?: number;
  updatedAt: number;
  previewText?: string;
}

const LAST_READ_STORAGE_KEY = 'bible_app_last_read';
const LAST_READ_BACKUP_STORAGE_KEY = 'bible_app_last_read_backup';
const RECENT_BOOKS_STORAGE_KEY = 'bible_app_recent_books';
const DEFAULT_RECENT_BOOK_IDS = ['REV', 'JER', 'RUT', 'GEN', 'JON']; // 啟示錄, 耶利米書, 路得記, 創世記, 約拿書 (與圖2預設相符)

/**
 * Retrieves up to 5 recently read book IDs.
 */
export function getRecentBookIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_BOOKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const combined = [...parsed];
        for (const defId of DEFAULT_RECENT_BOOK_IDS) {
          if (!combined.includes(defId)) {
            combined.push(defId);
          }
          if (combined.length >= 5) break;
        }
        return combined.slice(0, 5);
      }
    }
  } catch (err) {
    console.error('Failed to load recent book IDs:', err);
  }
  return DEFAULT_RECENT_BOOK_IDS;
}

/**
 * Adds a book ID to the recent books history list.
 */
export function addRecentBook(bookId: string): void {
  try {
    const current = getRecentBookIds();
    const updated = [bookId, ...current.filter((id) => id !== bookId)].slice(0, 10);
    localStorage.setItem(RECENT_BOOKS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save recent book:', err);
  }
}

/**
 * Retrieves the last read scripture record from localStorage.
 */
export function getLastReadRecord(): LastReadRecord | null {
  try {
    let raw = localStorage.getItem(LAST_READ_STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LAST_READ_BACKUP_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(LAST_READ_STORAGE_KEY, raw);
      }
    }
    if (!raw) return null;
    return JSON.parse(raw) as LastReadRecord;
  } catch (err) {
    console.error('Failed to load last read record:', err);
    return null;
  }
}

/**
 * Saves or updates the last read scripture record in localStorage.
 */
export function saveLastReadRecord(record: Omit<LastReadRecord, 'updatedAt'>): void {
  try {
    const data: LastReadRecord = {
      ...record,
      updatedAt: Date.now(),
    };
    const serialized = JSON.stringify(data);
    localStorage.setItem(LAST_READ_STORAGE_KEY, serialized);
    localStorage.setItem(LAST_READ_BACKUP_STORAGE_KEY, serialized);
    addRecentBook(record.bookId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bible_last_read_updated', { detail: data }));
    }
  } catch (err) {
    console.error('Failed to save last read record:', err);
  }
}

/**
 * Clears the last read scripture record.
 */
export function clearLastReadRecord(): void {
  try {
    localStorage.removeItem(LAST_READ_STORAGE_KEY);
    localStorage.removeItem(LAST_READ_BACKUP_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bible_last_read_updated', { detail: null }));
    }
  } catch (err) {
    console.error('Failed to clear last read record:', err);
  }
}
