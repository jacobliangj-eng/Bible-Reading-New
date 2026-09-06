export type BibleVersion = 'CUV' | 'WEB' | 'LSG' | 'KJV';

export type FontFamily = 'sans' | 'serif' | 'kai';

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
    WEB: string; // e.g., Genesis
    KJV?: string;
    LSG: string; // e.g., Genèse
  };
  shortName: {
    CUV: string;
    WEB: string;
    KJV?: string;
    LSG: string;
  };
}

export interface VerseSegment {
  text: string;
  isRed: boolean; // 是否為  神或耶穌的話（紅字）
}

export interface Verse {
  chapter: number;
  verse: number;
  text: string; // 純文字版本（供語音朗讀、複製、搜尋等）
  segments?: VerseSegment[]; // 結構化紅字片段（紅字版顯示）
  rawContent?: string; // 包含 HTML span 標籤的原文字串
  subtitle?: string; // 章節小標題（例如【　神創造天地】）
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
  verseNumbers?: number[];
}

export interface BibleSearchResult {
  bookId: string;
  bookName: string;
  bookNumber: number;
  testament: Testament;
  chapter: number;
  verse: number;
  text: string;
  version: BibleVersion;
}
