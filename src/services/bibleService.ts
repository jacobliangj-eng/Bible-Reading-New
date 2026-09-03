import { BibleVersion, Verse, VerseSegment } from '../types';
import { getCuratedSubtitle } from '../data/cuvSubtitles';

// Translation mapping for HelloAO API
const HELLOAO_TRANSLATIONS: Record<BibleVersion, string> = {
  CUV: 'cmn_cuv',
  KJV: 'eng_kjv',
  LSG: 'fra_lsg',
};

// Book 1-66 numbers mapping for bibletool.konline.org & FHL
export const BOOK_ID_TO_NUMBER: Record<string, number> = {
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

/**
 * Returns the exact browse URL on bibletool.konline.org for any book and chapter.
 * E.g. GEN:1 -> https://bibletool.konline.org/browse/#UCV:1:1
 * REV:1 -> https://bibletool.konline.org/browse/#UCV:66:1
 */
export function getBibleToolBrowseUrl(bookId: string, chapter: number): string {
  const bookNumber = BOOK_ID_TO_NUMBER[bookId] || 1;
  return `https://bibletool.konline.org/browse/#UCV:${bookNumber}:${chapter}`;
}

// In-flight request deduplication map to prevent redundant concurrent fetches
const inFlightRequests = new Map<string, Promise<Verse[]>>();

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
const CACHE_VERSION = 'bible_v16_';

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

/**
 * Normalizes Chinese Union Version scripture terms:
 * Converts "上帝" to "　神" (with an ideographic space U+3000 before 神),
 * and standardizes any half-width spaces before 神 (e.g. "  神" or " 神") to "　神".
 * Strictly adheres to the traditional CUV "神版" typography and bibletool.konline.org markup.
 */
export function normalizeGodTerms(text: string): string {
  if (!text) return text;
  return text
    .replace(/上帝/g, '　神')
    .replace(/[ \t]{1,2}神/g, '　神');
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
  const normalizedContent = normalizeGodTerms(content);
  if (!normalizedContent.includes('browse-verse-red') && !normalizedContent.includes('color: red') && !normalizedContent.includes('color:red') && !normalizedContent.includes('<span')) {
    return [{ text: normalizeGodTerms(normalizedContent.replace(/<[^>]+>/g, '').trim()), isRed: false }];
  }

  // Handle potentially unclosed span tags
  let normalized = normalizedContent;
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
      const cleanText = normalizeGodTerms(redContent.replace(/<[^>]+>/g, ''));
      if (cleanText) {
        segments.push({ text: cleanText, isRed: true });
      }
    } else if (match[3] !== undefined) {
      const cleanText = normalizeGodTerms(match[3]);
      if (cleanText) {
        segments.push({ text: cleanText, isRed: false });
      }
    }
  }

  return segments.length > 0
    ? segments
    : [{ text: normalizeGodTerms(normalizedContent.replace(/<[^>]+>/g, '').trim()), isRed: false }];
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

  // Books with strictly human narrative dialogues and no direct divine quotes
  if (['RUT', 'EZR', 'NEH', 'EST', 'ECC', 'SNG'].includes(bookId)) {
    return false;
  }

  // Ten Commandments (Exodus 20:2-17, Deuteronomy 5:6-21)
  if (verseNum !== undefined) {
    if (bookId === 'EXO' && (chapter === 20 || chapter === undefined) && verseNum >= 2 && verseNum <= 17) return true;
    if (bookId === 'DEU' && (chapter === 5 || chapter === undefined) && verseNum >= 6 && verseNum <= 21) return true;
  }

  // Get the clause since last period "。" (or full string)
  const lastSentence = clean.split(/[。]/).pop() || clean;

  // STRICT RULE: Demons, unclean spirits, Satan, and the devil MUST NEVER be red
  if (
    /(?:污鬼|鬼|魔鬼|撒但|邪靈|被鬼附的|試探人的|那試探人的)/.test(clean) ||
    /(?:污鬼|鬼|魔鬼|撒但|邪靈|被鬼附的|試探人的|那試探人的)/.test(lastSentence)
  ) {
    return false;
  }

  // 1. Human prayer or dialogue TO God/Jesus (e.g. 摩西對耶和華說, 求告耶和華說, 向神呼求說, 門徒對耶穌說)
  if (/(?:對|向|與|求)(?:耶和華|神|主|基督|耶穌|全能者)[^，；]*?(?:說|呼求|哀求|祈求|問|言)/.test(lastSentence)) {
    return false;
  }

  // 2. Pattern: [Subject] (對|向|與) [Listener] (說|吩咐|曉諭|呼叫|呼喚|宣告|回答|問|責備|斥責)
  const matchDui = lastSentence.match(/([^，；]*?)(?:對|向|與)([^，；]+?)(?:說|吩咐|曉諭|呼叫|呼喚|宣告|回答|問|責備|斥責)[：:]?$/);
  if (matchDui) {
    const rawSubj = matchDui[1].trim();
    const rawObj = matchDui[2].trim();

    const isGodInSentence = /(?:神|耶和華|基督|耶穌|全能者)/.test(lastSentence);
    const isGodSubj = /神|耶和華|基督|耶穌|全能者/.test(rawSubj) || (rawSubj === '' && isGodInSentence);
    const isGodObj = /神|耶和華|基督|耶穌|全能者/.test(rawObj);

    if (isGodSubj && !isGodObj) return true;
    if (isGodObj && !isGodSubj) return false;

    // Continuation phrases (對他說, 又對女人說, 又對門徒說, 便對他說)
    if (
      rawSubj === '' ||
      /^(?:又|便|就|神又|耶和華又|耶穌又)/.test(rawSubj) ||
      /^(?:對|又對|便對|就對|向|又向)/.test(lastSentence)
    ) {
      if (previousSpeakerWasGod) return true;
    }

    if (/蛇|撒但|魔鬼|污鬼|鬼|邪靈|亞當|女人|那人|婦人|法老|巴蘭|摩西|亞倫|約書亞|彼得|約翰|雅各|多馬|猶大|門徒|眾人|百姓|法利賽人|文士|祭司長|官長|巡撫|彼拉多|希律|百夫長|船上的人|水手|他|他們|她|她們/.test(rawSubj)) {
      return false;
    }
  }

  // 3. Pattern: [Subject] (說|吩咐|曉諭|呼叫|呼喚|宣告|回答說|問說|喊著說|責備說|斥責說)
  const matchSay = lastSentence.match(/([^，；]*?)(?:說|吩咐|曉諭|呼叫|呼喚|宣告|回答說|問說|喊著說|責備說|斥責說)[：:]?$/);
  if (matchSay) {
    const subj = matchSay[1].trim();
    const isGodInSentence = /(?:神|耶和華|基督|耶穌|全能者)/.test(lastSentence);
    if (/神|耶和華|基督|耶穌|全能者/.test(subj) || (subj === '' && isGodInSentence)) {
      return true;
    }
    if (/^(?:又|便|就)$/.test(subj) || subj === '' || /^(?:又說|便說|就說)/.test(lastSentence)) {
      if (previousSpeakerWasGod) return true;
    }
    if (/蛇|撒但|魔鬼|污鬼|鬼|邪靈|亞當|女人|那人|婦人|法老|巴蘭|摩西|亞倫|約書亞|彼得|約翰|雅各|多馬|猶大|門徒|眾人|百姓|法利賽人|文士|祭司長|官長|巡撫|彼拉多|希律|百夫長|船上的人|水手|他|他們|她|她們/.test(subj)) {
      return false;
    }
  }

  // 4. OT first-person divine declarations
  if (isOT && /^[「『]?(?:我是耶和華|我是全能|我是自有永有|我耶和華|我必|我若|我已|我要|我的約|我所吩咐|耶和華如此說|萬軍之耶和華說|你們要歸我|因為我耶和華|我指著我的永生起誓)/.test(quoteContent)) {
    return true;
  }

  // 5. Explicit Jesus signature statements in the Gospels
  if (isGospel && /^[「『]?(?:我實實在在地告訴你們|我實在告訴你們|天國近了，你們應當悔改)/.test(quoteContent)) {
    return true;
  }

  // 6. Direct continuations ONLY when previous speaker was genuinely God/Jesus
  if (previousSpeakerWasGod && /^(?:又說|便說|就說|又對|便對|就對)[：:]?$/.test(lastSentence)) {
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
  let hasUnclosedGodQuote = false;
  let lastSpeakerWasGod = false;

  return verses.map((v) => {
    // If verse already has valid red segments from HTML parse with isRed: true, retain them but update continuation state
    if (v.segments && v.segments.length > 0 && v.segments.some((s) => s.isRed)) {
      const lastSeg = v.segments[v.segments.length - 1];
      if (lastSeg.isRed && (lastSeg.text.includes('「') || lastSeg.text.includes('『')) && !lastSeg.text.includes('」') && !lastSeg.text.includes('』')) {
        hasUnclosedGodQuote = true;
        lastSpeakerWasGod = true;
      } else if (lastSeg.text.includes('」') || lastSeg.text.includes('』')) {
        hasUnclosedGodQuote = false;
        lastSpeakerWasGod = true;
      }
      return v;
    }

    // Ten Commandments (Exodus 20:2-17, Deuteronomy 5:6-21)
    if (
      (bookId === 'EXO' && chapter === 20 && v.verse >= 2 && v.verse <= 17) ||
      (bookId === 'DEU' && chapter === 5 && v.verse >= 6 && v.verse <= 21)
    ) {
      hasUnclosedGodQuote = v.verse < 17;
      lastSpeakerWasGod = true;
      return {
        ...v,
        segments: [{ text: v.text, isRed: true }],
      };
    }

    // Reset continuation after Ten Commandments or clear narrative transitions
    if (bookId === 'EXO' && chapter === 20 && v.verse === 18) {
      hasUnclosedGodQuote = false;
      lastSpeakerWasGod = false;
    }
    if (bookId === 'DEU' && chapter === 5 && v.verse === 22) {
      hasUnclosedGodQuote = false;
      lastSpeakerWasGod = false;
    }

    const text = v.text || '';
    const segments: VerseSegment[] = [];

    let inQuote = hasUnclosedGodQuote;
    let quoteSpeakerIsGod = hasUnclosedGodQuote;
    let buffer = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '「' || char === '『') {
        if (buffer) {
          segments.push({ text: buffer, isRed: inQuote && quoteSpeakerIsGod });
        }

        const preceding = buffer || (segments.length > 0 ? segments[segments.length - 1].text : '');
        const isGod = isGodOrJesusSpeaking(preceding, lastSpeakerWasGod, text.slice(i), bookId, chapter, v.verse);

        inQuote = true;
        quoteSpeakerIsGod = isGod;
        lastSpeakerWasGod = isGod;
        buffer = char;
      } else if (char === '」' || char === '』') {
        buffer += char;
        segments.push({ text: buffer, isRed: inQuote && quoteSpeakerIsGod });
        buffer = '';
        inQuote = false;
        quoteSpeakerIsGod = false;
        hasUnclosedGodQuote = false;
      } else {
        buffer += char;
      }
    }

    if (buffer) {
      segments.push({ text: buffer, isRed: inQuote && quoteSpeakerIsGod });
      if (inQuote && quoteSpeakerIsGod) {
        hasUnclosedGodQuote = true;
        lastSpeakerWasGod = true;
      }
    }

    if (!inQuote) {
      const lastSent = text.split(/[。]/).pop() || text;
      if (/(?:神|耶和華|基督|耶穌)[^。]*?(?:說|吩咐|曉諭|責備|斥責|回答|囑咐|交代|打發)[^。]*?[：:，,]?$/.test(lastSent)) {
        if (!/(?:對|向|求)(?:神|耶和華|主|基督|耶穌)/.test(lastSent)) {
          lastSpeakerWasGod = true;
        }
      } else if (
        /(?:鬼|污鬼|魔鬼|撒但|邪靈|百姓|官長|約書亞|摩西|亞倫|眾人|門徒|彼得|人|那人|婦人)[^。]*?(?:說|吩咐|喊叫|問|求|答)[：:，,]?$/.test(
          lastSent
        )
      ) {
        lastSpeakerWasGod = false;
      }
    }

    const curatedSub = getCuratedSubtitle(bookId, chapter, v.verse);
    const normalizedText = normalizeGodTerms(text);
    return {
      ...v,
      text: normalizedText,
      subtitle: v.subtitle ? normalizeGodTerms(v.subtitle) : curatedSub,
      segments: (segments.length > 0 ? segments : [{ text, isRed: false }]).map((s) => ({
        ...s,
        text: normalizeGodTerms(s.text),
      })),
    };
  });
}

/**
 * Format subtitle into consistent bracketed format: 【　神創造天地】
 */
function formatSubtitle(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let cleaned = normalizeGodTerms(raw).trim();
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
 * Tries local server proxy first, then direct URL, bypassing local disk caches.
 */
export async function fetchFromBibleTool(bookId: string, chapter: number): Promise<Verse[] | null> {
  const bookNumber = BOOK_ID_TO_NUMBER[bookId];
  if (!bookNumber) return null;

  const fragment = `UCV:${bookNumber}:${chapter}`;
  const timestamp = Date.now();
  const directUrl = `https://bibletool.konline.org/retrieve/${fragment}`;

  const endpoints = [
    `/api/bibletool/${fragment}?_t=${timestamp}`, // Local Express proxy with no-cache (bypasses CORS)
    `/api/bibletool?q=${encodeURIComponent(fragment)}&_t=${timestamp}`,
    `/api/bibletool/UCV/${bookNumber}/${chapter}?_t=${timestamp}`,
    directUrl,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
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
          const rawContent = normalizeGodTerms(v.content || '');
          const plainText = normalizeGodTerms(rawContent.replace(/<[^>]+>/g, '').trim());
          const segments = parseSegmentsFromHtml(rawContent).map((s) => ({
            ...s,
            text: normalizeGodTerms(s.text),
          }));

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
        const rawText = normalizeGodTerms(extractText(item.content).replace(/\s+/g, ' ').trim());
        if (rawText) {
          const verseNum = item.number;
          const segments: VerseSegment[] = [{ text: rawText, isRed: false }];

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
        const plainText = normalizeGodTerms(r.bible_text ? r.bible_text.replace(/[\u3000\s]+/g, ' ').trim() : '');
        const verseNum = r.sec;
        const segments = enrichSegmentsWithRedLetters(plainText, bookId, chapter, verseNum).map((s) => ({
          ...s,
          text: normalizeGodTerms(s.text),
        }));
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
 * For CUV (國語和合本), it ALWAYS immediately downloads live from bibletool.konline.org
 * to provide authentic red-letter tagging for God and Jesus' words.
 */
export async function fetchChapterVerses(
  bookId: string,
  bookName: string,
  chapter: number,
  version: BibleVersion
): Promise<Verse[]> {
  const cacheKey = `${version}_${bookId}_${chapter}`;

  // If a fetch for this exact chapter is already in progress, reuse it
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    let verses: Verse[] | null = null;
    let isFromBibleTool = false;

    // 1. For CUV (國語和合本), ALWAYS IMMEDIATELY download from 耶大雅聖經工具 (https://bibletool.konline.org/browse/#UCV)
    if (version === 'CUV') {
      try {
        verses = await fetchFromBibleTool(bookId, chapter);
        if (verses && verses.length > 0) {
          isFromBibleTool = true;
        }
      } catch (btErr) {
        console.warn(`[BibleService] Immediate download from BibleTool encountered error:`, btErr);
      }
    } else {
      // For non-CUV (KJV/LSG), check memory and local cache
      if (verseCache.has(cacheKey)) {
        return verseCache.get(cacheKey)!;
      }
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
    }

    // 2. Primary HelloAO API for KJV/LSG, or offline fallback for CUV if network unreachable
    if (!verses) {
      const transCode = HELLOAO_TRANSLATIONS[version] || 'cmn_cuv';
      verses = await fetchFromHelloAO(transCode, bookId, chapter);
    }

    // 3. Fallback for CUV to FHL if both failed
    if (!verses && version === 'CUV') {
      verses = await fetchFromFHL(bookId, chapter);
    }

    // 4. Offline backup: If live downloads failed (e.g. offline device), check local backup cache
    if (!verses) {
      if (verseCache.has(cacheKey)) {
        return verseCache.get(cacheKey)!;
      }
      try {
        const stored = localStorage.getItem(`${CACHE_VERSION}${cacheKey}`);
        if (stored) {
          const parsed: Verse[] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const normalized =
              version === 'CUV'
                ? parsed.map((v) => ({
                    ...v,
                    text: normalizeGodTerms(v.text),
                    rawContent: v.rawContent ? normalizeGodTerms(v.rawContent) : undefined,
                    subtitle: v.subtitle ? normalizeGodTerms(v.subtitle) : undefined,
                    segments: (v.segments || []).map((s) => ({
                      ...s,
                      text: normalizeGodTerms(s.text),
                    })),
                  }))
                : parsed;
            verseCache.set(cacheKey, normalized);
            return normalized;
          }
        }
      } catch {
        // Ignore localStorage errors
      }
    }

    // 5. If fetched successfully, cache in memory and return
    if (verses && verses.length > 0) {
      if (version === 'CUV') {
        verses = verses.map((v) => ({
          ...v,
          text: normalizeGodTerms(v.text),
          rawContent: v.rawContent ? normalizeGodTerms(v.rawContent) : undefined,
          subtitle: v.subtitle ? normalizeGodTerms(v.subtitle) : undefined,
          segments: (v.segments || []).map((s) => ({
            ...s,
            text: normalizeGodTerms(s.text),
          })),
        }));
      }

      if (version === 'CUV' && !isFromBibleTool) {
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

    // 6. Last resort fallback if network is completely offline
    return getOfflineFallbackVerses(bookName, chapter, version);
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
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
