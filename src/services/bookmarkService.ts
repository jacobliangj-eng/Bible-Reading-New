import { Bookmark, BibleVersion, ReadingMode } from '../types';

const STORAGE_KEY = 'bible_app_bookmarks';

export function getBookmarkId(b: {
  version: BibleVersion;
  bookId: string;
  chapter: number;
  readingMode?: ReadingMode;
  startVerse?: number;
  endVerse?: number;
}): string {
  if ((b.readingMode === 'VERSES' || (b.startVerse !== undefined && b.endVerse !== undefined)) && b.startVerse !== undefined && b.endVerse !== undefined) {
    return `${b.version}_${b.bookId}_${b.chapter}_v${b.startVerse}-${b.endVerse}`;
  }
  return `${b.version}_${b.bookId}_${b.chapter}`;
}

export function getBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Bookmark[];
  } catch (err) {
    console.error('Failed to load bookmarks:', err);
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

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save bookmark:', err);
  }
  return updated;
}

export function removeBookmark(id: string): Bookmark[] {
  const current = getBookmarks();
  const updated = current.filter((b) => b.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to remove bookmark:', err);
  }
  return updated;
}

export function isBookmarked(
  version: BibleVersion,
  bookId: string,
  chapter: number,
  readingMode?: ReadingMode,
  startVerse?: number,
  endVerse?: number
): boolean {
  const current = getBookmarks();
  const id = getBookmarkId({ version, bookId, chapter, readingMode, startVerse, endVerse });
  return current.some((b) => b.id === id);
}
