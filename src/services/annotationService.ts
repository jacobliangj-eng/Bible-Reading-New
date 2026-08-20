import { BibleVersion, HighlightColor, VerseAnnotation } from '../types';

const ANNOTATIONS_STORAGE_KEY = 'bible_app_verse_annotations';

/**
 * Generate a unique ID for a verse annotation.
 */
export function getAnnotationId(version: BibleVersion, bookId: string, chapter: number, verse: number): string {
  return `${version}_${bookId}_${chapter}_${verse}`;
}

/**
 * Get all annotations dictionary from localStorage.
 */
function getAllAnnotationsMap(): Record<string, VerseAnnotation> {
  try {
    const raw = localStorage.getItem(ANNOTATIONS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, VerseAnnotation>;
  } catch (err) {
    console.error('Failed to load annotations from localStorage:', err);
    return {};
  }
}

/**
 * Save all annotations dictionary to localStorage.
 */
function saveAllAnnotationsMap(map: Record<string, VerseAnnotation>): void {
  try {
    localStorage.setItem(ANNOTATIONS_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save annotations to localStorage:', err);
  }
}

/**
 * Get all annotations as an array, sorted by updatedAt descending.
 */
export function getAllAnnotations(): VerseAnnotation[] {
  const map = getAllAnnotationsMap();
  return Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Get all annotations for a specific chapter.
 * Returns a map of verseNumber -> VerseAnnotation.
 */
export function getChapterAnnotations(
  version: BibleVersion,
  bookId: string,
  chapter: number
): Record<number, VerseAnnotation> {
  const map = getAllAnnotationsMap();
  const result: Record<number, VerseAnnotation> = {};
  const prefix = `${version}_${bookId}_${chapter}_`;

  for (const [id, item] of Object.entries(map)) {
    if (id.startsWith(prefix) && item.chapter === chapter && item.bookId === bookId && item.version === version) {
      result[item.verse] = item;
    }
  }

  return result;
}

/**
 * Get annotation for a specific verse.
 */
export function getVerseAnnotation(
  version: BibleVersion,
  bookId: string,
  chapter: number,
  verse: number
): VerseAnnotation | undefined {
  const id = getAnnotationId(version, bookId, chapter, verse);
  const map = getAllAnnotationsMap();
  return map[id];
}

/**
 * Set or update highlight color for a verse.
 * If color is null/undefined, removes the highlight.
 */
export function setVerseHighlight(params: {
  version: BibleVersion;
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  verseText: string;
  color?: HighlightColor | null;
}): VerseAnnotation | null {
  const id = getAnnotationId(params.version, params.bookId, params.chapter, params.verse);
  const map = getAllAnnotationsMap();
  const existing = map[id];

  if (!params.color) {
    // Remove highlight
    if (existing) {
      if (!existing.note) {
        // If no note either, remove entry completely
        delete map[id];
        saveAllAnnotationsMap(map);
        return null;
      } else {
        // Keep note, remove highlightColor
        const updated: VerseAnnotation = {
          ...existing,
          highlightColor: undefined,
          updatedAt: Date.now(),
        };
        map[id] = updated;
        saveAllAnnotationsMap(map);
        return updated;
      }
    }
    return null;
  }

  // Set highlight
  const updated: VerseAnnotation = {
    id,
    bookId: params.bookId,
    bookName: params.bookName,
    chapter: params.chapter,
    verse: params.verse,
    version: params.version,
    verseText: params.verseText || existing?.verseText || '',
    note: existing?.note,
    highlightColor: params.color,
    updatedAt: Date.now(),
  };

  map[id] = updated;
  saveAllAnnotationsMap(map);
  return updated;
}

/**
 * Set or update a note for a verse.
 * If note is empty string or null, removes the note.
 */
export function setVerseNote(params: {
  version: BibleVersion;
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  verseText: string;
  note?: string | null;
}): VerseAnnotation | null {
  const id = getAnnotationId(params.version, params.bookId, params.chapter, params.verse);
  const map = getAllAnnotationsMap();
  const existing = map[id];
  const trimmedNote = (params.note || '').trim();

  if (!trimmedNote) {
    // Remove note
    if (existing) {
      if (!existing.highlightColor) {
        // If no highlight either, remove entry completely
        delete map[id];
        saveAllAnnotationsMap(map);
        return null;
      } else {
        // Keep highlight, remove note
        const updated: VerseAnnotation = {
          ...existing,
          note: undefined,
          updatedAt: Date.now(),
        };
        map[id] = updated;
        saveAllAnnotationsMap(map);
        return updated;
      }
    }
    return null;
  }

  // Save note
  const updated: VerseAnnotation = {
    id,
    bookId: params.bookId,
    bookName: params.bookName,
    chapter: params.chapter,
    verse: params.verse,
    version: params.version,
    verseText: params.verseText || existing?.verseText || '',
    highlightColor: existing?.highlightColor,
    note: trimmedNote,
    updatedAt: Date.now(),
  };

  map[id] = updated;
  saveAllAnnotationsMap(map);
  return updated;
}

/**
 * Delete an entire annotation (both highlight and note).
 */
export function deleteAnnotation(id: string): void {
  const map = getAllAnnotationsMap();
  if (map[id]) {
    delete map[id];
    saveAllAnnotationsMap(map);
  }
}
