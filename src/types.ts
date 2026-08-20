export type BibleVersion = 'CUV' | 'KJV' | 'LSG';

export interface VersionInfo {
  id: BibleVersion;
  name: string;
  nativeName: string;
  language: string;
  langCode: string; // for Web Speech API e.g. 'zh-TW', 'en-US', 'fr-FR'
  description: string;
  badge: string;
}

export type Testament = 'OT' | 'NT';

export interface BibleBook {
  id: string; // e.g. 'GEN', 'MAT'
  testament: Testament;
  number: number; // 1 to 66
  chaptersCount: number;
  name: {
    CUV: string; // e.g., 創世記
    KJV: string; // e.g., Genesis
    LSG: string; // e.g., Genèse
  };
  shortName: {
    CUV: string;
    KJV: string;
    LSG: string;
  };
}

export interface Verse {
  chapter: number;
  verse: number;
  text: string;
}

export type ReadingMode = 'BOOK' | 'CHAPTERS' | 'VERSES';

export interface ReadingConfig {
  mode: ReadingMode;
  bookId: string;
  // For Mode 1 (BOOK): reads entire book ch 1 to end
  // For Mode 2 (CHAPTERS): startChapter to endChapter
  startChapter: number;
  endChapter: number;
  // For Mode 3 (VERSES): target chapter, startVerse to endVerse
  targetChapter: number;
  startVerse: number;
  endVerse: number;
  // Repeat settings
  repeatCount: number; // 0 for infinite, 1 for once, 2...
}

export type Tier = 'TIER1' | 'TIER2' | 'TIER3';

export interface Bookmark {
  id: string; // e.g. `${version}_${bookId}_${chapter}` or `${version}_${bookId}_${chapter}_v${startVerse}-${endVerse}`
  bookId: string;
  bookName: string;
  chapter: number;
  version: BibleVersion;
  savedAt: number;
  previewText?: string;
  startVerse?: number;
  endVerse?: number;
  readingMode?: ReadingMode;
}
