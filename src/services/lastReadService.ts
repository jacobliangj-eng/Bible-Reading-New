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

/**
 * Retrieves the last read scripture record from localStorage.
 */
export function getLastReadRecord(): LastReadRecord | null {
  try {
    const raw = localStorage.getItem(LAST_READ_STORAGE_KEY);
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
    localStorage.setItem(LAST_READ_STORAGE_KEY, JSON.stringify(data));
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
  } catch (err) {
    console.error('Failed to clear last read record:', err);
  }
}
