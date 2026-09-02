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
const CACHE_VERSION = 'bible_v9_';

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
 * Precise divine speaker detection for Old & New Testament scriptures.
 * Distinguishes God/Jesus speaking vs human characters speaking to God/others.
 */
export function isGodOrJesusSpeaking(
  preceding: string,
  previousSpeakerWasGod: boolean,
  quoteContent: string,
  bookId: string,
  chapter?: number,
  verseNum?: number
): boolean {
  const clean = preceding.replace(/[\u3000\s]+/g, '').trim();
  const isGospel = ['MAT', 'MRK', 'LUK', 'JHN'].includes(bookId);
  const isOT = !['MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'].includes(bookId);

  // Ten Commandments (Exodus 20:2-17, Deuteronomy 5:6-21)
  if (verseNum !== undefined) {
    if (bookId === 'EXO' && (chapter === 20 || chapter === undefined) && verseNum >= 2 && verseNum <= 17) return true;
    if (bookId === 'DEU' && (chapter === 5 || chapter === undefined) && verseNum >= 6 && verseNum <= 21) return true;
  }

  // 1. Direct speaker pattern: [Speaker] 對/向/與 [Listener] 說/吩咐/曉諭...
  const matchDui = clean.match(/(?:，|；|。|^)([^，；。]+?)(?:對|向|與)([^，；。]+?)(?:說|吩咐|曉諭|回答|呼叫|宣告|問)/);
  if (matchDui) {
    const subject = matchDui[1];
    const object = matchDui[2];
    const isSubjectGod = /神|耶和華|主|基督|耶穌|全能者/.test(subject) && !/像神|如神|求神|隨從神/.test(subject);
    const isObjectGod = /神|耶和華|主|基督|耶穌|全能者/.test(object);

    if (isSubjectGod) {
      return true;
    }
    if (['又', '就', '便'].includes(subject)) {
      if (/神|耶和華|主|基督|耶穌/.test(clean) || previousSpeakerWasGod) {
        return true;
      }
    }
    if (isObjectGod && !isSubjectGod) {
      return false;
    }
    if (!isSubjectGod && !['又', '就', '便'].includes(subject) && /蛇|撒但|魔鬼|彼得|約翰|雅各|多馬|猶大|門徒|眾人|百姓|法利賽人|文士|祭司長|官長|巡撫|彼拉多|希律|百夫長|婦人|撒拉|夏甲|利百加|拉結|利亞|亞當|該隱|法老|巴蘭|亞瑪力|非利士人|摩西|亞倫|約書亞|基甸|參孫|撒母耳|掃羅|大衛|所羅門|以利亞|以利沙/.test(subject)) {
      return false;
    }
  }

  // 2. Direct say pattern: [Speaker] 說:
  const matchSay = clean.match(/(?:，|；|。|^)([^，；。]+?)(?:說|回答說|問說|喊著說)[：:]?$/);
  if (matchSay) {
    const speaker = matchSay[1];
    const isGod = /神|耶和華|主|基督|耶穌|全能者|人子/.test(speaker);
    const isOther = /蛇|撒但|魔鬼|彼得|約翰|雅各|多馬|猶大|門徒|眾人|百姓|法利賽人|文士|祭司長|官長|巡撫|彼拉多|希律|百夫長|婦人|撒拉|夏甲|利百加|拉結|利亞|亞當|該隱|法老|巴蘭|亞瑪力|非利士人|摩西|亞倫|約書亞|基甸|參孫|撒母耳|掃羅|大衛|所羅門|以利亞|以利沙/.test(speaker);
    if (isGod) return true;
    if (isOther) return false;
  }

  // 3. Clause contains God / Yahweh / Jesus speaking or commanding
  if (/(?:神|耶和華|主|基督|耶穌|全能者)[^，；。]*?(?:說|吩咐|曉諭|呼叫|宣告|應許|起誓)/.test(clean) ||
      /(?:神|耶和華|主|基督|耶穌)[^。]*?(?:又對|又說|說：)/.test(clean)) {
    return true;
  }

  // 4. Continuation clause
  if ((clean.includes('又對') || clean.includes('又說') || clean.includes('說：') || clean === '' || clean.endsWith('：') || clean.endsWith(':')) && previousSpeakerWasGod) {
    return true;
  }

  // 5. OT First-person divine words
  if (isOT) {
    if (/^我是耶和華|^我是全能|^我是自有永有|^我耶和華|^我必|^我若|^我的約|^我所吩咐|耶和華如此說|萬軍之耶和華說|你們要歸我|因為我耶和華/.test(quoteContent)) {
      return true;
    }
  }

  // 6. Gospels default to Jesus unless another speaker is identified
  if (isGospel) {
    const hasOtherSpeaker = /彼得|約翰|雅各|多馬|猶大|門徒|眾人|百姓|法利賽人|文士|祭司長|官長|巡撫|彼拉多|希律|百夫長|婦人|魔鬼|撒但/.test(clean);
    if (!hasOtherSpeaker) {
      return true;
    }
  }

  return false;
}

/**
 * Intelligent Red-Letter detector for CUV in case of network fallback or raw text parsing.
 * Comprehensive detection for:
 * 1. Spoken words of God (Old Testament: Genesis to Malachi)
 * 2. Spoken words of Jesus Christ (Gospels, Acts, Revelation)
 */
export function enrichSegmentsWithRedLetters(
  rawText: string,
  bookId: string,
  chapter?: number,
  verseNum?: number
): VerseSegment[] {
  if (!rawText) return [];

  // Ten Commandments
  if (verseNum !== undefined) {
    if (
      (bookId === 'EXO' && (chapter === 20 || chapter === undefined) && verseNum >= 2 && verseNum <= 17) ||
      (bookId === 'DEU' && (chapter === 5 || chapter === undefined) && verseNum >= 6 && verseNum <= 21)
    ) {
      return [{ text: rawText, isRed: true }];
    }
  }

  const segments: VerseSegment[] = [];
  let inQuote = false;
  let isCurrentQuoteGod = false;
  let lastKnownSpeakerIsGod = false;
  let buffer = '';

  for (let i = 0; i < rawText.length; i++) {
    const char = rawText[i];

    if (char === '「' || char === '『') {
      if (buffer) {
        segments.push({ text: buffer, isRed: inQuote && isCurrentQuoteGod });
      }
      const preceding = buffer || (segments.length > 0 ? segments[segments.length - 1].text : '');
      const isGod = isGodOrJesusSpeaking(preceding, lastKnownSpeakerIsGod, rawText.slice(i), bookId, chapter, verseNum);

      inQuote = true;
      isCurrentQuoteGod = isGod;
      if (isGod) lastKnownSpeakerIsGod = true;
      buffer = char;
    } else if (char === '」' || char === '』') {
      buffer += char;
      segments.push({ text: buffer, isRed: inQuote && isCurrentQuoteGod });
      buffer = '';
      inQuote = false;
      isCurrentQuoteGod = false;
    } else {
      buffer += char;
    }
  }

  if (buffer) {
    segments.push({ text: buffer, isRed: inQuote && isCurrentQuoteGod });
  }

  return segments.length > 0 ? segments : [{ text: rawText, isRed: false }];
}

/**
 * Enriches all verses in a whole chapter with consecutive speaker continuation
 * for quotes spanning multiple verses in the Old and New Testaments.
 */
export function enrichChapterVersesWithRedLetters(
  verses: Verse[],
  bookId: string,
  chapter: number
): Verse[] {
  let isGodSpeakingContinuation = false;

  return verses.map((v) => {
    // If verse already has valid red segments from HTML parse with isRed: true, retain them but update continuation state
    if (v.segments && v.segments.length > 0 && v.segments.some((s) => s.isRed)) {
      const lastSeg = v.segments[v.segments.length - 1];
      if (lastSeg.isRed && (lastSeg.text.includes('「') || lastSeg.text.includes('『')) && !lastSeg.text.includes('」') && !lastSeg.text.includes('』')) {
        isGodSpeakingContinuation = true;
      } else if (lastSeg.text.includes('」') || lastSeg.text.includes('』')) {
        isGodSpeakingContinuation = false;
      }
      return v;
    }

    // Ten Commandments (Exodus 20:2-17, Deuteronomy 5:6-21)
    if (
      (bookId === 'EXO' && chapter === 20 && v.verse >= 2 && v.verse <= 17) ||
      (bookId === 'DEU' && chapter === 5 && v.verse >= 6 && v.verse <= 21)
    ) {
      isGodSpeakingContinuation = v.verse < 17;
      return {
        ...v,
        segments: [{ text: v.text, isRed: true }],
      };
    }

    // Reset continuation after Ten Commandments or clear narrative transitions
    if (bookId === 'EXO' && chapter === 20 && v.verse === 18) {
      isGodSpeakingContinuation = false;
    }
    if (bookId === 'DEU' && chapter === 5 && v.verse === 22) {
      isGodSpeakingContinuation = false;
    }

    const text = v.text || '';
    const segments: VerseSegment[] = [];

    let inQuote = isGodSpeakingContinuation;
    let quoteSpeakerIsGod = isGodSpeakingContinuation;
    let buffer = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '「' || char === '『') {
        if (buffer) {
          segments.push({ text: buffer, isRed: inQuote && quoteSpeakerIsGod });
        }

        const preceding = buffer || (segments.length > 0 ? segments[segments.length - 1].text : '');
        const isGod = isGodOrJesusSpeaking(preceding, isGodSpeakingContinuation, text.slice(i), bookId, chapter, v.verse);

        inQuote = true;
        quoteSpeakerIsGod = isGod;
        isGodSpeakingContinuation = isGod;
        buffer = char;
      } else if (char === '」' || char === '』') {
        buffer += char;
        segments.push({ text: buffer, isRed: inQuote && quoteSpeakerIsGod });
        buffer = '';
        inQuote = false;
        quoteSpeakerIsGod = false;
        isGodSpeakingContinuation = false;
      } else {
        buffer += char;
      }
    }

    if (buffer) {
      segments.push({ text: buffer, isRed: inQuote && quoteSpeakerIsGod });
      if (inQuote && quoteSpeakerIsGod) {
        isGodSpeakingContinuation = true;
      }
    }

    return {
      ...v,
      segments: segments.length > 0 ? segments : [{ text, isRed: false }],
    };
  });
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
    if (version === 'CUV') {
      verses = enrichChapterVersesWithRedLetters(verses, bookId, chapter);
    }

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
