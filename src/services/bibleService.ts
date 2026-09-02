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
const CACHE_VERSION = 'bible_v11_';

// Auto-clean old legacy un-colored caches on module load
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (
        key &&
        !key.startsWith(CACHE_VERSION) &&
        (key.startsWith('bible_') ||
          key.startsWith('CUV_') ||
          key.startsWith('KJV_') ||
          key.startsWith('LSG_') ||
          key.startsWith('cmn_'))
      ) {
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
  const isOT = ![
    'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH',
    'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS',
    '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
  ].includes(bookId);

  // Ten Commandments (Exodus 20:2-17, Deuteronomy 5:6-21)
  if (verseNum !== undefined) {
    if (bookId === 'EXO' && (chapter === 20 || chapter === undefined) && verseNum >= 2 && verseNum <= 17) return true;
    if (bookId === 'DEU' && (chapter === 5 || chapter === undefined) && verseNum >= 6 && verseNum <= 21) return true;
  }

  // Get the clause since last period "。" (or full string)
  const lastSentence = clean.split(/[。]/).pop() || clean;

  // 1. Human prayer or dialogue TO God (e.g. 摩西對耶和華說, 求告耶和華說, 向神呼求說)
  if (/(?:對|向|與|求)(?:耶和華|神|主|全能者)[^，；]*?(?:說|呼求|哀求|祈求|問|言)/.test(lastSentence)) {
    return false;
  }

  // 2. Pattern: [Subject] (對|向|與) [Listener] (說|吩咐|曉諭|呼叫|呼喚|宣告|回答|問)
  const matchDui = lastSentence.match(/([^，；]*?)(?:對|向|與)([^，；]+?)(?:說|吩咐|曉諭|呼叫|呼喚|宣告|回答|問)[：:]?$/);
  if (matchDui) {
    const rawSubj = matchDui[1].trim();
    const rawObj = matchDui[2].trim();

    const isGodInSentence = /(?:神|耶和華|主|基督|耶穌|全能者)/.test(lastSentence);
    const isGodSubj = /神|耶和華|主|基督|耶穌|全能者/.test(rawSubj) || (rawSubj === '' && isGodInSentence);
    const isGodObj = /神|耶和華|主|基督|耶穌|全能者/.test(rawObj);

    if (isGodSubj && !isGodObj) return true;
    if (isGodObj && !isGodSubj) return false;

    // Continuation phrases (又對女人說, 又對亞當說, 便對他說)
    if (rawSubj === '' || /^(?:又|便|就|神又|耶和華又)/.test(rawSubj) || /^(?:又對|便對|就對)/.test(lastSentence)) {
      if (isGodInSentence || previousSpeakerWasGod || isOT) return true;
    }

    if (/蛇|撒但|魔鬼|亞當|女人|那人|婦人|法老|巴蘭|摩西|亞倫|約書亞|彼得|約翰|雅各|多馬|猶大|門徒|眾人|百姓|法利賽人|文士|祭司長|官長|巡撫|彼拉多|希律|百夫長|船上的人|水手|他|他們|她|她們/.test(rawSubj)) {
      return false;
    }
  }

  // 3. Pattern: [Subject] (說|吩咐|曉諭|呼叫|呼喚|宣告|回答說|問說|喊著說)
  const matchSay = lastSentence.match(/([^，；]*?)(?:說|吩咐|曉諭|呼叫|呼喚|宣告|回答說|問說|喊著說)[：:]?$/);
  if (matchSay) {
    const subj = matchSay[1].trim();
    const isGodInSentence = /(?:神|耶和華|主|基督|耶穌|全能者)/.test(lastSentence);
    if (/神|耶和華|主|基督|耶穌|全能者/.test(subj) || (subj === '' && isGodInSentence)) {
      return true;
    }
    if (/^(?:又|便|就)$/.test(subj) || subj === '' || /^(?:又說|便說|就說)/.test(lastSentence)) {
      if (isGodInSentence || previousSpeakerWasGod || isOT) return true;
    }
    if (/蛇|撒但|魔鬼|亞當|女人|那人|婦人|法老|巴蘭|摩西|亞倫|約書亞|彼得|約翰|雅各|多馬|猶大|門徒|眾人|百姓|法利賽人|文士|祭司長|官長|巡撫|彼拉多|希律|百夫長|船上的人|水手|他|他們|她|她們/.test(subj)) {
      return false;
    }
  }

  // 4. OT first-person divine declarations
  if (isOT && /^[「『]?(?:我是耶和華|我是全能|我是自有永有|我耶和華|我必|我若|我已|我要|我的約|我所吩咐|耶和華如此說|萬軍之耶和華說|你們要歸我|因為我耶和華|我指著我的永生起誓)/.test(quoteContent)) {
    return true;
  }

  // 5. Continuation triggers
  if ((clean.includes('又對') || clean.includes('又說') || clean.includes('說：') || clean === '' || clean.endsWith('：') || clean.endsWith(':')) && previousSpeakerWasGod) {
    return true;
  }

  // 6. Gospels default to Jesus unless human speaker indicated
  if (isGospel && !/(?:彼得|約翰|雅各|多馬|猶大|門徒|眾人|百姓|法利賽人|文士|祭司長|官長|巡撫|彼拉多|希律|百夫長|婦人|魔鬼|撒但)/.test(clean)) {
    return true;
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

    if (!inQuote) {
      const lastSent = text.split(/[。]/).pop() || text;
      if (/(?:神|耶和華|主|基督|耶穌)[^。]*?(?:說|吩咐|曉諭)[：:]?$/.test(lastSent)) {
        isGodSpeakingContinuation = true;
      } else if (/(?:百姓|官長|約書亞|摩西|亞倫|眾人|門徒|彼得)[^。]*?(?:說|吩咐)[：:]?$/.test(lastSent)) {
        isGodSpeakingContinuation = false;
      }
    }

    const curatedSub = getCuratedSubtitle(bookId, chapter, v.verse);
    return {
      ...v,
      subtitle: v.subtitle || curatedSub,
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
          const verseNum = parseInt(v.verse || '1', 10);
          const rawContent = v.content || '';
          const plainText = rawContent.replace(/<[^>]+>/g, '').replace(/[\u3000\s]+/g, ' ').trim();
          let segments = parseSegmentsFromHtml(rawContent);

          // If no HTML tags were present, enrich via contextual quotation rule
          if (segments.length <= 1 && !segments[0]?.isRed) {
            segments = enrichSegmentsWithRedLetters(plainText, bookId, chapter, verseNum);
          }

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
          const verseNum = item.number;
          const segments =
            transCode === 'cmn_cuv'
              ? enrichSegmentsWithRedLetters(rawText, bookId, chapter, verseNum)
              : [{ text: rawText, isRed: false }];

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
        const segments = enrichSegmentsWithRedLetters(plainText, bookId, chapter, verseNum);
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
