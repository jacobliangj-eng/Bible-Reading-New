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
