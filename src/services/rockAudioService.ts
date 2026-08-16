// Rock Audio Ministry (磐石有聲事工) - 王濤峰弟兄國語朗讀 MP3 Service

export interface RockAudioTrack {
  bookNumber: number;
  bookName: string;
  chapter: number;
  title: string;
  url: string;
  fallbackUrls: string[];
  downloadUrl: string;
}

/**
 * Official & Mirror sources for 磐石有聲聖經 (王濤峰弟兄國語朗讀)
 */
export const ROCK_AUDIO_INFO = {
  narrator: '王濤峰弟兄',
  ministry: '磐石有聲事工 (Rock Audio Ministry)',
  version: '中文新標點和合本 (CUV)',
  officialWebsite: '',
  panshiSite: '',
  wordprojectSite: 'https://www.wordproject.org/bibles/audio/02_chinese/',
  description: '由磐石有聲事工製作、王濤峰弟兄以標準國語親切朗讀的中文和合本整章有聲聖經，吐字清晰、情感真摯。',
};

/**
 * Helper to format book and chapter numbers with leading zeros if needed
 */
export function getRockAudioUrls(bookNumber: number, chapter: number, bookName: string): RockAudioTrack {
  const padBook = String(bookNumber).padStart(2, '0');
  const padChapter = String(chapter).padStart(3, '0');

  // Candidate online audio CDN streams
  const candidateUrls = [
    // GitHub / jsDelivr / CDN mirrors
    `https://cdn.jsdelivr.net/gh/resurgo-cn/bible-mp3-cn@master/cuv/${padBook}/${padChapter}.mp3`,
    `https://raw.githubusercontent.com/resurgo-cn/bible-mp3-cn/master/cuv/${padBook}/${padChapter}.mp3`,
    `https://audio.wordproject.com/bibles/app/audio/2/${bookNumber}/${chapter}.mp3`,
  ];

  return {
    bookNumber,
    bookName,
    chapter,
    title: `${bookName} 第 ${chapter} ${bookNumber === 19 ? '篇' : '章'} (王濤峰弟兄朗讀)`,
    url: candidateUrls[0],
    fallbackUrls: candidateUrls.slice(1),
    downloadUrl: `https://www.psaudiobible.org/`,
  };
}
