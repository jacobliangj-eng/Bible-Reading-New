import { BIBLE_BOOKS, VERSIONS } from '../data/bibleBooks';
import { DAILY_VERSES } from '../data/dailyVerses';
import { BibleBook, BibleSearchResult, BibleVersion } from '../types';
import { normalizeGodTerms } from './bibleService';

// Map of FHL Chinese abbreviations to book IDs
const FHL_NAME_TO_BOOK_ID: Record<string, string> = {
  '創': 'GEN', '出': 'EXO', '利': 'LEV', '民': 'NUM', '申': 'DEU', '書': 'JOS', '士': 'JDG', '得': 'RUT',
  '撒上': '1SA', '撒下': '2SA', '王上': '1KI', '王下': '2KI', '代上': '1CH', '代下': '2CH',
  '拉': 'EZR', '尼': 'NEH', '斯': 'EST', '帖': 'EST', '伯': 'JOB', '詩': 'PSA', '箴': 'PRO', '傳': 'ECC', '歌': 'SNG',
  '賽': 'ISA', '耶': 'JER', '哀': 'LAM', '結': 'EZK', '但': 'DAN', '何': 'HOS', '珥': 'JOL', '摩': 'AMO',
  '俄': 'OBA', '拿': 'JON', '彌': 'MIC', '鴻': 'NAH', '哈': 'HAB', '番': 'ZEP', '該': 'HAG', '亞': 'ZEC',
  '瑪': 'MAL', '太': 'MAT', '可': 'MRK', '路': 'LUK', '約': 'JHN', '使': 'ACT', '羅': 'ROM', '林前': '1CO',
  '林後': '2CO', '加': 'GAL', '弗': 'EPH', '腓': 'PHP', '西': 'COL', '帖前': '1TH', '帖後': '2TH',
  '提前': '1TI', '提後': '2TI', '多': 'TIT', '門': 'PHM', '希': 'HEB', '雅': 'JAS', '彼前': '1PE',
  '彼後': '2PE', '約一': '1JN', '約二': '2JN', '約三': '3JN', '猶': 'JUD', '啟': 'REV',
};

// Search results in-memory cache
const searchCache = new Map<string, BibleSearchResult[]>();

export interface ReferenceMatch {
  book: BibleBook;
  chapter: number;
  verse?: number;
  displayText: string;
}

/**
 * Parses user input to detect if it's a specific scripture reference (e.g. "約 3:16", "詩篇 23", "創世記 1:1", "Rom 8:28")
 */
export function parseScriptureReference(input: string, version: BibleVersion = 'CUV'): ReferenceMatch | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length < 2) return null;

  // Normalize full-width characters & punctuation
  const clean = trimmed
    .replace(/：/g, ':')
    .replace(/[章篇]/g, ':')
    .replace(/[節節]/g, '')
    .replace(/\s+/g, ' ');

  // Regex pattern matching: [Book Name/Abbr] [Chapter](:[Verse])?
  // Examples: "約 3:16", "約翰福音 3:16", "創 1", "詩篇 23", "Rom 8:28", "1 Cor 13:4"
  const refPattern = /^([0-9\u4e00-\u9fa5a-zA-Z\s]+?)\s*(\d+)(?:\s*[:\.]\s*(\d+))?$/;
  const match = clean.match(refPattern);

  if (!match) return null;

  const rawBookStr = match[1].trim().toLowerCase();
  const chapterNum = parseInt(match[2], 10);
  const verseNum = match[3] ? parseInt(match[3], 10) : undefined;

  if (isNaN(chapterNum) || chapterNum <= 0) return null;

  // Search in BIBLE_BOOKS for matching book
  const foundBook = BIBLE_BOOKS.find((b) => {
    const idMatch = b.id.toLowerCase() === rawBookStr;
    const cuvName = b.name.CUV.toLowerCase();
    const cuvShort = b.shortName.CUV.toLowerCase();
    const kjvName = b.name.KJV.toLowerCase();
    const kjvShort = b.shortName.KJV.toLowerCase();
    const lsgName = b.name.LSG.toLowerCase();
    const lsgShort = b.shortName.LSG.toLowerCase();

    // Check Chinese FHL shortname mapping
    const fhlId = FHL_NAME_TO_BOOK_ID[match[1].trim()];
    if (fhlId && fhlId === b.id) return true;

    return (
      idMatch ||
      rawBookStr === cuvName ||
      rawBookStr === cuvShort ||
      rawBookStr === kjvName ||
      rawBookStr === kjvShort ||
      rawBookStr === lsgName ||
      rawBookStr === lsgShort ||
      cuvName.startsWith(rawBookStr) ||
      kjvName.startsWith(rawBookStr)
    );
  });

  if (!foundBook) return null;

  // Check chapter validity
  const validChapter = Math.min(Math.max(1, chapterNum), foundBook.chaptersCount);
  const isPsalm = foundBook.id === 'PSA' || foundBook.name.CUV.includes('詩篇');
  const unit = isPsalm ? '篇' : '章';

  let displayText = `《${foundBook.name[version] || foundBook.name.CUV}》第 ${validChapter} ${unit}`;
  if (verseNum && verseNum > 0) {
    displayText += ` 第 ${verseNum} 節`;
  }

  return {
    book: foundBook,
    chapter: validChapter,
    verse: verseNum && verseNum > 0 ? verseNum : undefined,
    displayText,
  };
}

/**
 * Searches the entire Bible for scriptures matching the keyword.
 * Uses FHL Online Search API with offline fallbacks.
 */
export async function searchScriptureByKeyword(
  keyword: string,
  version: BibleVersion = 'CUV'
): Promise<BibleSearchResult[]> {
  const query = keyword.trim();
  if (!query || query.length < 1) {
    return [];
  }

  const cacheKey = `${version}_${query}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  const results: BibleSearchResult[] = [];
  const seenIds = new Set<string>();

  // 1. Try Online Search with proxy or direct FHL API
  try {
    const fhlVersion = version === 'KJV' ? 'kjv' : 'unv';
    const fhlQuery = query === '上帝' ? '神' : query;
    const proxyUrl = `/api/bible/search?q=${encodeURIComponent(fhlQuery)}&version=${fhlVersion}`;

    let res = await fetch(proxyUrl);
    if (!res.ok) {
      // Fallback to direct if proxy is unreachable
      const directUrl = `https://bible.fhl.net/json/se.php?q=${encodeURIComponent(fhlQuery)}&VERSION=${fhlVersion}&orig=0`;
      res = await fetch(directUrl);
    }

    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.record)) {
        for (const item of json.record) {
          const chap = Number(item.chap);
          const sec = Number(item.sec);
          const rawText = item.bible_text
            ? (version === 'CUV' ? normalizeGodTerms(item.bible_text.trim()) : item.bible_text.replace(/[\u3000\s]+/g, ' ').trim())
            : '';

          if (!rawText) continue;

          // Find book matching chineses, engs, or bid
          let matchedBook: BibleBook | undefined;
          if (item.chineses) {
            const bookId = FHL_NAME_TO_BOOK_ID[item.chineses];
            if (bookId) {
              matchedBook = BIBLE_BOOKS.find((b) => b.id === bookId);
            }
            if (!matchedBook) {
              matchedBook = BIBLE_BOOKS.find((b) => b.shortName.CUV === item.chineses || b.name.CUV === item.chineses);
            }
          }

          if (!matchedBook && item.engs) {
            matchedBook = BIBLE_BOOKS.find(
              (b) => b.id.toLowerCase() === item.engs.toLowerCase() || b.shortName.KJV.toLowerCase() === item.engs.toLowerCase()
            );
          }

          if (!matchedBook && typeof item.bid === 'number') {
            matchedBook = BIBLE_BOOKS.find((b) => b.number === item.bid);
          }

          if (matchedBook) {
            const resultKey = `${matchedBook.id}_${chap}_${sec}`;
            if (!seenIds.has(resultKey)) {
              seenIds.add(resultKey);
              results.push({
                bookId: matchedBook.id,
                bookName: matchedBook.name[version] || matchedBook.name.CUV,
                bookNumber: matchedBook.number,
                testament: matchedBook.testament,
                chapter: chap,
                verse: sec,
                text: rawText,
                version,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[searchScriptureByKeyword] FHL online search error, falling back to local verses:', err);
  }

  // 2. Also search through local Daily Verses & Cache to ensure offline and quick hits
  const lowerQuery = query.toLowerCase();
  const searchTerms = [lowerQuery];
  if (lowerQuery === '上帝') {
    searchTerms.push('　神', '神');
  }

  for (const daily of DAILY_VERSES) {
    const rawDailyText = daily.text[version] || daily.text.CUV;
    const text = version === 'CUV' ? normalizeGodTerms(rawDailyText) : rawDailyText;
    const ref = daily.reference[version] || daily.reference.CUV;
    const isHit = searchTerms.some((st) => text.toLowerCase().includes(st) || ref.toLowerCase().includes(st));
    if (isHit) {
      const parsedRef = parseScriptureReference(ref, version);
      if (parsedRef) {
        const resultKey = `${parsedRef.book.id}_${parsedRef.chapter}_${parsedRef.verse || 1}`;
        if (!seenIds.has(resultKey)) {
          seenIds.add(resultKey);
          results.push({
            bookId: parsedRef.book.id,
            bookName: parsedRef.book.name[version] || parsedRef.book.name.CUV,
            bookNumber: parsedRef.book.number,
            testament: parsedRef.book.testament,
            chapter: parsedRef.chapter,
            verse: parsedRef.verse || 1,
            text,
            version,
          });
        }
      }
    }
  }

  // Sort results canonical by Bible book number, chapter, verse
  results.sort((a, b) => {
    if (a.bookNumber !== b.bookNumber) return a.bookNumber - b.bookNumber;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  searchCache.set(cacheKey, results);
  return results;
}
