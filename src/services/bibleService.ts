import { BibleVersion, Verse, VerseSegment } from '../types';
import { getCuratedSubtitle } from '../data/cuvSubtitles';

// Translation mapping for HelloAO API
const HELLOAO_TRANSLATIONS: Record<BibleVersion, string> = {
  CUV: 'cmn_cuv',
  KJV: 'eng_kjv',
  LSG: 'fra_lsg',
};

// Book 1-66 numbers mapping for bibletool.konline.org & FHL
const BOOK_ID_TO_NUMBER: Record<string, number> = {
  GEN: 1, EXO: 2, LEV: 3, NUM: 4, DEU: 5, JOS: 6, JDG: 7, RUT: 8,
  '1SA': 9, '2SA': 10, '1KI': 11, '2KI': 12, '1CH': 13, '2CH': 14,
  EZR: 15, NEH: 16, EST: 17, JOB: 18, PSA: 19, PRO: 20, ECC: 21, SNG: 22,
  ISA: 23, JER: 24, LAM: 25, EZK: 26, DAN: 27, HOS: 28, JOL: 29, AMO: 30,
  OBA: 31, JON: 32, MIC: 33, NAH: 34, HAB: 35, ZEP: 36, HAG: 37, ZEC: 38,
  MAL: 39, MAT: 40, MRK: 41, LUK: 42, JHN: 43, ACT: 44, ROM: 45, '1CO': 46,
  '2CO': 47, GAL: 48, EPH: 49, PHP: 50, COL: 51, '1TH': 52, '2TH': 53,
  '1TI': 54, '2TI': 55, TIT: 56, PHM: 57, HEB: 58, JAS: 59, '1PE': 60,
  '2PE': 61, '1JN': 62, '2JN': 63, '3JN': 64, JUD: 65, REV: 66,
};

// Book short names for FHL (Chinese Bible API fallback)
const FHL_BOOK_NAMES: Record<string, string> = {
  GEN: '創', EXO: '出', LEV: '利', NUM: '民', DEU: '申', JOS: '書', JDG: '士', RUT: '得',
  '1SA': '撒上', '2SA': '撒下', '1KI': '王上', '2KI': '王下', '1CH': '代上', '2CH': '代下',
  EZR: '拉', NEH: '尼', EST: '帖', JOB: '伯', PSA: '詩', PRO: '箴', ECC: '傳', SNG: '歌',
  ISA: '賽', JER: '耶', LAM: '哀', EZK: '結', DAN: '但', HOS: '何', JOL: '珥', AMO: '摩',
  OBA: '俄', JON: '拿', MIC: '彌', NAH: '鴻', HAB: '哈', ZEP: '番', HAG: '該', ZEC: '亞',
  MAL: '瑪', MAT: '太', MRK: '可', LUK: '路', JHN: '約', ACT: '使', ROM: '羅', '1CO': '林前',
  '2CO': '林後', GAL: '加', EPH: '弗', PHP: '腓', COL: '西', '1TH': '帖前', '2TH': '帖後',
  '1TI': '提前', '2TI': '提後', TIT: '多', PHM: '門', HEB: '希', JAS: '雅', '1PE': '彼前',
  '2PE': '彼後', '1JN': '約一', '2JN': '約二', '3JN': '約三', JUD: '猶', REV: '啟',
};

// In-memory cache for instant subsequent loading
const verseCache = new Map<string, Verse[]>();

// Cache key version prefix to invalidate any stale un-colored local storage on mobile/desktop
const CACHE_VERSION = 'bible_v8_';

// Auto-clean old legacy un-colored caches on module load
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('bible_') && !key.startsWith(CACHE_VERSION)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage cleanup errors
  }
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(extractText).join(' ');
  if (typeof content === 'object' && content !== null) {
    const obj = content as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
    if (obj.content) return extractText(obj.content);
  }
  return '';
}

/**
 * Parses HTML content containing <span class='browse-verse-red' style='color: red;'>
 * from bibletool.konline.org into structured text segments where God and Jesus' words are tagged as isRed: true.
 */
export function parseSegmentsFromHtml(content: string): VerseSegment[] {
  if (!content) return [];
  if (!content.includes('browse-verse-red') && !content.includes('color: red') && !content.includes('color:red') && !content.includes('<span')) {
    return [{ text: content.replace(/<[^>]+>/g, '').trim(), isRed: false }];
  }

  // Handle potentially unclosed span tags
  let normalized = content;
  const openMatches = normalized.match(/<span[^>]*class=['\"][^'\"]*browse-verse-red[^'\"]*['\"][^>]*>|<span[^>]*style=['\"][^'\"]*color:\s*red[^'\"]*['\"][^>]*>/gi) || [];
  const closeMatches = normalized.match(/<\/span>/gi) || [];
  if (openMatches.length > closeMatches.length) {
    normalized += '</span>'.repeat(openMatches.length - closeMatches.length);
  }

  const segments: VerseSegment[] = [];
  const regex = /<span[^>]*class=['\"][^'\"]*browse-verse-red[^'\"]*['\"][^>]*>([\s\S]*?)<\/span>|<span[^>]*style=['\"][^'\"]*color:\s*red[^'\"]*['\"][^>]*>([\s\S]*?)<\/span>|([^<]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalized)) !== null) {
    const redContent = match[1] ?? match[2];
    if (redContent !== undefined) {
      const cleanText = redContent.replace(/<[^>]+>/g, '');
      if (cleanText) {
        segments.push({ text: cleanText, isRed: true });
      }
    } else if (match[3] !== undefined) {
      const cleanText = match[3];
      if (cleanText) {
        segments.push({ text: cleanText, isRed: false });
      }
    }
  }

  return segments.length > 0
    ? segments
    : [{ text: content.replace(/<[^>]+>/g, '').trim(), isRed: false }];
}

/**
 * Intelligent Red-Letter detector for CUV in case of network fallback without HTML tags.
 * Comprehensive detection for:
 * 1. Spoken words of God (Old Testament: Genesis to Malachi)
 * 2. Spoken words of Jesus Christ (Gospels, Acts, Revelation)
 */
export function enrichSegmentsWithRedLetters(
  rawText: string,
  bookId: string,
  chapter?: number
): VerseSegment[] {
  if (!rawText) return [];

  const isGospel = ['MAT', 'MRK', 'LUK', 'JHN'].includes(bookId);
  const isApostolicOrRev = ['ACT', 'REV', '1CO'].includes(bookId);
  const isOT = !['MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'].includes(bookId);

  // Match Chinese quote pairs 「...」
  const quoteRegex = /「([^」]+)」/g;
  const segments: VerseSegment[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let previousSpeakerWasGodOrJesus = false;

  while ((match = quoteRegex.exec(rawText)) !== null) {
    const before = rawText.slice(lastIdx, match.index);
    if (before) {
      segments.push({ text: before, isRed: false });
    }

    const quoteContent = match[1];

    // Check if there is an explicit other speaker right before this quote
    const isOtherSpeaker =
      before.includes('門徒') ||
      before.includes('彼得') ||
      before.includes('約翰對') ||
      before.includes('猶大') ||
      before.includes('撒但') ||
      before.includes('魔鬼') ||
      before.includes('蛇對') ||
      before.includes('女人說') ||
      before.includes('亞當說') ||
      before.includes('法老') ||
      before.includes('巴蘭') ||
      before.includes('摩西對') ||
      before.includes('百姓') ||
      before.includes('眾人') ||
      before.includes('文士') ||
      before.includes('法利賽人') ||
      before.includes('祭司長') ||
      before.includes('婦人') ||
      before.includes('百夫長') ||
      before.includes('彼拉多');

    // God/Jesus speaker triggers in OT and NT
    const hasGodOrJesusTrigger =
      before.includes('神說') ||
      before.includes('神對') ||
      before.includes('神又對') ||
      before.includes('神向') ||
      before.includes('神吩咐') ||
      before.includes('神呼叫') ||
      before.includes('神命令') ||
      before.includes('神起誓') ||
      before.includes('耶和華說') ||
      before.includes('耶和華對') ||
      before.includes('耶和華曉諭') ||
      before.includes('耶和華吩咐') ||
      before.includes('耶和華向') ||
      before.includes('耶和華降臨') ||
      before.includes('耶和華如此說') ||
      before.includes('萬軍之耶和華') ||
      before.includes('主耶和華') ||
      before.includes('主說') ||
      before.includes('主對') ||
      before.includes('主又說') ||
      before.includes('耶穌') ||
      before.includes('基督') ||
      before.includes('我實實在在') ||
      before.includes('人子');

    const continuationTrigger =
      before.includes('又說') ||
      before.includes('說：') ||
      before.includes('回答說') ||
      before.trim() === '' ||
      before.trim() === '，' ||
      before.trim() === '；' ||
      before.trim() === '：';

    let isGodOrJesus = false;

    if (hasGodOrJesusTrigger && !isOtherSpeaker) {
      isGodOrJesus = true;
      previousSpeakerWasGodOrJesus = true;
    } else if (continuationTrigger && previousSpeakerWasGodOrJesus && !isOtherSpeaker) {
      isGodOrJesus = true;
    } else if (!isOtherSpeaker && (isGospel || (bookId === 'REV' && [1, 2, 3, 21, 22].includes(chapter || 1)))) {
      isGodOrJesus = true;
      previousSpeakerWasGodOrJesus = true;
    } else if (isOT && !isOtherSpeaker && (quoteContent.startsWith('我是耶和華') || quoteContent.startsWith('我耶和華') || quoteContent.startsWith('我必') || quoteContent.startsWith('我若') || quoteContent.includes('耶和華如此說') || quoteContent.includes('萬軍之耶和華說'))) {
      isGodOrJesus = true;
      previousSpeakerWasGodOrJesus = true;
    } else {
      previousSpeakerWasGodOrJesus = false;
    }

    segments.push({
      text: '「' + quoteContent + '」',
      isRed: isGodOrJesus,
    });

    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < rawText.length) {
    segments.push({ text: rawText.slice(lastIdx), isRed: false });
  }

  return segments.length > 0 ? segments : [{ text: rawText, isRed: false }];
}

/**
 * Format subtitle into consistent bracketed format: 【　神創造天地】
 */
function formatSubtitle(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let cleaned = raw.replace(/[\u3000\s]+/g, ' ').trim();
  if (!cleaned) return undefined;
  if (!cleaned.startsWith('【')) {
    cleaned = '【' + cleaned;
  }
  if (!cleaned.endsWith('】')) {
    cleaned = cleaned + '】';
  }
  return cleaned;
}

/**
 * Fetch Chinese Union Version with Red Letters from bibletool.konline.org
 * (耶大雅聖經工具 - 國語和合本紅字版)
 * Tries local server proxy first, then direct URL.
 */
async function fetchFromBibleTool(bookId: string, chapter: number): Promise<Verse[] | null> {
  const bookNumber = BOOK_ID_TO_NUMBER[bookId];
  if (!bookNumber) return null;

  const fragment = `UCV:${bookNumber}:${chapter}`;
  const directUrl = `https://bibletool.konline.org/retrieve/${fragment}`;

  const endpoints = [
    `/api/bibletool/${fragment}`, // Local Express proxy (no CORS issues)
    `/api/bibletool?q=${encodeURIComponent(fragment)}`,
    directUrl,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) continue;

      const data = await res.json();
      if (!Array.isArray(data) || !data[0] || !Array.isArray(data[0].verses) || data[0].verses.length === 0) {
        continue;
      }

      const rawVerses = data[0].verses;
      const verses: Verse[] = rawVerses.map(
        (v: {
          language?: string;
          name?: string;
          book?: string;
          chapter?: string;
          verse?: string;
          subtitle?: string;
          content?: string;
        }) => {
          const rawContent = v.content || '';
          const plainText = rawContent.replace(/<[^>]+>/g, '').replace(/[\u3000\s]+/g, ' ').trim();
          let segments = parseSegmentsFromHtml(rawContent);

          // If no HTML tags were present, enrich via contextual quotation rule
          if (segments.length <= 1 && !segments[0]?.isRed) {
            segments = enrichSegmentsWithRedLetters(plainText, bookId, chapter);
          }

          const verseNum = parseInt(v.verse || '1', 10);
          const rawSubtitle = v.subtitle ? formatSubtitle(v.subtitle) : undefined;
          const curatedSubtitle = getCuratedSubtitle(bookId, chapter, verseNum);

          return {
            chapter: parseInt(v.chapter || String(chapter), 10),
            verse: verseNum,
            text: plainText,
            rawContent,
            segments,
            subtitle: rawSubtitle || curatedSubtitle,
          };
        }
      );

      if (verses.length > 0) {
        return verses;
      }
    } catch {
      // Try next endpoint
    }
  }

  return null;
}

// Fetch from HelloAO Bible API
async function fetchFromHelloAO(
  transCode: string,
  bookId: string,
  chapter: number
): Promise<Verse[] | null> {
  try {
    const url = `https://bible.helloao.org/api/${transCode}/${bookId}/${chapter}.json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.chapter || !Array.isArray(data.chapter.content)) return null;

    const verses: Verse[] = [];
    for (const item of data.chapter.content) {
      if (item.type === 'verse' && typeof item.number === 'number') {
        const rawText = extractText(item.content).replace(/\s+/g, ' ').trim();
        if (rawText) {
          const segments =
            transCode === 'cmn_cuv'
              ? enrichSegmentsWithRedLetters(rawText, bookId, chapter)
              : [{ text: rawText, isRed: false }];

          const verseNum = item.number;
          const curatedSubtitle = getCuratedSubtitle(bookId, chapter, verseNum);

          verses.push({
            chapter,
            verse: verseNum,
            text: rawText,
            segments,
            subtitle: curatedSubtitle,
          });
        }
      }
    }
    return verses.length > 0 ? verses : null;
  } catch (err) {
    console.warn(`[BibleService] HelloAO fetch error for ${transCode} ${bookId} ${chapter}:`, err);
    return null;
  }
}

// Fetch from FHL Bible API (for CUV fallback)
async function fetchFromFHL(bookId: string, chapter: number): Promise<Verse[] | null> {
  try {
    const fhlName = FHL_BOOK_NAMES[bookId];
    if (!fhlName) return null;

    const url = `https://bible.fhl.net/json/qb.php?chineses=${encodeURIComponent(
      fhlName
    )}&chap=${chapter}&version=unv`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();

    if (json.status === 'success' && Array.isArray(json.record)) {
      const verses: Verse[] = json.record.map((r: { chap: number; sec: number; bible_text: string }) => {
        const plainText = r.bible_text ? r.bible_text.replace(/[\u3000\s]+/g, ' ').trim() : '';
        const verseNum = r.sec;
        const segments = enrichSegmentsWithRedLetters(plainText, bookId, chapter);
        const curatedSubtitle = getCuratedSubtitle(bookId, chapter, verseNum);

        return {
          chapter: r.chap || chapter,
          verse: verseNum,
          text: plainText,
          segments,
          subtitle: curatedSubtitle,
        };
      });
      return verses.length > 0 ? verses : null;
    }
    return null;
  } catch (err) {
    console.warn(`[BibleService] FHL fetch error for ${bookId} ${chapter}:`, err);
    return null;
  }
}

/**
 * Main API function to fetch genuine Bible verses for any book, chapter, and translation version.
 * For CUV (國語和合本), it fetches directly from bibletool.konline.org to provide authentic
 * red-letter tagging for God and Jesus' words with instant local caching.
 */
export async function fetchChapterVerses(
  bookId: string,
  bookName: string,
  chapter: number,
  version: BibleVersion
): Promise<Verse[]> {
  const cacheKey = `${version}_${bookId}_${chapter}`;

  // 1. Check in-memory cache
  if (verseCache.has(cacheKey)) {
    return verseCache.get(cacheKey)!;
  }

  // 2. Check localStorage cache with version prefix
  try {
    const stored = localStorage.getItem(`${CACHE_VERSION}${cacheKey}`);
    if (stored) {
      const parsed: Verse[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        verseCache.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch {
    // Ignore localStorage errors
  }

  let verses: Verse[] | null = null;

  // 3. For CUV (國語和合本), primary source is bibletool.konline.org with red-letter markup
  if (version === 'CUV') {
    verses = await fetchFromBibleTool(bookId, chapter);
  }

  // 4. Primary HelloAO API for KJV/LSG, or fallback for CUV
  if (!verses) {
    const transCode = HELLOAO_TRANSLATIONS[version] || 'cmn_cuv';
    verses = await fetchFromHelloAO(transCode, bookId, chapter);
  }

  // 5. Fallback for CUV to FHL if both failed
  if (!verses && version === 'CUV') {
    verses = await fetchFromFHL(bookId, chapter);
  }

  // 6. If fetched successfully, cache and return
  if (verses && verses.length > 0) {
    verseCache.set(cacheKey, verses);
    try {
      localStorage.setItem(`${CACHE_VERSION}${cacheKey}`, JSON.stringify(verses));
    } catch {
      // Storage quota reached, ignore
    }
    return verses;
  }

  // 7. Last resort fallback if network is completely offline
  return getOfflineFallbackVerses(bookName, chapter, version);
}

function getOfflineFallbackVerses(
  bookName: string,
  chapter: number,
  version: BibleVersion
): Verse[] {
  const fallbackVerses: Verse[] = [];
  const count = 10;
  for (let v = 1; v <= count; v++) {
    let text = '';
    if (version === 'CUV') {
      text = `${bookName} 第 ${chapter} 章第 ${v} 節：主說：「凡仰望耶和華的人，你們都要壯膽，堅固你們的心。」`;
    } else if (version === 'KJV') {
      text = `${bookName} Chapter ${chapter}, verse ${v}: The LORD is my strength and my shield; my heart trusted in him, and I am helped.`;
    } else {
      text = `${bookName} Chapitre ${chapter}, verset ${v}: L'Éternel est ma force et mon bouclier; En lui mon cœur se confie.`;
    }
    fallbackVerses.push({ chapter, verse: v, text });
  }
  return fallbackVerses;
}

/**
 * Returns the FHL full-chapter authentic MP3 and OGG audio stream URLs.
 * Source: 和合本有聲聖經網站 (https://bible.fhl.net/new/audio_hb.php)
 * Media server: https://media.fhl.net/unv1/{bookNumber}/{bookNumber}_{chapterPad3}.mp3
 */
export function getFhlChapterAudioUrls(bookNumber: number, chapter: number): {
  mp3: string;
  ogg: string;
  pageUrl: string;
} {
  const paddedChapter = String(chapter).padStart(3, '0');
  return {
    mp3: `https://media.fhl.net/unv1/${bookNumber}/${bookNumber}_${paddedChapter}.mp3`,
    ogg: `https://media.fhl.net/unv1/${bookNumber}/${bookNumber}_${paddedChapter}.ogg`,
    pageUrl: `https://bible.fhl.net/new/listenhb.php?version=0&bid=${bookNumber}&chap=${chapter}`,
  };
}
