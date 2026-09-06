import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Repeat,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  X,
  Bookmark,
  Loader2,
} from 'lucide-react';
import { BibleBook, BibleVersion, ReadingMode, Verse } from '../types';
import { BIBLE_BOOKS, VERSIONS } from '../data/bibleBooks';
import { fixChineseTTSPronunciation } from '../data/dailyVerses';
import {
  fetchChapterVerses,
  getFhlChapterAudioUrls,
  normalizeGodTerms,
} from '../services/bibleService';
import { getCuratedSubtitle } from '../data/cuvSubtitles';
import { isBookmarked, saveBookmark, removeBookmark, getBookmarkId } from '../services/bookmarkService';
import { saveLastReadRecord } from '../services/lastReadService';

interface Tier3ScriptureReaderProps {
  selectedBook: BibleBook;
  selectedVersion: BibleVersion;
  initialChapter?: number;
  initialVerse?: number;
  initialReadingMode?: ReadingMode;
  initialStartVerse?: number;
  initialEndVerse?: number;
  initialVerseNumbers?: number[];
  onSelectBook?: (book: BibleBook, chapter?: number, autoPlay?: boolean) => void;
  onGoBackToTier2: () => void;
  onGoHome: () => void;
  onOpenSettings?: () => void;
  playbackSpeed?: number;
  setPlaybackSpeed?: (speed: number) => void;
  speechPitch?: number;
  fontSize?: 'normal' | 'large' | 'xlarge';
  setFontSize?: (size: 'normal' | 'large' | 'xlarge') => void;
  selectedVoiceName?: string;
  autoStartPlayback?: boolean;
  isFromBookmark?: boolean;
}

export const Tier3ScriptureReader: React.FC<Tier3ScriptureReaderProps> = ({
  selectedBook,
  selectedVersion,
  initialChapter,
  initialVerse,
  initialReadingMode,
  initialStartVerse,
  initialEndVerse,
  initialVerseNumbers,
  onSelectBook,
  onGoBackToTier2,
  onGoHome,
  onOpenSettings,
  playbackSpeed: propSpeed,
  setPlaybackSpeed: propSetSpeed,
  speechPitch = 1.0,
  fontSize: propFontSize,
  setFontSize: propSetFontSize,
  selectedVoiceName = '',
  autoStartPlayback = false,
  isFromBookmark = false,
}) => {
  const versionInfo = VERSIONS[selectedVersion];
  const bookName = selectedBook.name[selectedVersion];
  const isPsalm = selectedBook.id === 'PSA' || selectedBook.number === 19 || selectedBook.name.CUV === '詩篇';
  const chapterUnit = isPsalm ? '篇' : '章';

  // Mode Selection:
  // 1) 全卷重複朗讀 (BOOK)
  // 2) 重複朗讀幾章 (CHAPTERS)
  // 3) 重複朗讀某章內的某幾節 (VERSES)
  const [readingMode, setReadingMode] = useState<ReadingMode>(initialReadingMode ?? 'CHAPTERS');

  // Determine whether to use FHL Real Human MP3 Audio:
  // Active when in CUV (中文新標點和合本) and reading mode is chapter-based (not VERSES)
  const isFhlMp3Mode = selectedVersion === 'CUV' && readingMode !== 'VERSES';

  // Chapter & Verse selections
  const [startChapter, setStartChapter] = useState<number>(1);
  const [endChapter, setEndChapter] = useState<number>(selectedBook.chaptersCount);

  useEffect(() => {
    const initCh = initialChapter ?? 1;
    setStartChapter(1);
    setTargetChapter(initCh);
    setViewChapter(initCh);
    setChapterInputText(String(initCh));

    if (initialReadingMode === 'BOOK') {
      setEndChapter(selectedBook.chaptersCount);
      setReadingMode('BOOK');
    } else if (initialReadingMode === 'CHAPTERS') {
      setEndChapter(selectedBook.chaptersCount);
      setReadingMode('CHAPTERS');
    } else if (initialReadingMode === 'VERSES' || (initialStartVerse !== undefined && initialEndVerse !== undefined)) {
      setEndChapter(selectedBook.chaptersCount);
      setReadingMode('VERSES');
    } else {
      setEndChapter(selectedBook.chaptersCount);
      setReadingMode('CHAPTERS');
    }

    if (initialStartVerse !== undefined) {
      setStartVerseNum(initialStartVerse);
    } else {
      setStartVerseNum(1);
    }
    if (initialEndVerse !== undefined) {
      setEndVerseNum(initialEndVerse);
    } else {
      setEndVerseNum(999);
    }
  }, [selectedBook, initialChapter, initialReadingMode, initialStartVerse, initialEndVerse]);

  const [targetChapter, setTargetChapter] = useState<number>(initialChapter ?? 1);
  const [startVerseNum, setStartVerseNum] = useState<number>(initialStartVerse ?? 1);
  const [endVerseNum, setEndVerseNum] = useState<number>(initialEndVerse ?? 31);
  const [maxVersesForChapter, setMaxVersesForChapter] = useState<number>(31);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState<number>(0);
  const [localPlaybackSpeed, setLocalPlaybackSpeed] = useState<number>(isFhlMp3Mode ? 1.25 : 1.0);
  const [isInfiniteLoop, setIsInfiniteLoop] = useState<boolean>(false);
  const [localFontSize, setLocalFontSize] = useState<'normal' | 'large' | 'xlarge'>('xlarge');

  const playbackSpeed = propSpeed ?? localPlaybackSpeed;
  const setPlaybackSpeed = propSetSpeed ?? setLocalPlaybackSpeed;
  const fontSize = propFontSize ?? localFontSize;
  const setFontSize = propSetFontSize ?? setLocalFontSize;

  // Track FHL MP3 mode to auto-set initial reading speed (1.25x for FHL MP3, 1.0x otherwise)
  const prevIsFhlMp3ModeRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (prevIsFhlMp3ModeRef.current !== isFhlMp3Mode) {
      const initialSpeed = isFhlMp3Mode ? 1.25 : 1.0;
      setPlaybackSpeed(initialSpeed);
      playbackSpeedRef.current = initialSpeed;
      if (audioRef.current) {
        audioRef.current.playbackRate = initialSpeed;
      }
      prevIsFhlMp3ModeRef.current = isFhlMp3Mode;
    }
  }, [isFhlMp3Mode, setPlaybackSpeed]);

  // Currently loaded verses array for display
  const [activeVerses, setActiveVerses] = useState<Verse[]>([]);
  const [isLoadingVerses, setIsLoadingVerses] = useState<boolean>(true);

  // Currently displayed chapter number (page by page)
  const [viewChapter, setViewChapter] = useState<number>(initialChapter ?? 1);

  // MP3 Audio Player State & Audio Element
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isAudioBuffering, setIsAudioBuffering] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Current FHL Audio URL info
  const fhlAudio = getFhlChapterAudioUrls(selectedBook.number, viewChapter);

  // Copy Verse Confirmation Modal State
  const [selectedCopyVerse, setSelectedCopyVerse] = useState<{
    chapter: number;
    verse: number;
    text: string;
    index: number;
  } | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const lastVerseTapRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });

  // Bookmark state & toggle
  const isVerseMode = readingMode === 'VERSES' || startVerseNum > 1 || endVerseNum < maxVersesForChapter;
  const sV = Math.min(startVerseNum, endVerseNum);
  const eV = Math.max(startVerseNum, endVerseNum);

  // 自訂指定經文節數（例如從非連續書籤進入時）
  const [customVerseNumbers, setCustomVerseNumbers] = useState<number[] | undefined>(initialVerseNumbers);

  useEffect(() => {
    setCustomVerseNumbers(initialVerseNumbers);
  }, [initialVerseNumbers]);

  // Underlined verses state (單擊經文出現黑色虛線，可進行複製或加書籤)
  // 注意：點擊書籤進入閱讀時，所顯示的經文無須顯示黑色底線
  const [underlinedVerseNums, setUnderlinedVerseNums] = useState<number[]>([]);
  const [bookmarkUpdateCounter, setBookmarkUpdateCounter] = useState<number>(0);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [copyVersesSuccess, setCopyVersesSuccess] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => {
      setActionToast((curr) => (curr === msg ? null : curr));
    }, 2500);
  };

  useEffect(() => {
    // 進入閱讀時或切換章節時，所顯示的經文無須顯示黑色底線
    setUnderlinedVerseNums([]);
  }, [viewChapter, selectedBook.id, initialVerseNumbers]);

  const isBookmarkedState = useMemo(() => {
    if (underlinedVerseNums.length > 0) {
      const sorted = [...underlinedVerseNums].sort((a, b) => a - b);
      return isBookmarked(
        selectedVersion,
        selectedBook.id,
        viewChapter,
        'VERSES',
        sorted[0],
        sorted[sorted.length - 1],
        sorted
      );
    }
    if (customVerseNumbers && customVerseNumbers.length > 0) {
      const sorted = [...customVerseNumbers].sort((a, b) => a - b);
      return isBookmarked(
        selectedVersion,
        selectedBook.id,
        viewChapter,
        'VERSES',
        sorted[0],
        sorted[sorted.length - 1],
        sorted
      );
    }
    return isBookmarked(
      selectedVersion,
      selectedBook.id,
      viewChapter,
      isVerseMode ? 'VERSES' : undefined,
      isVerseMode ? sV : undefined,
      isVerseMode ? eV : undefined
    );
  }, [
    selectedVersion,
    selectedBook.id,
    viewChapter,
    readingMode,
    sV,
    eV,
    underlinedVerseNums,
    customVerseNumbers,
    bookmarkUpdateCounter,
  ]);

  const handleToggleBookmark = () => {
    if (underlinedVerseNums.length > 0) {
      const sorted = [...underlinedVerseNums].sort((a, b) => a - b);
      const minV = sorted[0];
      const maxV = sorted[sorted.length - 1];

      const bookmarkId = getBookmarkId({
        version: selectedVersion,
        bookId: selectedBook.id,
        chapter: viewChapter,
        readingMode: 'VERSES',
        startVerse: minV,
        endVerse: maxV,
        verseNumbers: sorted,
      });

      if (isBookmarkedState) {
        removeBookmark(bookmarkId);
        setBookmarkUpdateCounter((c) => c + 1);
        showToast('已將所選經文從書籤移除');
      } else {
        const selectedObjs = activeVerses.filter((v) => sorted.includes(v.verse));
        const preview = selectedObjs
          .map((v) => `第 ${v.verse} 節: ${v.text.slice(0, 45)}`)
          .join(' | ');

        saveBookmark({
          bookId: selectedBook.id,
          bookName: bookName,
          chapter: viewChapter,
          version: selectedVersion,
          previewText: preview,
          readingMode: 'VERSES',
          startVerse: minV,
          endVerse: maxV,
          verseNumbers: sorted,
        });
        setBookmarkUpdateCounter((c) => c + 1);
        const label = sorted.length === 1 ? `第 ${sorted[0]} 節` : `第 ${sorted.join(', ')} 節`;
        showToast(`已將 ${label} 加入 TIER1 書籤！`);
      }
      // 點擊加書籤按鈕後，虛線立刻消失
      setUnderlinedVerseNums([]);
      return;
    }

    if (customVerseNumbers && customVerseNumbers.length > 0) {
      const sorted = [...customVerseNumbers].sort((a, b) => a - b);
      const minV = sorted[0];
      const maxV = sorted[sorted.length - 1];

      const bookmarkId = getBookmarkId({
        version: selectedVersion,
        bookId: selectedBook.id,
        chapter: viewChapter,
        readingMode: 'VERSES',
        startVerse: minV,
        endVerse: maxV,
        verseNumbers: sorted,
      });

      if (isBookmarkedState) {
        removeBookmark(bookmarkId);
        setBookmarkUpdateCounter((c) => c + 1);
        showToast('已將此書籤移除');
      } else {
        const selectedObjs = activeVerses.filter((v) => sorted.includes(v.verse));
        const preview = selectedObjs
          .map((v) => `第 ${v.verse} 節: ${v.text.slice(0, 45)}`)
          .join(' | ');

        saveBookmark({
          bookId: selectedBook.id,
          bookName: bookName,
          chapter: viewChapter,
          version: selectedVersion,
          previewText: preview,
          readingMode: 'VERSES',
          startVerse: minV,
          endVerse: maxV,
          verseNumbers: sorted,
        });
        setBookmarkUpdateCounter((c) => c + 1);
        const label = sorted.length === 1 ? `第 ${sorted[0]} 節` : `第 ${sorted.join(', ')} 節`;
        showToast(`已將 ${label} 加入 TIER1 書籤！`);
      }
      // 點擊加書籤按鈕後，虛線立刻消失
      setUnderlinedVerseNums([]);
      return;
    }

    const bookmarkId = getBookmarkId({
      version: selectedVersion,
      bookId: selectedBook.id,
      chapter: viewChapter,
      readingMode: isVerseMode ? 'VERSES' : undefined,
      startVerse: isVerseMode ? sV : undefined,
      endVerse: isVerseMode ? eV : undefined,
    });

    if (isBookmarkedState) {
      removeBookmark(bookmarkId);
      setBookmarkUpdateCounter((c) => c + 1);
      showToast('已從 TIER1 書籤移除');
    } else {
      let preview = '';
      if (activeVerses.length > 0) {
        const first = activeVerses[0];
        preview = `第 ${first.verse} 節: ${first.text.slice(0, 50)}...`;
      }
      saveBookmark({
        bookId: selectedBook.id,
        bookName: bookName,
        chapter: viewChapter,
        version: selectedVersion,
        previewText: preview,
        readingMode: isVerseMode ? 'VERSES' : undefined,
        startVerse: isVerseMode ? sV : undefined,
        endVerse: isVerseMode ? eV : undefined,
      });
      setBookmarkUpdateCounter((c) => c + 1);
      showToast('已加入 TIER1 書籤！');
    }
    // 點擊加書籤按鈕後，虛線立刻消失
    setUnderlinedVerseNums([]);
  };

  // 複製經文（若有底線選取則複製所選經文，點擊後虛線立刻消失；否則複製目前顯示經文）
  const handleCopyUnderlinedVerses = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    let targetVerseNums: number[] = [];
    const hasSelection = underlinedVerseNums.length > 0;
    if (hasSelection) {
      targetVerseNums = [...underlinedVerseNums].sort((a, b) => a - b);
    } else if (customVerseNumbers && customVerseNumbers.length > 0) {
      targetVerseNums = [...customVerseNumbers].sort((a, b) => a - b);
    } else if (activeVerses.length > 0) {
      targetVerseNums = activeVerses.map((v) => v.verse);
    }

    if (targetVerseNums.length === 0) return;
    const lines = targetVerseNums.map((vNum) => {
      const vObj = activeVerses.find((v) => v.verse === vNum);
      const text = vObj ? normalizeGodTerms(vObj.text) : '';
      return `${bookName} ${viewChapter}:${vNum} ${text}`;
    });
    const copyText = lines.join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(copyText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = copyText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyVersesSuccess(true);
      showToast(hasSelection ? `已複製選取的 ${targetVerseNums.length} 節經文！` : `已複製經文！`);
      // 點擊複製按鈕後，虛線立刻消失
      setUnderlinedVerseNums([]);
      setTimeout(() => {
        setCopyVersesSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy verses:', err);
    }
  };

  // Record last read position to persistent storage
  const recordCurrentReadingPosition = useCallback((targetChapter?: number, verseNum?: number, preview?: string) => {
    const ch = targetChapter !== undefined ? targetChapter : viewChapter;
    let previewContent = preview;
    if (!previewContent && activeVerses.length > 0) {
      const vObj = verseNum ? activeVerses.find((v) => v.verse === verseNum) : activeVerses[0];
      if (vObj) {
        previewContent = `第 ${vObj.verse} 節: ${vObj.text.slice(0, 50)}...`;
      }
    }

    saveLastReadRecord({
      bookId: selectedBook.id,
      bookName: bookName,
      chapter: ch,
      verse: verseNum,
      version: selectedVersion,
      readingMode: readingMode,
      startVerse: readingMode === 'VERSES' ? startVerseNum : undefined,
      endVerse: readingMode === 'VERSES' ? endVerseNum : undefined,
      previewText: previewContent,
    });
  }, [
    readingMode,
    startVerseNum,
    endVerseNum,
    selectedBook.id,
    bookName,
    viewChapter,
    selectedVersion,
    activeVerses,
  ]);

  // Continuation ref when switching chapter during continuous playback
  const shouldAutoPlayRef = useRef<boolean>(false);

  useEffect(() => {
    if (autoStartPlayback) {
      shouldAutoPlayRef.current = true;
    }
  }, [autoStartPlayback, selectedBook, selectedVersion, initialChapter]);

  // Refs for Speech Synthesis and Auto-scrolling
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const verseRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Min & Max Chapter bounds based on selected chapter range
  const minChapter = React.useMemo(() => {
    return Math.min(startChapter, endChapter);
  }, [startChapter, endChapter]);

  const maxChapter = React.useMemo(() => {
    return Math.max(startChapter, endChapter);
  }, [startChapter, endChapter]);

  // Sync viewChapter within valid min/max bounds when chapter selectors change
  useEffect(() => {
    const sCh = Math.min(startChapter, endChapter);
    const eCh = Math.max(startChapter, endChapter);
    if (viewChapter < sCh || viewChapter > eCh) {
      setViewChapter(sCh);
    }
  }, [startChapter, endChapter]);

  // Refs to keep track of freshest state inside audio callbacks
  const activeVersesRef = useRef<Verse[]>([]);
  const viewChapterRef = useRef<number>(1);
  const minChapterRef = useRef<number>(1);
  const maxChapterRef = useRef<number>(1);
  const isInfiniteLoopRef = useRef<boolean>(false);
  const playbackSpeedRef = useRef<number>(1.0);
  const speechPitchRef = useRef<number>(1.0);
  const isPlayingRef = useRef<boolean>(false);
  const readingModeRef = useRef<ReadingMode>(readingMode);

  useEffect(() => {
    activeVersesRef.current = activeVerses;
  }, [activeVerses]);

  useEffect(() => {
    readingModeRef.current = readingMode;
  }, [readingMode]);

  useEffect(() => {
    viewChapterRef.current = viewChapter;
  }, [viewChapter]);

  useEffect(() => {
    minChapterRef.current = minChapter;
  }, [minChapter]);

  useEffect(() => {
    maxChapterRef.current = maxChapter;
  }, [maxChapter]);

  useEffect(() => {
    isInfiniteLoopRef.current = isInfiniteLoop;
  }, [isInfiniteLoop]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    speechPitchRef.current = speechPitch;
  }, [speechPitch]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Initialize Speech Synthesis & Audio cleanup on unmount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Update verse bounds whenever targetChapter or book changes
  useEffect(() => {
    let isCancelled = false;
    const updateVerseBounds = async () => {
      try {
        const chVerses = await fetchChapterVerses(
          selectedBook.id,
          bookName,
          targetChapter,
          selectedVersion
        );
        if (!isCancelled && chVerses && chVerses.length > 0) {
          const totalCount = chVerses.length;
          setMaxVersesForChapter(totalCount);
          if (initialStartVerse !== undefined && initialEndVerse !== undefined && targetChapter === (initialChapter ?? 1)) {
            setStartVerseNum(Math.min(initialStartVerse, totalCount));
            setEndVerseNum(Math.min(initialEndVerse, totalCount));
          } else if (startVerseNum > totalCount || endVerseNum > totalCount) {
            setStartVerseNum(1);
            setEndVerseNum(totalCount);
          }
        }
      } catch (err) {
        console.warn('Error fetching chapter verses count:', err);
      }
    };

    updateVerseBounds();

    return () => {
      isCancelled = true;
    };
  }, [targetChapter, selectedBook.id, bookName, selectedVersion, initialChapter, initialStartVerse, initialEndVerse]);

  // 朗讀播放時自動捲動當前節經文至安全可見視野
  // 關鍵：非播放狀態（如選擇新經卷、切換章節）絕不調用 scrollIntoView，避免將第 1 節或頂部導航推入控制列下方被遮擋！
  useEffect(() => {
    if (isPlaying && activeVerses.length > 0) {
      const targetEl = verseRefs.current[currentVerseIndex];
      if (targetEl) {
        const playbar = document.getElementById('tier3-playbar');
        const playbarBottom = playbar ? playbar.getBoundingClientRect().bottom : 150;
        const rect = targetEl.getBoundingClientRect();

        // 若當前朗讀經文被上方固定播放列遮擋
        if (rect.top < playbarBottom + 16) {
          const deltaY = rect.top - (playbarBottom + 24);
          window.scrollBy({ top: deltaY, behavior: 'smooth' });
        }
        // 若當前朗讀經文超出螢幕下方
        else if (rect.bottom > window.innerHeight - 36) {
          const deltaY = rect.bottom - (window.innerHeight - 48);
          window.scrollBy({ top: deltaY, behavior: 'smooth' });
        }
      }
    }
  }, [currentVerseIndex, isPlaying, activeVerses.length]);

  // Fetch Verses for the single current viewChapter asynchronously
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingVerses(true);

    const loadVerses = async () => {
      try {
        const chVerses = await fetchChapterVerses(
          selectedBook.id,
          bookName,
          viewChapter,
          selectedVersion
        );

        let resultVerses = chVerses;
        const sV = Math.min(startVerseNum, endVerseNum);
        const eV = Math.max(startVerseNum, endVerseNum);
        if (readingMode === 'VERSES') {
          if (customVerseNumbers && customVerseNumbers.length > 0) {
            resultVerses = chVerses.filter((v) => customVerseNumbers.includes(v.verse));
          } else if (sV > 1 || eV < chVerses.length) {
            resultVerses = chVerses.filter((v) => v.verse >= sV && v.verse <= eV);
          }
        }

        if (!isCancelled) {
          setActiveVerses(resultVerses);
          
          let targetIndex = 0;
          if (initialVerseNumbers && initialVerseNumbers.length > 0) {
            const firstV = initialVerseNumbers[0];
            const foundIdx = resultVerses.findIndex((v) => v.verse === firstV);
            if (foundIdx >= 0) {
              targetIndex = foundIdx;
            }
          } else if (initialVerse && initialVerse > 1) {
            const foundIdx = resultVerses.findIndex((v) => v.verse === initialVerse);
            if (foundIdx >= 0) {
              targetIndex = foundIdx;
            }
          }
          
          setCurrentVerseIndex(targetIndex);
          setIsLoadingVerses(false);

          if (synthRef.current) {
            synthRef.current.cancel();
          }

          const initialTargetVerse = (initialVerse && initialVerse > 1) ? initialVerse : (resultVerses[targetIndex]?.verse || 1);
          const firstVerseText = resultVerses[targetIndex]?.text || resultVerses[0]?.text || '';
          const previewStr = firstVerseText ? `第 ${initialTargetVerse} 節: ${firstVerseText.slice(0, 50)}...` : undefined;
          
          saveLastReadRecord({
            bookId: selectedBook.id,
            bookName: bookName,
            chapter: viewChapter,
            verse: initialTargetVerse,
            version: selectedVersion,
            readingMode: readingMode,
            startVerse: readingMode === 'VERSES' ? startVerseNum : undefined,
            endVerse: readingMode === 'VERSES' ? endVerseNum : undefined,
            previewText: previewStr,
          });

          // 關鍵修正：正常瀏覽章節（targetIndex === 0）或按「上一章/下一章」時，絕對不調用 scrollIntoView({ block: 'center' })，
          // 避免瀏覽器將第 1 節移至螢幕中央而導致白色經文區域往上縮入頂部控制列下方被遮擋！
          // 僅當指定特定節數（例如從書籤進入且指定第 2 節以上：targetIndex > 0）時，才做平滑安全視窗微調。
          if (targetIndex > 0 && verseRefs.current[targetIndex]) {
            setTimeout(() => {
              const targetEl = verseRefs.current[targetIndex];
              if (targetEl) {
                const playbar = document.getElementById('tier3-playbar');
                const playbarBottom = playbar ? playbar.getBoundingClientRect().bottom : 150;
                const rect = targetEl.getBoundingClientRect();
                const deltaY = rect.top - (playbarBottom + 20);
                window.scrollBy({ top: deltaY, behavior: 'smooth' });
              }
            }, 60);
          }

          if (shouldAutoPlayRef.current) {
            shouldAutoPlayRef.current = false;
            setIsPlaying(true);
            if (isFhlMp3Mode && audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.playbackRate = playbackSpeedRef.current;
              audioRef.current.play().catch((err) => console.warn('AutoPlay MP3 failed:', err));
            } else {
              setTimeout(() => {
                speakVerse(targetIndex);
              }, 80);
            }
          }
        }
      } catch (error) {
        console.error('Error loading Bible verses:', error);
        if (!isCancelled) {
          setIsLoadingVerses(false);
        }
      }
    };

    loadVerses();

    return () => {
      isCancelled = true;
    };
  }, [
    viewChapter,
    readingMode,
    startVerseNum,
    endVerseNum,
    selectedBook.id,
    bookName,
    selectedVersion,
    isFhlMp3Mode,
    customVerseNumbers,
  ]);

  // Synchronize MP3 Audio source on viewChapter or book change
  useEffect(() => {
    if (!isFhlMp3Mode) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    setAudioCurrentTime(0);
    setAudioError(null);

    const audio = audioRef.current;
    if (audio) {
      audio.load();
      audio.playbackRate = playbackSpeedRef.current;
      if (shouldAutoPlayRef.current || isPlayingRef.current) {
        audio.play().catch((err) => {
          console.warn('Audio play request interrupted or prevented:', err);
        });
      }
    }
  }, [viewChapter, selectedBook.number, isFhlMp3Mode]);

  // Advance to next book's chapter 1 if at the end of the current book
  const advanceToNextBook = useCallback(() => {
    const currentBookIndex = BIBLE_BOOKS.findIndex((b) => b.id === selectedBook.id);
    if (currentBookIndex >= 0 && currentBookIndex < BIBLE_BOOKS.length - 1) {
      const nextBook = BIBLE_BOOKS[currentBookIndex + 1];
      if (nextBook && onSelectBook) {
        if (synthRef.current) {
          synthRef.current.cancel();
        }
        shouldAutoPlayRef.current = true;
        onSelectBook(nextBook, 1, true);
        return true;
      }
    }
    return false;
  }, [selectedBook.id, onSelectBook]);

  // Touch Swipe Handlers for Chapter Switching (向右滑：上一章, 向左滑：下一章)
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number>(0);

  // Quick Chapter Jump from Navigation Pill (直接輸入章數跳轉)
  const [chapterInputText, setChapterInputText] = useState<string>(String(viewChapter));
  const inputValRef = useRef<string>(String(viewChapter));
  const [isChapterInputFocused, setIsChapterInputFocused] = useState<boolean>(false);

  useEffect(() => {
    if (!isChapterInputFocused) {
      setChapterInputText(String(viewChapter));
      inputValRef.current = String(viewChapter);
    }
  }, [viewChapter, isChapterInputFocused]);

  // 平滑捲動至頂端：當切換上一章、下一章、直接輸入跳轉或切換新經卷時，
  // 若不在最頂端則平滑捲動回 top: 0，上方固定控制列穩固停在 header 下方特定高度，經文白底區域與第 1 節絕不被遮擋。
  const scrollToScriptureTop = useCallback(() => {
    if (window.scrollY > 0) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, []);

  // When switching book or chapter, ensure page smoothly scrolls so that scripture container and verse 1 are at top (Desktop & Mobile)
  useEffect(() => {
    scrollToScriptureTop();
  }, [selectedBook.id, viewChapter, scrollToScriptureTop]);

  // 智慧視窗平移定位 (Auto Safe Scroll)：
  // 在章節輸入框聚焦 (Focus) 時，系統會自動偵測上方固定控制列（開始、單次、加書籤、複製及時間軸）的底部高度，
  // 平滑將輸入框捲動至控制列下方安全可見區，完全不再被播放條遮擋。
  const autoScrollInputToSafePosition = useCallback((targetInput: HTMLElement) => {
    const performSafeScroll = () => {
      const playbar = document.getElementById('tier3-playbar');
      // 偵測上方固定控制列與時間軸的目前底部高度位置 (playbar.getBoundingClientRect().bottom)
      const playbarBottom = playbar ? playbar.getBoundingClientRect().bottom : 130;
      const inputRect = targetInput.getBoundingClientRect();

      // 安全間隔（在控制列與時間軸下方保留 24px 呼吸安全區）
      const safeClearance = 24;
      const desiredTop = playbarBottom + safeClearance;

      // 如果輸入框頂部被上方控制列或時間軸遮蓋 (inputRect.top < playbarBottom + 16)，
      // 或是因為手機鍵盤彈出導致輸入框太靠近播放條 (inputRect.top < desiredTop)，
      // 立即進行平滑捲動，將輸入框置於控制列下方的安全可見區
      if (inputRect.top < desiredTop) {
        const deltaY = inputRect.top - desiredTop;
        window.scrollBy({
          top: deltaY,
          behavior: 'smooth',
        });
      }
    };

    // 多階段延遲執行：
    // 手機點擊輸入框時，虛擬鍵盤彈出過程通常耗時 200~400ms，並會觸發瀏覽器預設捲動。
    // 分別在立即、80ms、200ms、380ms、550ms 進行智慧平移補償，確保鍵盤開啟完畢後輸入框依然百分之百清晰可見。
    requestAnimationFrame(performSafeScroll);
    setTimeout(performSafeScroll, 80);
    setTimeout(performSafeScroll, 200);
    setTimeout(performSafeScroll, 380);
    setTimeout(performSafeScroll, 550);
  }, []);

  // 監聽 Visual Viewport 視窗縮放/滾動（針對 iOS/Android 虛擬鍵盤彈出收合）
  useEffect(() => {
    if (!isChapterInputFocused) return;

    const handleViewportChange = () => {
      const activeEl = document.activeElement;
      if (activeEl instanceof HTMLInputElement && activeEl.dataset.chapterInput === 'true') {
        autoScrollInputToSafePosition(activeEl);
      }
    };

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleViewportChange);
      vv.addEventListener('scroll', handleViewportChange);
      return () => {
        vv.removeEventListener('resize', handleViewportChange);
        vv.removeEventListener('scroll', handleViewportChange);
      };
    }
  }, [isChapterInputFocused, autoScrollInputToSafePosition]);

  const handleJumpToChapter = (chapterNum: number) => {
    const clamped = Math.max(1, Math.min(chapterNum, selectedBook.chaptersCount));
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    shouldAutoPlayRef.current = isPlaying;
    setReadingMode('CHAPTERS');
    setCustomVerseNumbers(undefined);
    setStartVerseNum(1);
    setEndVerseNum(999);
    setViewChapter(clamped);
    setTargetChapter(clamped);
    setStartChapter(1);
    setEndChapter(selectedBook.chaptersCount);
    setAudioCurrentTime(0);
    setChapterInputText(String(clamped));
    inputValRef.current = String(clamped);
    scrollToScriptureTop();

    if (chapterNum > selectedBook.chaptersCount) {
      showToast(`『${bookName}』全書共 ${selectedBook.chaptersCount} 章，已為您跳至最後一章（第 ${clamped} 章）`);
    } else {
      showToast(`已跳至『${bookName}』第 ${clamped} 章`);
    }
  };

  const handlePrevChapter = () => {
    if (viewChapter > 1) {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      shouldAutoPlayRef.current = isPlaying;
      setReadingMode('CHAPTERS');
      setCustomVerseNumbers(undefined);
      setStartVerseNum(1);
      setEndVerseNum(999);
      const prevCh = viewChapter - 1;
      setViewChapter(prevCh);
      setTargetChapter(prevCh);
      setChapterInputText(String(prevCh));
      inputValRef.current = String(prevCh);
      scrollToScriptureTop();
    } else if (viewChapter === 1) {
      const currentBookIndex = BIBLE_BOOKS.findIndex((b) => b.id === selectedBook.id);
      if (currentBookIndex > 0) {
        const prevBook = BIBLE_BOOKS[currentBookIndex - 1];
        if (prevBook && onSelectBook) {
          if (synthRef.current) {
            synthRef.current.cancel();
          }
          shouldAutoPlayRef.current = isPlaying;
          onSelectBook(prevBook, prevBook.chaptersCount, isPlaying);
        }
      }
    }
  };

  const handleNextChapter = () => {
    if (viewChapter < selectedBook.chaptersCount) {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      shouldAutoPlayRef.current = isPlaying;
      setReadingMode('CHAPTERS');
      setCustomVerseNumbers(undefined);
      setStartVerseNum(1);
      setEndVerseNum(999);
      const nextCh = viewChapter + 1;
      setViewChapter(nextCh);
      setTargetChapter(nextCh);
      setChapterInputText(String(nextCh));
      inputValRef.current = String(nextCh);
      scrollToScriptureTop();
    } else if (viewChapter >= selectedBook.chaptersCount) {
      const currentBookIndex = BIBLE_BOOKS.findIndex((b) => b.id === selectedBook.id);
      if (currentBookIndex >= 0 && currentBookIndex < BIBLE_BOOKS.length - 1) {
        const nextBook = BIBLE_BOOKS[currentBookIndex + 1];
        if (nextBook && onSelectBook) {
          if (synthRef.current) {
            synthRef.current.cancel();
          }
          shouldAutoPlayRef.current = isPlaying;
          onSelectBook(nextBook, 1, isPlaying);
        }
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchStartTimeRef.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartXRef.current;
    const deltaY = touchEndY - touchStartYRef.current;
    const duration = Date.now() - touchStartTimeRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    // If user has selected text on mobile/touch screen, or if touch was a long-press (> 350ms),
    // do not trigger chapter swipe
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return;
    }
    if (duration > 350) {
      return;
    }

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        handleNextChapter();
      } else {
        handlePrevChapter();
      }
    }
  };

  // TTS Speech for a given verse index (used in Verse mode and KJV/LSG)
  const speakVerse = useCallback(
    (index: number) => {
      const currentVerses = activeVersesRef.current;
      if (!synthRef.current || index < 0 || index >= currentVerses.length) {
        if (readingModeRef.current === 'VERSES') {
          if (isInfiniteLoopRef.current) {
            setCurrentVerseIndex(0);
            setTimeout(() => {
              speakVerse(0);
            }, 100);
          } else {
            setIsPlaying(false);
          }
          return;
        }

        if (isInfiniteLoopRef.current) {
          if (viewChapterRef.current < maxChapterRef.current) {
            shouldAutoPlayRef.current = true;
            setViewChapter((prev) => prev + 1);
          } else {
            // 達到結束章節（例如路得記第4章），循環回到起始章節（第1章）
            if (minChapterRef.current === maxChapterRef.current) {
              setCurrentVerseIndex(0);
              setTimeout(() => {
                speakVerse(0);
              }, 100);
            } else {
              shouldAutoPlayRef.current = true;
              setViewChapter(minChapterRef.current);
            }
          }
        } else {
          // Single playback mode (非循環狀態) - 自動朗讀下一章
          if (viewChapterRef.current < maxChapterRef.current) {
            shouldAutoPlayRef.current = true;
            setViewChapter((prev) => prev + 1);
          } else {
            if (maxChapterRef.current >= selectedBook.chaptersCount) {
              const advanced = advanceToNextBook();
              if (advanced) return;
            }
            setIsPlaying(false);
          }
        }
        return;
      }

      if (synthRef.current.speaking || synthRef.current.pending) {
        synthRef.current.cancel();
      }

      const verseObj = currentVerses[index];
      if (!verseObj) {
        setIsPlaying(false);
        return;
      }

      setCurrentVerseIndex(index);

      const isChapterStart = index === 0 && verseObj.verse === 1;
      let speechText = '';
      if (isChapterStart) {
        if (selectedVersion === 'KJV') {
          speechText = `${bookName}, ${isPsalm ? 'Psalm' : 'Chapter'} ${verseObj.chapter}. ${verseObj.text}`;
        } else if (selectedVersion === 'LSG' || selectedVersion === 'LBS') {
          speechText = `${bookName}, ${isPsalm ? 'Psaume' : 'Chapitre'} ${verseObj.chapter}. ${verseObj.text}`;
        } else {
          speechText = `${bookName}第${verseObj.chapter}${chapterUnit}。${verseObj.text}`;
        }
      } else {
        speechText = verseObj.text;
      }

      if (selectedVersion === 'CUV' || versionInfo?.langCode?.startsWith('zh')) {
        speechText = fixChineseTTSPronunciation(speechText);
      }

      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = versionInfo.langCode || 'zh-TW';
      utterance.rate = playbackSpeedRef.current;
      utterance.pitch = speechPitchRef.current;

      const voices = synthRef.current.getVoices();
      if (voices.length > 0) {
        let matchingVoice: SpeechSynthesisVoice | undefined;
        if (selectedVoiceName) {
          matchingVoice = voices.find((v) => v.name === selectedVoiceName);
        }
        if (!matchingVoice) {
          const targetLang = versionInfo.langCode;
          matchingVoice = voices.find((v) =>
            v.lang.toLowerCase().startsWith(targetLang.slice(0, 2).toLowerCase())
          );
        }
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
      }

      utterance.onstart = () => {
        setIsPlaying(true);
        setCurrentVerseIndex(index);
        saveLastReadRecord({
          bookId: selectedBook.id,
          bookName: bookName,
          chapter: verseObj.chapter,
          verse: verseObj.verse,
          version: selectedVersion,
          readingMode: readingMode,
          startVerse: readingMode === 'VERSES' ? startVerseNum : undefined,
          endVerse: readingMode === 'VERSES' ? endVerseNum : undefined,
          previewText: `第 ${verseObj.verse} 節: ${verseObj.text.slice(0, 50)}...`,
        });
      };

      utterance.onend = () => {
        const nextIndex = index + 1;
        if (nextIndex < currentVerses.length) {
          setCurrentVerseIndex(nextIndex);
          speakVerse(nextIndex);
        } else {
          // 當前章節全部節朗讀完畢
          if (readingModeRef.current === 'VERSES') {
            if (isInfiniteLoopRef.current) {
              setCurrentVerseIndex(0);
              setTimeout(() => {
                speakVerse(0);
              }, 100);
            } else {
              setIsPlaying(false);
            }
            return;
          }

          if (isInfiniteLoopRef.current) {
            if (viewChapterRef.current < maxChapterRef.current) {
              shouldAutoPlayRef.current = true;
              setViewChapter((prev) => prev + 1);
            } else {
              // 達到結束章節（例如路得記第4章），循環回到起始章節（第1章）
              if (minChapterRef.current === maxChapterRef.current) {
                setCurrentVerseIndex(0);
                setTimeout(() => {
                  speakVerse(0);
                }, 100);
              } else {
                shouldAutoPlayRef.current = true;
                setViewChapter(minChapterRef.current);
              }
            }
          } else {
            // Single playback mode (非循環狀態) - 自動朗讀下一章
            if (viewChapterRef.current < maxChapterRef.current) {
              shouldAutoPlayRef.current = true;
              setViewChapter((prev) => prev + 1);
            } else {
              // 該卷書最後一章 -> 自動銜接下一卷書第一章
              if (maxChapterRef.current >= selectedBook.chaptersCount) {
                const advanced = advanceToNextBook();
                if (advanced) return;
              }
              setIsPlaying(false);
            }
          }
        }
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          setIsPlaying(false);
        }
      };

      currentUtteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    },
    [versionInfo.langCode, selectedVersion, bookName, selectedVoiceName, chapterUnit, isPsalm, selectedBook.chaptersCount, advanceToNextBook, readingMode, startVerseNum, endVerseNum]
  );

  // Play button handler
  const handlePlay = useCallback(() => {
    setIsPlaying(true);

    if (isFhlMp3Mode) {
      if (audioRef.current) {
        audioRef.current.playbackRate = playbackSpeedRef.current;
        audioRef.current.play().catch((err) => {
          console.warn('MP3 Play error:', err);
          setAudioError('無法播放音訊檔案，請檢查網路連線。');
        });
      }
      return;
    }

    if (!synthRef.current) return;
    if (synthRef.current.paused && synthRef.current.speaking) {
      synthRef.current.resume();
      return;
    }

    speakVerse(currentVerseIndex);
  }, [speakVerse, currentVerseIndex, isFhlMp3Mode]);

  // Pause button handler
  const handlePause = useCallback(() => {
    setIsPlaying(false);

    if (isFhlMp3Mode) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    if (!synthRef.current) return;
    synthRef.current.cancel();
  }, [isFhlMp3Mode]);

  // Toggle Play/Pause
  const handleTogglePlayPause = useCallback(() => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [isPlaying, handlePause, handlePlay]);

  // Spacebar hotkey listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        const target = e.target as HTMLElement;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        handleTogglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTogglePlayPause]);

  // MP3 Seek Slider Handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setAudioCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // MP3 Ended Handler: Auto Advance or Infinite Loop
  const handleAudioEnded = () => {
    if (isInfiniteLoopRef.current) {
      if (viewChapterRef.current < maxChapterRef.current) {
        shouldAutoPlayRef.current = true;
        setViewChapter((prev) => prev + 1);
      } else {
        // 達到結束章節（例如路得記第4章），循環回到起始章節（第1章）
        if (minChapterRef.current === maxChapterRef.current) {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.playbackRate = playbackSpeedRef.current;
            audioRef.current.play().catch((err) => console.warn(err));
          }
        } else {
          shouldAutoPlayRef.current = true;
          setViewChapter(minChapterRef.current);
        }
      }
    } else {
      // Single playback mode (非循環狀態) - 自動朗讀下一章
      if (viewChapterRef.current < maxChapterRef.current) {
        shouldAutoPlayRef.current = true;
        setViewChapter((prev) => prev + 1);
      } else {
        // 該卷書最後一章 -> 自動銜接下一卷書第一章
        if (maxChapterRef.current >= selectedBook.chaptersCount) {
          const advanced = advanceToNextBook();
          if (advanced) return;
        }
        setIsPlaying(false);
        setAudioCurrentTime(0);
      }
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Open copy dialog modal
  const handleOpenCopyModal = (v: Verse, idx: number) => {
    setSelectedCopyVerse({
      chapter: v.chapter,
      verse: v.verse,
      text: v.text,
      index: idx,
    });
    setCopySuccess(false);
  };

  // Helper to resolve verse info from selection
  const getVerseInfoFromSelection = (): { chapter: string; verse: string } | null => {
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      let node: Node | null = sel.getRangeAt(0).startContainer;
      while (node && node !== document.body) {
        if (node instanceof HTMLElement && node.getAttribute('data-verse-row') === 'true') {
          const ch = node.getAttribute('data-chapter');
          const vs = node.getAttribute('data-verse');
          if (ch && vs) return { chapter: ch, verse: vs };
        }
        node = node.parentNode;
      }
    } catch {
      // ignore
    }
    return null;
  };

  // Format scripture text for clipboard: 經卷書名＋節數標籤＋經文
  const formatScriptureClipboardText = (rawText: string): string => {
    if (!rawText || !rawText.trim()) return rawText;

    // Normalize potential line break between badge and text:
    // e.g., "1:44\n腓力是伯賽大人..." or "約翰福音 1:44\n腓力是伯賽大人..." -> join with space
    let normalized = rawText.replace(
      /(^|\n)((?:[\u4e00-\u9fa5\w\s]+)?\s*\d+:\d+)\r?\n([^\d\n])/g,
      '$1$2 $3'
    );

    const lines = normalized.split(/\r?\n/);
    const hasAnyBadge = lines.some((line) => line.match(/\d+:\d+/));
    const fallbackVerse = !hasAnyBadge ? getVerseInfoFromSelection() : null;

    const formattedLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Match badge like "1:44" or "約翰福音 1:44" or "創世記1:1" at the start of line
      const badgeMatch = trimmed.match(/^((?:[\u4e00-\u9fa5\w\s]+)?\s*)(\d+:\d+)([\s\S]*)$/);
      if (badgeMatch) {
        const existingPrefix = badgeMatch[1].trim();
        const ref = badgeMatch[2];
        const rest = badgeMatch[3].trim();

        const name = existingPrefix.includes(bookName) ? existingPrefix : bookName;
        return rest ? `${name} ${ref} ${rest}` : `${name} ${ref}`;
      }

      // If line does not have badge but selection is in a verse row
      if (fallbackVerse) {
        return `${bookName} ${fallbackVerse.chapter}:${fallbackVerse.verse} ${trimmed}`;
      }

      return line;
    });

    return formattedLines.join('\n');
  };

  // Intercept native copy (Ctrl+C / Cmd+C / Right click -> Copy / Mobile Callout -> Copy) to ensure 經卷書名＋節數標籤＋經文 format
  useEffect(() => {
    const handleNativeCopy = (e: ClipboardEvent) => {
      // Do not intercept if user is typing or selecting inside an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        if (underlinedVerseNums.length > 0 && e.clipboardData) {
          const sorted = [...underlinedVerseNums].sort((a, b) => a - b);
          const lines = sorted.map((vNum) => {
            const vObj = activeVerses.find((v) => v.verse === vNum);
            const text = vObj ? normalizeGodTerms(vObj.text) : '';
            return `${bookName} ${viewChapter}:${vNum} ${text}`;
          });
          e.clipboardData.setData('text/plain', lines.join('\n'));
          e.preventDefault();
        }
        return;
      }

      const rawText = selection.toString();
      const formatted = formatScriptureClipboardText(rawText);

      // If formatted text contains bookName or reference
      if (formatted && e.clipboardData) {
        e.clipboardData.setData('text/plain', formatted);
        e.preventDefault();
      }
    };

    document.addEventListener('copy', handleNativeCopy);
    return () => {
      document.removeEventListener('copy', handleNativeCopy);
    };
  }, [bookName, underlinedVerseNums, activeVerses, viewChapter]);

  // 單擊經文：切換底線選取狀態（若正在進行反白文字選取，則不切換底線）
  const handleVerseClick = (v: Verse, _idx: number, _e?: React.MouseEvent) => {
    // If text was selected by the user (反白文字中), do not toggle underline
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return;
    }

    setUnderlinedVerseNums((prev) => {
      if (prev.includes(v.verse)) {
        return prev.filter((n) => n !== v.verse);
      } else {
        return [...prev, v.verse].sort((a, b) => a - b);
      }
    });
  };

  // Copy verse handler
  const handleCopyVerseText = async () => {
    if (!selectedCopyVerse) return;
    const formattedText = `${bookName} ${selectedCopyVerse.chapter}:${selectedCopyVerse.verse} ${normalizeGodTerms(selectedCopyVerse.text)}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formattedText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = formattedText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        setSelectedCopyVerse(null);
      }, 1000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Read from selected verse
  const handleStartReadingSelected = () => {
    if (!selectedCopyVerse) return;
    const idx = selectedCopyVerse.index;
    setSelectedCopyVerse(null);

    if (isFhlMp3Mode) {
      // In FHL MP3 mode, start full MP3 playback
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((err) => console.warn(err));
      }
    } else {
      setCurrentVerseIndex(idx);
      setIsPlaying(true);
      speakVerse(idx);
    }
  };

  // Font size CSS mapping - compact line heights to show more verses per screen
  const getFontSizeClass = () => {
    if (fontSize === 'normal') return 'text-sm md:text-base leading-[1.3]';
    if (fontSize === 'large') return 'text-base md:text-lg leading-[1.3]';
    return 'text-lg md:text-xl leading-[1.3]';
  };

  // Render Chapter Navigation Bar (上一章、總章數及下一章按鈕 - 確保同一列不可分行)
  const renderChapterNavBar = (idSuffix: string = 'bottom') => {
    const handleConfirmJump = (overrideVal?: string) => {
      const raw = overrideVal !== undefined ? overrideVal : (inputValRef.current || chapterInputText);
      const parsed = parseInt(raw.trim(), 10);
      if (!isNaN(parsed) && parsed >= 1) {
        handleJumpToChapter(parsed);
      } else {
        setChapterInputText(String(viewChapter));
        inputValRef.current = String(viewChapter);
      }
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };

    return (
      <div
        className="inline-flex items-center justify-center sm:justify-end gap-1 sm:gap-1.5 scroll-mt-48 flex-nowrap shrink-0 whitespace-nowrap select-none"
        id={`chapter-nav-${idSuffix}`}
      >
        {/* 上一章按鈕 */}
        <button
          type="button"
          onClick={handlePrevChapter}
          disabled={viewChapter <= 1 && BIBLE_BOOKS.findIndex((b) => b.id === selectedBook.id) <= 0}
          className={`px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-0.5 sm:gap-1 border transition-all shrink-0 whitespace-nowrap ${
            viewChapter <= 1 && BIBLE_BOOKS.findIndex((b) => b.id === selectedBook.id) <= 0
              ? 'opacity-30 border-zinc-200 text-zinc-400 cursor-not-allowed bg-zinc-50'
              : 'bg-amber-50/80 border-amber-300/80 text-amber-900 hover:bg-amber-100 hover:border-amber-400 cursor-pointer shadow-xs active:scale-95'
          }`}
          title={`上一${chapterUnit} (向右滑動)`}
        >
          <ChevronLeft className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span className="whitespace-nowrap">上一{chapterUnit}</span>
        </button>

        {/* Chapter Navigation Form Pill: input + / + 總章數 + 前往按鈕 (Form讓手機數字鍵盤直接顯示 Enter / 前往鍵) */}
        <form
          action="#"
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmJump();
          }}
          className="flex items-center text-xs font-mono font-bold px-1 sm:px-1.5 py-0.5 bg-amber-50/95 hover:bg-amber-100/95 border border-amber-300/90 hover:border-amber-500 rounded-lg text-amber-900 transition-all shadow-xs focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-600 focus-within:bg-white shrink-0 whitespace-nowrap"
          title={`可直接點擊或輸入想朗讀的${chapterUnit} (1~${selectedBook.chaptersCount})`}
        >
          <input
            type="text"
            data-chapter-input="true"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="go"
            value={chapterInputText}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setChapterInputText(val);
              inputValRef.current = val;
            }}
            onClick={(e) => {
              const target = e.target as HTMLInputElement;
              target.select();
              autoScrollInputToSafePosition(target);
            }}
            onFocus={(e) => {
              setIsChapterInputFocused(true);
              const target = e.target as HTMLInputElement;
              target.select();
              autoScrollInputToSafePosition(target);
            }}
            onBlur={(e) => {
              setIsChapterInputFocused(false);
              const val = e.target.value.trim();
              const parsed = parseInt(val, 10);
              if (!isNaN(parsed) && parsed >= 1) {
                handleConfirmJump(val);
              } else {
                setChapterInputText(String(viewChapter));
                inputValRef.current = String(viewChapter);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirmJump((e.target as HTMLInputElement).value);
              } else if (e.key === 'Escape') {
                setChapterInputText(String(viewChapter));
                inputValRef.current = String(viewChapter);
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-10 sm:w-11 h-7 sm:h-6 text-center bg-white hover:bg-amber-50/50 focus:bg-white text-amber-950 font-bold font-mono text-[16px] sm:text-xs px-0.5 py-0.5 rounded border border-amber-300 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/70 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all cursor-text shadow-inner shrink-0"
            title={`輸入欲朗讀的${chapterUnit}數，按鍵盤 Enter 或點擊「前往」立即跳轉`}
          />
          <span className="text-amber-700/80 px-0.5 font-sans text-xs shrink-0">/</span>
          <span className="text-amber-900 pr-0.5 text-xs whitespace-nowrap shrink-0">
            {selectedBook.chaptersCount} {chapterUnit}
          </span>

          {/* Dedicated "前往" action button on the same line */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
            }}
            onClick={(e) => {
              e.preventDefault();
              handleConfirmJump();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleConfirmJump();
            }}
            className="ml-0.5 px-1.5 sm:px-2 py-0.5 rounded bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-zinc-950 font-bold text-xs shadow-xs border border-amber-500/70 cursor-pointer whitespace-nowrap active:scale-95 transition-all shrink-0 flex items-center justify-center"
            title="前往指定章節"
          >
            前往
          </button>
        </form>

        {/* 下一章按鈕 */}
        <button
          type="button"
          onClick={handleNextChapter}
          disabled={
            viewChapter >= selectedBook.chaptersCount &&
            BIBLE_BOOKS.findIndex((b) => b.id === selectedBook.id) >= BIBLE_BOOKS.length - 1
          }
          className={`px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-0.5 sm:gap-1 border transition-all shrink-0 whitespace-nowrap ${
            viewChapter >= selectedBook.chaptersCount &&
            BIBLE_BOOKS.findIndex((b) => b.id === selectedBook.id) >= BIBLE_BOOKS.length - 1
              ? 'opacity-30 border-zinc-200 text-zinc-400 cursor-not-allowed bg-zinc-50'
              : 'bg-amber-50/80 border-amber-300/80 text-amber-900 hover:bg-amber-100 hover:border-amber-400 cursor-pointer shadow-xs active:scale-95'
          }`}
          title={`下一${chapterUnit} (向左滑動)`}
        >
          <span className="whitespace-nowrap">下一{chapterUnit}</span>
          <ChevronRight className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        </button>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[99%] xl:max-w-[1500px] 2xl:max-w-[1700px] mx-auto px-1 sm:px-2 md:px-3 pt-0 pb-16 space-y-2 sm:space-y-2.5">
      {/* Hidden Audio Element for FHL MP3 Playback */}
      <audio
        ref={audioRef}
        src={fhlAudio.mp3}
        preload="auto"
        onTimeUpdate={() => {
          if (audioRef.current) {
            setAudioCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setAudioDuration(audioRef.current.duration);
            audioRef.current.playbackRate = playbackSpeedRef.current;
          }
          setIsAudioBuffering(false);
        }}
        onWaiting={() => setIsAudioBuffering(true)}
        onPlaying={() => {
          setIsAudioBuffering(false);
          setIsPlaying(true);
          const currentVerses = activeVersesRef.current;
          const firstV = currentVerses[0];
          saveLastReadRecord({
            bookId: selectedBook.id,
            bookName: bookName,
            chapter: viewChapterRef.current,
            verse: firstV?.verse || 1,
            version: selectedVersion,
            readingMode: readingMode,
            startVerse: readingMode === 'VERSES' ? startVerseNum : undefined,
            endVerse: readingMode === 'VERSES' ? endVerseNum : undefined,
            previewText: firstV ? `第 ${firstV.verse} 節: ${firstV.text.slice(0, 50)}...` : undefined,
          });
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={handleAudioEnded}
        onError={(e) => {
          console.warn('Audio tag loading error:', e);
          setIsAudioBuffering(false);
          setAudioError('音檔載入發生異常');
        }}
      />

      {/* Main Reading Playbar */}
      <div
        id="tier3-playbar"
        className="sticky top-12 z-30 bg-black/95 border-b border-x border-t-0 border-yellow-500/50 p-2 sm:p-2.5 rounded-b-xl sm:rounded-b-2xl shadow-[0_10px_25px_rgba(0,0,0,0.9)] backdrop-blur-lg space-y-1.5 sm:space-y-2"
      >
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Left Playback Control Buttons (手機上 4 個按鈕固定排成同一列) */}
          <div className="grid grid-cols-4 gap-1 sm:flex sm:items-center sm:gap-2 w-full sm:w-auto">
            {/* Main Play/Pause Button */}
            <button
              onClick={handleTogglePlayPause}
              className={`w-full sm:w-auto px-1 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 border transition-all cursor-pointer whitespace-nowrap ${
                isPlaying
                  ? 'bg-amber-400 text-black border-yellow-300 shadow-md shadow-amber-500/30'
                  : 'bg-zinc-900 border-yellow-700/50 text-amber-300 hover:bg-yellow-950 hover:border-amber-400'
              }`}
              title={isPlaying ? '暫停朗讀 (Space)' : '開始朗讀 (Space)'}
            >
              {isAudioBuffering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>載入</span>
                </>
              ) : isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>暫停</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>開始</span>
                </>
              )}
            </button>

            {/* Repeat Mode Toggle */}
            <button
              onClick={() => setIsInfiniteLoop(!isInfiniteLoop)}
              className={`w-full sm:w-auto px-1 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer whitespace-nowrap ${
                isInfiniteLoop
                  ? 'bg-amber-400 text-black border-yellow-300 shadow-md shadow-amber-500/30'
                  : 'bg-zinc-900 border-yellow-700/50 text-amber-300 hover:bg-yellow-950 hover:border-amber-400'
              }`}
              title={isInfiniteLoop ? '循環播放中' : '單次播放'}
            >
              <Repeat className="w-3.5 h-3.5 shrink-0" />
              <span>{isInfiniteLoop ? '循環' : '單次'}</span>
            </button>

            {/* Bookmark Button */}
            <button
              onClick={handleToggleBookmark}
              className={`w-full sm:w-auto px-1 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer whitespace-nowrap ${
                isBookmarkedState
                  ? 'bg-amber-400 text-black border-yellow-300 shadow-md shadow-amber-500/30'
                  : 'bg-zinc-900 border-yellow-700/50 text-amber-300 hover:bg-yellow-950 hover:border-amber-400'
              }`}
              title={isBookmarkedState ? '移除書籤' : '加書籤'}
            >
              <Bookmark className={`w-3.5 h-3.5 shrink-0 ${isBookmarkedState ? 'fill-current text-black' : 'text-amber-400'}`} />
              <span>{isBookmarkedState ? '已加入' : '加書籤'}</span>
            </button>

            {/* Copy Button (移到上方「加書籤」按鈕的右邊，只顯示 icon 及複製) */}
            <button
              onClick={handleCopyUnderlinedVerses}
              className={`w-full sm:w-auto px-1 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer whitespace-nowrap ${
                copyVersesSuccess
                  ? 'bg-amber-400 text-black border-yellow-300 shadow-md shadow-amber-500/30'
                  : 'bg-zinc-900 border-yellow-700/50 text-amber-300 hover:bg-yellow-950 hover:border-amber-400'
              }`}
              title="複製經文"
            >
              {copyVersesSuccess ? (
                <Check className="w-3.5 h-3.5 text-black stroke-[2.5] shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span>複製</span>
            </button>
          </div>
        </div>

        {/* In MP3 Mode: Chapter Audio Progress Bar & Timestamp */}
        {isFhlMp3Mode && (
          <div className="pt-1.5 border-t border-yellow-900/40 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-amber-300 font-bold shrink-0 min-w-[36px]">
                {formatTime(audioCurrentTime)}
              </span>

              <div className="relative flex-1 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={audioDuration || 100}
                  step={0.1}
                  value={audioCurrentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300"
                />
              </div>

              <span className="text-[11px] font-mono text-zinc-400 shrink-0 min-w-[36px] text-right">
                {audioDuration > 0 ? formatTime(audioDuration) : '--:--'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Scripture Verses Display List with Swipe Gesture Support */}
      <div
        id="scripture-container"
        className="bg-white text-zinc-900 border-2 border-amber-300/80 shadow-2xl px-1.5 py-2.5 sm:px-2.5 sm:py-3 md:px-3.5 md:py-4 rounded-xl sm:rounded-2xl min-h-[350px] space-y-2 sm:space-y-2.5 touch-pan-y scroll-mt-48"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {customVerseNumbers && customVerseNumbers.length > 0 && (
          <div className="flex items-center gap-1 text-xs bg-amber-50 border border-amber-300/80 px-2 py-1 rounded-lg text-amber-900 shadow-xs shrink-0 whitespace-nowrap mb-2 w-fit">
            <span className="font-bold text-[11px] sm:text-xs">指定：第 {customVerseNumbers.join(', ')} 節</span>
            <button
              type="button"
              onClick={() => {
                setCustomVerseNumbers(undefined);
                setReadingMode('CHAPTERS');
              }}
              className="text-[11px] underline text-amber-800 hover:text-amber-950 font-bold cursor-pointer ml-1"
              title="切換回整章閱讀"
            >
              顯示全章
            </button>
          </div>
        )}

        {isLoadingVerses && activeVerses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-8 h-8 border-3 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
            <p className="text-amber-800 font-serif text-xs font-medium tracking-wide animate-pulse text-center">
              正在載入『{bookName}』第 {viewChapter} 章經文...
            </p>
          </div>
        ) : activeVerses.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 font-serif italic text-xs">
            無相關經文資料
          </div>
        ) : (
          <div className="space-y-0 relative">
            {isLoadingVerses && (
              <div className="absolute top-0 inset-x-0 bg-amber-500/10 border-b border-amber-400/40 py-1 text-center text-xs text-amber-800 animate-pulse z-10">
                正在更新『{bookName}』第 {viewChapter} 章經文...
              </div>
            )}
            {activeVerses.map((v, idx) => {
              const isActive = isPlaying && currentVerseIndex === idx;
              const sectionSubtitle =
                v.subtitle ||
                (selectedVersion === 'CUV'
                  ? getCuratedSubtitle(selectedBook.id, v.chapter, v.verse)
                  : undefined);

              return (
                <React.Fragment key={`${v.chapter}_${v.verse}_${idx}`}>
                  {/* Canonical Section Subtitle Header (分段小標題 - 獨立尊貴導讀標題條) */}
                  {sectionSubtitle && (
                    <div className="pt-2 pb-1 px-1 mt-1 mb-0.5 flex items-center gap-2 select-text">
                      <span className="w-1.5 h-3 rounded-full bg-gradient-to-b from-amber-500 to-amber-700 shrink-0 shadow-xs select-none"></span>
                      <h4 className="text-amber-900 font-serif font-bold text-xs md:text-sm tracking-wide flex items-center gap-1.5 select-text cursor-text">
                        {normalizeGodTerms(sectionSubtitle)}
                      </h4>
                      <div className="flex-1 h-[1px] bg-gradient-to-r from-amber-400/80 via-amber-200/50 to-transparent select-none"></div>
                    </div>
                  )}

                  {(() => {
                    const isUnderlined = underlinedVerseNums.includes(v.verse);

                    return (
                      <div
                        ref={(el) => {
                          verseRefs.current[idx] = el;
                        }}
                        onClick={(e) => handleVerseClick(v, idx, e)}
                        data-verse-row="true"
                        data-chapter={v.chapter}
                        data-verse={v.verse}
                        className={`py-0.5 px-1 sm:px-1.5 md:py-0.5 rounded transition-all duration-150 relative group select-text cursor-pointer ${
                          isActive
                            ? 'active-verse bg-amber-100/95 border-2 border-amber-500 shadow-sm'
                            : 'bg-white border border-zinc-200/70 hover:border-amber-300 hover:bg-amber-50/40'
                        }`}
                      >
                        <div className="flex items-start gap-1.5 sm:gap-2">
                          {/* Chapter & Verse Badge (可選取、複製，點擊可開啟複製/朗讀選項) */}
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              const sel = window.getSelection();
                              if (!sel || sel.toString().trim().length === 0) {
                                handleOpenCopyModal(v, idx);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleOpenCopyModal(v, idx);
                              }
                            }}
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] md:text-[11px] font-mono font-bold shrink-0 mt-0.5 select-text cursor-pointer transition-transform hover:scale-105 active:scale-95 ${
                              isActive
                                ? 'bg-amber-500 text-black shadow-xs font-extrabold'
                                : isUnderlined
                                ? 'bg-zinc-900 text-amber-200 border border-zinc-700 font-extrabold shadow-xs'
                                : 'bg-amber-100 text-amber-900 border border-amber-300/80 group-hover:border-amber-400 group-hover:bg-amber-200/80'
                            }`}
                            title={`點擊複製或從第 ${v.verse} 節開始朗讀（可拖曳選取經文與節數）`}
                          >
                            <span className="inline-block w-0 max-w-0 opacity-0 overflow-hidden select-text whitespace-nowrap pointer-events-none">
                              {bookName}{' '}
                            </span>
                            <span className="select-text">
                              {v.chapter}:{v.verse}
                            </span>
                          </span>

                          {/* Verse Text (單擊切換細黑色虛線選取，亦可長按任意反白拖曳選取) */}
                          <div className="flex-1 min-w-0 select-text cursor-pointer verse-text-content">
                            <p
                              className={`font-serif tracking-normal transition-all select-text cursor-pointer ${getFontSizeClass()} ${
                                isUnderlined
                                  ? 'underline decoration-black decoration-dashed decoration-1 underline-offset-[3px]'
                                  : ''
                              } ${
                                isActive
                                  ? 'text-zinc-950 font-medium'
                                  : 'text-zinc-800 group-hover:text-zinc-950'
                              }`}
                            >
                              {(() => {
                                const displaySegments =
                                  v.segments && v.segments.length > 0
                                    ? v.segments
                                    : [{ text: v.text, isRed: false }];

                                return displaySegments.map((seg, sIdx) => {
                                  const segText = normalizeGodTerms(seg.text);
                                  return seg.isRed ? (
                                    <span
                                      key={sIdx}
                                      className={`verse-red-letter text-red-600 font-medium select-text cursor-pointer ${
                                        isUnderlined ? 'underline decoration-black decoration-dashed decoration-1 underline-offset-[3px]' : ''
                                      }`}
                                      style={{ color: '#dc2626' }}
                                    >
                                      {segText}
                                    </span>
                                  ) : (
                                    <span key={sIdx} className="select-text cursor-pointer">
                                      {segText}
                                    </span>
                                  );
                                });
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Bottom Chapter Navigation Bar (每章最尾端的右邊，始終顯示在同一列) */}
      </div>

      {/* Scripture Navigation Footer Container */}
      <div className="fixed bottom-0 left-0 w-full z-30 bg-white/95 backdrop-blur-md border-t border-amber-300/80 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] py-2 px-3 sm:px-6 flex items-center justify-end flex-nowrap">
        <div className="max-w-[99%] xl:max-w-[1500px] 2xl:max-w-[1700px] w-full mx-auto flex items-center justify-end flex-nowrap">
          {renderChapterNavBar('bottom')}
        </div>
      </div>

      {/* Copy Verse Confirmation Modal (點選經文複製確認彈窗) */}
      {selectedCopyVerse && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="gold-card max-w-md w-full p-5 rounded-2xl border border-yellow-600/50 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-yellow-800/40 pb-3">
              <h3 className="text-sm md:text-base font-bold text-amber-300 flex items-center gap-2">
                <Copy className="w-4 h-4 text-amber-400" />
                <span>複製經文確認</span>
              </h3>
              <button
                onClick={() => setSelectedCopyVerse(null)}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800/60 transition-colors cursor-pointer"
                title="關閉"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-yellow-500/80 font-medium">是否要複製以下經文？</p>
              <div className="bg-white p-3.5 rounded-xl border border-amber-300/80 text-xs md:text-sm text-zinc-900 leading-relaxed font-serif max-h-48 overflow-y-auto shadow-inner">
                <span className="font-bold text-amber-800 mr-1.5">
                  {bookName} {selectedCopyVerse.chapter}:{selectedCopyVerse.verse}
                </span>
                {(() => {
                  const copySegments =
                    selectedCopyVerse.segments && selectedCopyVerse.segments.length > 0
                      ? selectedCopyVerse.segments
                      : [{ text: selectedCopyVerse.text, isRed: false }];

                  return copySegments.map((seg, sIdx) => {
                    const segText = normalizeGodTerms(seg.text);
                    return seg.isRed ? (
                      <span
                        key={sIdx}
                        className="verse-red-letter text-red-600 font-medium"
                        style={{ color: '#dc2626' }}
                      >
                        {segText}
                      </span>
                    ) : (
                      <span key={sIdx}>{segText}</span>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-yellow-900/40">
              <button
                onClick={handleStartReadingSelected}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-300 border border-amber-500/40 hover:bg-yellow-950/60 flex items-center gap-1.5 transition-all cursor-pointer"
                title="從此節開始朗讀"
              >
                <Play className="w-3.5 h-3.5 text-amber-400" />
                <span>{isFhlMp3Mode ? '開始整章朗讀' : '從此節朗讀'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedCopyVerse(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 hover:bg-zinc-800/60 transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleCopyVerseText}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>已複製！</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>複製經文</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 操作提示 Toast */}
      {actionToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-fade-in pointer-events-none">
          <div className="px-4 py-2 bg-zinc-950/95 border border-amber-400 text-amber-300 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 backdrop-blur-md">
            <Bookmark className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{actionToast}</span>
          </div>
        </div>
      )}
    </div>
  );
};
