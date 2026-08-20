import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ListOrdered,
  Repeat,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  X,
  Bookmark,
  Loader2,
  Highlighter,
  StickyNote,
  FileEdit,
  Trash2,
  Palette,
  Search,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { BibleBook, BibleVersion, ReadingMode, Verse, HighlightColor, VerseAnnotation } from '../types';
import { VERSIONS } from '../data/bibleBooks';
import { fixChineseTTSPronunciation } from '../data/dailyVerses';
import { fetchChapterVerses, getFhlChapterAudioUrls } from '../services/bibleService';
import { isBookmarked, saveBookmark, removeBookmark, getBookmarkId } from '../services/bookmarkService';
import { saveLastReadRecord } from '../services/lastReadService';
import {
  getChapterAnnotations,
  getAllAnnotations,
  setVerseHighlight,
  setVerseNote,
  deleteAnnotation,
} from '../services/annotationService';

export const HIGHLIGHT_COLORS: {
  id: HighlightColor;
  label: string;
  dotClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
}[] = [
  {
    id: 'yellow',
    label: '亮黃',
    dotClass: 'bg-yellow-400 border-yellow-300 shadow-yellow-500/40',
    bgClass: 'bg-yellow-500/15 border-l-4 border-yellow-400',
    borderClass: 'border-yellow-500/50',
    badgeClass: 'bg-yellow-950 text-yellow-300 border-yellow-500/60',
  },
  {
    id: 'green',
    label: '翠綠',
    dotClass: 'bg-emerald-400 border-emerald-300 shadow-emerald-500/40',
    bgClass: 'bg-emerald-500/15 border-l-4 border-emerald-400',
    borderClass: 'border-emerald-500/50',
    badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-500/60',
  },
  {
    id: 'pink',
    label: '粉紅',
    dotClass: 'bg-pink-400 border-pink-300 shadow-pink-500/40',
    bgClass: 'bg-pink-500/15 border-l-4 border-pink-400',
    borderClass: 'border-pink-500/50',
    badgeClass: 'bg-pink-950 text-pink-300 border-pink-500/60',
  },
  {
    id: 'blue',
    label: '天藍',
    dotClass: 'bg-sky-400 border-sky-300 shadow-sky-500/40',
    bgClass: 'bg-sky-500/15 border-l-4 border-sky-400',
    borderClass: 'border-sky-500/50',
    badgeClass: 'bg-sky-950 text-sky-300 border-sky-500/60',
  },
  {
    id: 'orange',
    label: '暖橘',
    dotClass: 'bg-orange-400 border-orange-300 shadow-orange-500/40',
    bgClass: 'bg-orange-500/15 border-l-4 border-orange-400',
    borderClass: 'border-orange-500/50',
    badgeClass: 'bg-orange-950 text-orange-300 border-orange-500/60',
  },
];

interface Tier3ScriptureReaderProps {
  selectedBook: BibleBook;
  selectedVersion: BibleVersion;
  initialChapter?: number;
  initialVerse?: number;
  initialReadingMode?: ReadingMode;
  initialStartVerse?: number;
  initialEndVerse?: number;
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
}

export const Tier3ScriptureReader: React.FC<Tier3ScriptureReaderProps> = ({
  selectedBook,
  selectedVersion,
  initialChapter,
  initialVerse,
  initialReadingMode,
  initialStartVerse,
  initialEndVerse,
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
    setStartChapter(initCh);
    setTargetChapter(initCh);
    setViewChapter(initCh);

    if (initialReadingMode === 'BOOK') {
      setEndChapter(selectedBook.chaptersCount);
      setReadingMode('BOOK');
    } else if (initialReadingMode === 'CHAPTERS') {
      setEndChapter(initCh);
      setReadingMode('CHAPTERS');
    } else if (initialReadingMode === 'VERSES' || (initialStartVerse !== undefined && initialEndVerse !== undefined)) {
      setEndChapter(initCh);
      setReadingMode('VERSES');
    } else {
      setEndChapter(selectedBook.chaptersCount);
      setReadingMode('CHAPTERS');
    }

    if (initialStartVerse !== undefined) {
      setStartVerseNum(initialStartVerse);
    }
    if (initialEndVerse !== undefined) {
      setEndVerseNum(initialEndVerse);
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
  const [localFontSize, setLocalFontSize] = useState<'normal' | 'large' | 'xlarge'>('large');

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
  const [viewChapter, setViewChapter] = useState<number>(1);

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

  // Highlights & Notes State
  const [chapterAnnotations, setChapterAnnotations] = useState<Record<number, VerseAnnotation>>({});
  const [allAnnotations, setAllAnnotations] = useState<VerseAnnotation[]>([]);
  const [selectedActionVerse, setSelectedActionVerse] = useState<{
    verseObj: Verse;
    index: number;
    initialTab?: 'highlight' | 'note';
  } | null>(null);
  const [actionNoteText, setActionNoteText] = useState<string>('');
  const [noteSaveSuccess, setNoteSaveSuccess] = useState<boolean>(false);
  const [isAnnotationsListOpen, setIsAnnotationsListOpen] = useState<boolean>(false);
  const [annotationsListFilter, setAnnotationsListFilter] = useState<'chapter' | 'book' | 'all'>('chapter');
  const [annotationsSearchQuery, setAnnotationsSearchQuery] = useState<string>('');

  // Reload annotations from localStorage
  const reloadAnnotations = useCallback(() => {
    const chAnn = getChapterAnnotations(selectedVersion, selectedBook.id, viewChapter);
    setChapterAnnotations(chAnn);
    setAllAnnotations(getAllAnnotations());
  }, [selectedVersion, selectedBook.id, viewChapter]);

  useEffect(() => {
    reloadAnnotations();
  }, [reloadAnnotations]);

  // Bookmark state & toggle
  const isVerseMode = readingMode === 'VERSES' || startVerseNum > 1 || endVerseNum < maxVersesForChapter;
  const sV = Math.min(startVerseNum, endVerseNum);
  const eV = Math.max(startVerseNum, endVerseNum);

  const [isBookmarkedState, setIsBookmarkedState] = useState<boolean>(false);

  useEffect(() => {
    setIsBookmarkedState(
      isBookmarked(
        selectedVersion,
        selectedBook.id,
        viewChapter,
        isVerseMode ? 'VERSES' : undefined,
        isVerseMode ? sV : undefined,
        isVerseMode ? eV : undefined
      )
    );
  }, [selectedVersion, selectedBook.id, viewChapter, readingMode, sV, eV]);

  const handleToggleBookmark = () => {
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
      setIsBookmarkedState(false);
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
      setIsBookmarkedState(true);
    }
  };

  // Record last read position to persistent storage
  const recordCurrentReadingPosition = useCallback((verseNum?: number, preview?: string) => {
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
      chapter: viewChapter,
      verse: verseNum,
      version: selectedVersion,
      readingMode: readingMode,
      startVerse: readingMode === 'VERSES' ? startVerseNum : undefined,
      endVerse: readingMode === 'VERSES' ? endVerseNum : undefined,
      previewText: previewContent,
    });
  }, [selectedBook.id, bookName, viewChapter, selectedVersion, readingMode, startVerseNum, endVerseNum, activeVerses]);

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

  useEffect(() => {
    activeVersesRef.current = activeVerses;
  }, [activeVerses]);

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

  // Initialize Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
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

  // Auto-scroll active verse or top verse into view
  useEffect(() => {
    if (activeVerses.length > 0) {
      const targetEl = verseRefs.current[currentVerseIndex] || verseRefs.current[0];
      if (targetEl) {
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [currentVerseIndex, viewChapter, activeVerses.length]);

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
        if (readingMode === 'VERSES' && (sV > 1 || eV < chVerses.length)) {
          resultVerses = chVerses.filter((v) => v.verse >= sV && v.verse <= eV);
        }

        if (!isCancelled) {
          setActiveVerses(resultVerses);
          
          let targetIndex = 0;
          if (initialVerse && initialVerse > 1) {
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

          // Ensure view scrolls to the target verse of the chapter
          setTimeout(() => {
            if (verseRefs.current[targetIndex]) {
              verseRefs.current[targetIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
            } else if (verseRefs.current[0]) {
              verseRefs.current[0]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
            }
          }, 60);

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

  // Touch Swipe Handlers for Chapter Switching (向右滑：上一章, 向左滑：下一章)
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handlePrevChapter = () => {
    if (viewChapter > minChapter) {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      shouldAutoPlayRef.current = isPlaying;
      setViewChapter((prev) => prev - 1);
    }
  };

  const handleNextChapter = () => {
    if (viewChapter < maxChapter) {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      shouldAutoPlayRef.current = isPlaying;
      setViewChapter((prev) => prev + 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartXRef.current;
    const deltaY = touchEndY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

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
        if (viewChapterRef.current < maxChapterRef.current) {
          shouldAutoPlayRef.current = true;
          setViewChapter((prev) => prev + 1);
        } else if (isInfiniteLoopRef.current) {
          if (viewChapterRef.current === minChapterRef.current) {
            setCurrentVerseIndex(0);
            setTimeout(() => {
              speakVerse(0);
            }, 100);
          } else {
            shouldAutoPlayRef.current = true;
            setViewChapter(minChapterRef.current);
          }
        } else {
          setIsPlaying(false);
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
        recordCurrentReadingPosition(verseObj.verse, `第 ${verseObj.verse} 節: ${verseObj.text.slice(0, 50)}...`);
      };

      utterance.onend = () => {
        const nextIndex = index + 1;
        if (nextIndex < currentVerses.length) {
          setCurrentVerseIndex(nextIndex);
          speakVerse(nextIndex);
        } else {
          if (viewChapterRef.current < maxChapterRef.current) {
            shouldAutoPlayRef.current = true;
            setViewChapter((prev) => prev + 1);
          } else if (isInfiniteLoopRef.current) {
            if (viewChapterRef.current === minChapterRef.current) {
              setCurrentVerseIndex(0);
              setTimeout(() => {
                speakVerse(0);
              }, 100);
            } else {
              shouldAutoPlayRef.current = true;
              setViewChapter(minChapterRef.current);
            }
          } else {
            setIsPlaying(false);
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
    [versionInfo.langCode, selectedVersion, bookName, selectedVoiceName, chapterUnit, isPsalm]
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
    if (viewChapterRef.current < maxChapterRef.current) {
      shouldAutoPlayRef.current = true;
      setViewChapter((prev) => prev + 1);
    } else if (isInfiniteLoopRef.current) {
      if (viewChapterRef.current === minChapterRef.current) {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.playbackRate = playbackSpeedRef.current;
          audioRef.current.play().catch((err) => console.warn(err));
        }
      } else {
        shouldAutoPlayRef.current = true;
        setViewChapter(minChapterRef.current);
      }
    } else {
      setIsPlaying(false);
      setAudioCurrentTime(0);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Open action modal for a verse (Highlight, Note, Copy, Read)
  const handleOpenVerseAction = (v: Verse, idx: number, initialTab: 'highlight' | 'note' = 'highlight') => {
    const existingAnnotation = chapterAnnotations[v.verse];
    setSelectedActionVerse({
      verseObj: v,
      index: idx,
      initialTab,
    });
    setActionNoteText(existingAnnotation?.note || '');
    setNoteSaveSuccess(false);
    setCopySuccess(false);
  };

  // Toggle or select highlight color
  const handleSelectHighlightColor = (color: HighlightColor | null) => {
    if (!selectedActionVerse) return;
    const v = selectedActionVerse.verseObj;
    const currentAnn = chapterAnnotations[v.verse];
    const targetColor = currentAnn?.highlightColor === color ? null : color;

    setVerseHighlight({
      version: selectedVersion,
      bookId: selectedBook.id,
      bookName,
      chapter: viewChapter,
      verse: v.verse,
      verseText: v.text,
      color: targetColor,
    });

    reloadAnnotations();
  };

  // Save note for the selected verse
  const handleSaveNote = () => {
    if (!selectedActionVerse) return;
    const v = selectedActionVerse.verseObj;
    setVerseNote({
      version: selectedVersion,
      bookId: selectedBook.id,
      bookName,
      chapter: viewChapter,
      verse: v.verse,
      verseText: v.text,
      note: actionNoteText,
    });

    setNoteSaveSuccess(true);
    reloadAnnotations();
    setTimeout(() => {
      setNoteSaveSuccess(false);
    }, 1500);
  };

  // Delete note for the selected verse
  const handleDeleteNote = () => {
    if (!selectedActionVerse) return;
    const v = selectedActionVerse.verseObj;
    setVerseNote({
      version: selectedVersion,
      bookId: selectedBook.id,
      bookName,
      chapter: viewChapter,
      verse: v.verse,
      verseText: v.text,
      note: null,
    });
    setActionNoteText('');
    reloadAnnotations();
  };

  // Verse click handler - opens the action modal
  const handleVerseClick = (v: Verse, idx: number) => {
    handleOpenVerseAction(v, idx);
  };

  // Copy verse handler
  const handleCopyVerseText = async () => {
    const targetVerse = selectedActionVerse?.verseObj || selectedCopyVerse;
    if (!targetVerse) return;
    const formattedText = `【${bookName} ${targetVerse.chapter}:${targetVerse.verse}】${targetVerse.text}`;
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
      }, 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Read from selected verse
  const handleStartReadingSelected = () => {
    const targetIdx = selectedActionVerse?.index ?? selectedCopyVerse?.index;
    if (targetIdx === undefined) return;
    setSelectedActionVerse(null);
    setSelectedCopyVerse(null);

    if (isFhlMp3Mode) {
      // In FHL MP3 mode, start full MP3 playback
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((err) => console.warn(err));
      }
    } else {
      setCurrentVerseIndex(targetIdx);
      setIsPlaying(true);
      speakVerse(targetIdx);
    }
  };

  // Jump to annotation from list
  const handleJumpToAnnotation = (ann: VerseAnnotation) => {
    setIsAnnotationsListOpen(false);
    if (ann.chapter !== viewChapter) {
      setViewChapter(ann.chapter);
      setTargetChapter(ann.chapter);
    }
    setTimeout(() => {
      const foundIdx = activeVerses.findIndex((v) => v.verse === ann.verse);
      if (foundIdx >= 0 && verseRefs.current[foundIdx]) {
        verseRefs.current[foundIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  };

  // Font size CSS mapping
  const getFontSizeClass = () => {
    if (fontSize === 'normal') return 'text-sm md:text-base leading-snug';
    if (fontSize === 'large') return 'text-base md:text-lg leading-snug';
    return 'text-lg md:text-xl leading-normal';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 space-y-3">
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
          recordCurrentReadingPosition(1);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={handleAudioEnded}
        onError={(e) => {
          console.warn('Audio tag loading error:', e);
          setIsAudioBuffering(false);
          setAudioError('音檔載入發生異常');
        }}
      />

      {/* TIER 3 (1) 朗讀模式選擇器 */}
      <div className="gold-card p-2.5 rounded-xl space-y-1.5">
        <div className="flex items-center justify-between pb-1 border-b border-yellow-800/40">
          <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs md:text-sm">
            <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
            <span>朗讀模式設定 (Reading Mode)</span>
          </div>
        </div>

        {/* 範圍/章/節 控制區 */}
        <div className="bg-black/60 p-2 rounded-lg space-y-1.5">
          {/* 章 / 篇 */}
          <div className="flex items-center gap-2 text-xs flex-nowrap overflow-x-auto">
            <span className="font-bold text-amber-200 shrink-0 w-8">{chapterUnit}：</span>
            <select
              value={startChapter}
              onChange={(e) => {
                const val = Number(e.target.value);
                setStartChapter(val);
                if (val > endChapter) setEndChapter(val);
                setViewChapter(val);
                setTargetChapter(val);
                setReadingMode('CHAPTERS');
              }}
              className="bg-zinc-900 border border-yellow-600/50 rounded px-2 py-0.5 text-amber-200 font-bold text-xs focus:border-amber-400 shrink-0 cursor-pointer"
            >
              {Array.from({ length: selectedBook.chaptersCount }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  第 {i + 1} {chapterUnit}
                </option>
              ))}
            </select>

            <span className="text-yellow-600 font-bold shrink-0 px-1">至</span>

            <select
              value={endChapter}
              onChange={(e) => {
                const val = Number(e.target.value);
                setEndChapter(val);
                if (val < startChapter) setStartChapter(val);
                setReadingMode('CHAPTERS');
              }}
              className="bg-zinc-900 border border-yellow-600/50 rounded px-2 py-0.5 text-amber-200 font-bold text-xs focus:border-amber-400 shrink-0 cursor-pointer"
            >
              {Array.from({ length: selectedBook.chaptersCount }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  第 {i + 1} {chapterUnit}
                </option>
              ))}
            </select>
          </div>

          {/* 節 */}
          <div className="flex items-center gap-2 text-xs flex-nowrap overflow-x-auto">
            <span className="font-bold text-amber-200 shrink-0 w-8">節：</span>
            <select
              value={startVerseNum}
              onChange={(e) => {
                const val = Number(e.target.value);
                setStartVerseNum(val);
                if (val > endVerseNum) setEndVerseNum(val);
                setReadingMode('VERSES');
              }}
              className="bg-zinc-900 border border-yellow-600/50 rounded px-2 py-0.5 text-amber-200 font-bold text-xs focus:border-amber-400 shrink-0 cursor-pointer"
            >
              {Array.from({ length: maxVersesForChapter }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  第 {i + 1} 節
                </option>
              ))}
            </select>

            <span className="text-yellow-600 font-bold shrink-0 px-1">至</span>

            <select
              value={endVerseNum}
              onChange={(e) => {
                const val = Number(e.target.value);
                setEndVerseNum(val);
                if (val < startVerseNum) setStartVerseNum(val);
                setReadingMode('VERSES');
              }}
              className="bg-zinc-900 border border-yellow-600/50 rounded px-2 py-0.5 text-amber-200 font-bold text-xs focus:border-amber-400 shrink-0 cursor-pointer"
            >
              {Array.from({ length: maxVersesForChapter }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  第 {i + 1} 節
                </option>
              ))}
            </select>

            {readingMode === 'VERSES' && (
              <span className="text-[11px] text-yellow-500/80 italic ml-auto hidden sm:inline-block">
                （指定節數模式使用逐節語音朗讀）
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Reading Playbar */}
      <div className="sticky top-12 z-30 bg-black/95 border border-yellow-500/50 p-2.5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.9)] backdrop-blur-lg space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left Playback Control Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Main Play/Pause Button */}
            <button
              onClick={handleTogglePlayPause}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-amber-400 text-black border-yellow-300 shadow-md shadow-amber-500/30'
                  : 'bg-zinc-900 border-yellow-700/50 text-amber-300 hover:bg-yellow-950 hover:border-amber-400'
              }`}
              title={isPlaying ? '暫停朗讀 (Space)' : '開始朗讀 (Space)'}
            >
              {isAudioBuffering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>載入中...</span>
                </>
              ) : isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>暫停</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>開始</span>
                </>
              )}
            </button>

            {/* Repeat Mode Toggle */}
            <button
              onClick={() => setIsInfiniteLoop(!isInfiniteLoop)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                isInfiniteLoop
                  ? 'bg-amber-400 text-black border-yellow-300 shadow-md shadow-amber-500/30'
                  : 'bg-zinc-900 border-yellow-700/50 text-amber-300 hover:bg-yellow-950 hover:border-amber-400'
              }`}
              title={isInfiniteLoop ? '循環播放中' : '單次播放'}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>{isInfiniteLoop ? '循環' : '單次'}</span>
            </button>

            {/* Bookmark Button */}
            <button
              onClick={handleToggleBookmark}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                isBookmarkedState
                  ? 'bg-amber-400 text-black border-yellow-300 shadow-md shadow-amber-500/30'
                  : 'bg-zinc-900 border-yellow-700/50 text-amber-300 hover:bg-yellow-950 hover:border-amber-400'
              }`}
              title={isBookmarkedState ? '移除書籤' : '加書籤'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarkedState ? 'fill-current text-black' : 'text-amber-400'}`} />
              <span>{isBookmarkedState ? '已加' : '書籤'}</span>
            </button>

            {/* Annotations & Notes List Button */}
            <button
              onClick={() => {
                setAnnotationsListFilter('chapter');
                setIsAnnotationsListOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-yellow-700/50 bg-zinc-900 text-amber-300 hover:bg-yellow-950 hover:border-amber-400 transition-all cursor-pointer"
              title="查看螢光筆劃線與經文筆記"
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-400" />
              <span>劃線</span>
              {Object.keys(chapterAnnotations).length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[10px] font-extrabold font-mono">
                  {Object.keys(chapterAnnotations).length}
                </span>
              )}
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
        className="gold-card p-3 md:p-4 rounded-xl min-h-[350px] space-y-2 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between pb-2.5 border-b border-yellow-800/40">
          <div className="flex items-center gap-2 text-xs text-yellow-500/80 font-sans">
            <span className="hidden sm:inline">💡 點選任一經文即可進行『螢光筆劃線』或『加入筆記』</span>
            <span className="sm:hidden">💡 點選經文劃線/加筆記</span>
          </div>

          {/* Chapter Navigation Bar */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handlePrevChapter}
              disabled={viewChapter <= minChapter}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all ${
                viewChapter <= minChapter
                  ? 'opacity-30 border-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-900 border-yellow-700/50 text-amber-300 hover:bg-yellow-950 hover:border-amber-400 cursor-pointer'
              }`}
              title={`上一${chapterUnit} (向右滑動)`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>上一{chapterUnit}</span>
            </button>

            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-yellow-950/80 border border-yellow-600/40 rounded-lg text-amber-200">
              {viewChapter} / {maxChapter} {chapterUnit}
            </span>

            <button
              onClick={handleNextChapter}
              disabled={viewChapter >= maxChapter}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all ${
                viewChapter >= maxChapter
                  ? 'opacity-30 border-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-900 border-yellow-700/50 text-amber-300 hover:bg-yellow-950 hover:border-amber-400 cursor-pointer'
              }`}
              title={`下一${chapterUnit} (向左滑動)`}
            >
              <span>下一{chapterUnit}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isLoadingVerses ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-8 h-8 border-3 border-yellow-600/30 border-t-amber-400 rounded-full animate-spin" />
            <p className="text-amber-300 font-serif text-xs tracking-wide animate-pulse">
              正在載入『{bookName}』正統聖經經文...
            </p>
          </div>
        ) : activeVerses.length === 0 ? (
          <div className="text-center py-12 text-yellow-500/60 font-serif italic text-xs">
            無相關經文資料
          </div>
        ) : (
          <div className="space-y-1">
            {activeVerses.map((v, idx) => {
              const isActive = isPlaying && currentVerseIndex === idx;
              const annotation = chapterAnnotations[v.verse];
              const highlightColor = annotation?.highlightColor;
              const highlightDef = highlightColor ? HIGHLIGHT_COLORS.find((c) => c.id === highlightColor) : null;

              return (
                <div
                  key={`${v.chapter}_${v.verse}_${idx}`}
                  ref={(el) => {
                    verseRefs.current[idx] = el;
                  }}
                  onClick={() => handleVerseClick(v, idx)}
                  className={`py-1.5 px-2.5 md:py-2 md:px-3 rounded-lg cursor-pointer transition-all duration-150 relative group touch-manipulation select-none ${
                    isActive
                      ? 'active-verse bg-yellow-950/80 border border-yellow-500/80 shadow-md shadow-amber-500/20'
                      : highlightDef
                      ? `${highlightDef.bgClass} ${highlightDef.borderClass} border hover:brightness-110 shadow-sm`
                      : 'bg-zinc-900/40 border border-zinc-800/70 hover:border-yellow-600/50 hover:bg-zinc-900/80'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Chapter & Verse Badge */}
                    <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-mono font-bold shrink-0 ${
                          isActive
                            ? 'bg-amber-400 text-black shadow-sm'
                            : highlightDef
                            ? `${highlightDef.badgeClass} border`
                            : 'bg-yellow-950/80 text-amber-300 border border-yellow-700/40 group-hover:border-amber-400'
                        }`}
                      >
                        {v.chapter}:{v.verse}
                      </span>
                      {highlightDef && (
                        <span className={`w-2 h-2 rounded-full ${highlightDef.dotClass} shrink-0`} title={`已劃線：${highlightDef.label}`} />
                      )}
                    </div>

                    {/* Verse Text & Note Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-serif tracking-normal transition-all ${getFontSizeClass()} ${
                          isActive
                            ? 'text-amber-100 font-normal'
                            : highlightDef
                            ? 'text-amber-50 font-normal'
                            : 'text-zinc-200 group-hover:text-amber-100'
                        }`}
                      >
                        {v.text}
                      </p>

                      {/* Attached Note Preview Card */}
                      {annotation?.note && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenVerseAction(v, idx, 'note');
                          }}
                          className="mt-2 p-2.5 rounded-lg bg-black/60 border border-amber-500/40 hover:border-amber-400 text-amber-100 text-xs flex items-start justify-between gap-2 shadow-inner group/note cursor-pointer transition-all"
                        >
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <StickyNote className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <p className="font-sans whitespace-pre-wrap leading-relaxed break-words text-[12px] text-amber-200">
                              {annotation.note}
                            </p>
                          </div>
                          <span className="text-[10px] text-amber-400/80 group-hover/note:text-amber-300 font-bold shrink-0 underline">
                            編輯
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick Hover/Tap Tool Indicator */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center gap-1 shrink-0">
                      <span className="p-1 rounded bg-zinc-800/80 text-amber-300 hover:text-amber-200 border border-yellow-700/40">
                        <Highlighter className="w-3 h-3" />
                      </span>
                      <span className="p-1 rounded bg-zinc-800/80 text-amber-300 hover:text-amber-200 border border-yellow-700/40">
                        <FileEdit className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Verse Action Modal (經文螢光筆劃線、加入筆記、複製、朗讀操作彈窗) */}
      {selectedActionVerse && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="gold-card max-w-lg w-full p-5 rounded-2xl border border-yellow-600/60 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-yellow-800/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-black text-xs font-mono font-bold">
                  {selectedActionVerse.verseObj.chapter}:{selectedActionVerse.verseObj.verse}
                </span>
                <h3 className="text-sm md:text-base font-bold text-amber-300">
                  {bookName} 第 {selectedActionVerse.verseObj.chapter} {chapterUnit} 第 {selectedActionVerse.verseObj.verse} 節
                </h3>
              </div>
              <button
                onClick={() => setSelectedActionVerse(null)}
                className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                title="關閉"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scripture Preview Box */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-yellow-500/80">經文內容</span>
              <div
                className={`p-3 rounded-xl border font-serif text-xs md:text-sm leading-relaxed ${
                  chapterAnnotations[selectedActionVerse.verseObj.verse]?.highlightColor
                    ? `${
                        HIGHLIGHT_COLORS.find(
                          (c) => c.id === chapterAnnotations[selectedActionVerse.verseObj.verse]?.highlightColor
                        )?.bgClass
                      } ${
                        HIGHLIGHT_COLORS.find(
                          (c) => c.id === chapterAnnotations[selectedActionVerse.verseObj.verse]?.highlightColor
                        )?.borderClass
                      } text-amber-50`
                    : 'bg-zinc-950/80 border-yellow-900/60 text-zinc-200'
                }`}
              >
                {selectedActionVerse.verseObj.text}
              </div>
            </div>

            {/* Highlighter Color Palette (螢光筆劃線) */}
            <div className="space-y-2 pt-1 border-t border-yellow-900/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Highlighter className="w-3.5 h-3.5 text-amber-400" />
                  <span>螢光筆劃線顏色</span>
                </div>
                {chapterAnnotations[selectedActionVerse.verseObj.verse]?.highlightColor && (
                  <button
                    onClick={() => handleSelectHighlightColor(null)}
                    className="text-[11px] text-zinc-400 hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>清除劃線</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {HIGHLIGHT_COLORS.map((c) => {
                  const isSelected =
                    chapterAnnotations[selectedActionVerse.verseObj.verse]?.highlightColor === c.id;

                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelectHighlightColor(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 text-black border-yellow-300 ring-2 ring-amber-400/50 shadow-md'
                          : 'bg-zinc-900 text-zinc-200 border-zinc-700 hover:border-yellow-500 hover:bg-zinc-800'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${c.dotClass} shrink-0`} />
                      <span>{c.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note Editor (經文筆記) */}
            <div className="space-y-2 pt-2 border-t border-yellow-900/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <StickyNote className="w-3.5 h-3.5 text-amber-400" />
                  <span>經文筆記 / 靈修心得</span>
                </div>
                {chapterAnnotations[selectedActionVerse.verseObj.verse]?.note && (
                  <button
                    onClick={handleDeleteNote}
                    className="text-[11px] text-zinc-400 hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>刪除筆記</span>
                  </button>
                )}
              </div>

              <textarea
                value={actionNoteText}
                onChange={(e) => setActionNoteText(e.target.value)}
                placeholder="在此輸入此節經文的心得、註解、禱告回應或啟示..."
                rows={3}
                className="w-full bg-zinc-950 border border-yellow-600/40 focus:border-amber-400 rounded-xl p-3 text-xs md:text-sm text-amber-100 placeholder-zinc-500 font-sans focus:outline-none transition-all resize-none shadow-inner"
              />

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">
                  {actionNoteText.length > 0 ? `${actionNoteText.length} 字` : '未輸入筆記內容'}
                </span>

                <button
                  onClick={handleSaveNote}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    noteSaveSuccess
                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black font-bold shadow-md shadow-amber-500/20'
                  }`}
                >
                  {noteSaveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>筆記已儲存！</span>
                    </>
                  ) : (
                    <>
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>儲存筆記</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Action Footer (複製與朗讀) */}
            <div className="flex items-center justify-between pt-3 border-t border-yellow-900/40">
              <button
                onClick={handleStartReadingSelected}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-amber-300 border border-amber-500/40 hover:bg-yellow-950/60 flex items-center gap-1.5 transition-all cursor-pointer"
                title="從此節開始朗讀"
              >
                <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>{isFhlMp3Mode ? '開始整章朗讀' : '從此節朗讀'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyVerseText}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-amber-200 border border-zinc-700/60 hover:bg-zinc-800/60 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>已複製！</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>複製經文</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSelectedActionVerse(null)}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all cursor-pointer"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Annotations & Notes List Modal (劃線與筆記清單彈窗) */}
      {isAnnotationsListOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="gold-card max-w-2xl w-full p-5 rounded-2xl border border-yellow-600/60 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-yellow-800/40 pb-3 shrink-0">
              <h3 className="text-sm md:text-base font-bold text-amber-300 flex items-center gap-2">
                <Highlighter className="w-4 h-4 text-amber-400" />
                <span>聖經螢光筆劃線與筆記清單</span>
              </h3>
              <button
                onClick={() => setIsAnnotationsListOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                title="關閉"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="space-y-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-yellow-900/40 overflow-x-auto">
                <button
                  onClick={() => setAnnotationsListFilter('chapter')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    annotationsListFilter === 'chapter'
                      ? 'bg-amber-400 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-amber-200'
                  }`}
                >
                  本{chapterUnit} (第 {viewChapter} {chapterUnit})
                </button>
                <button
                  onClick={() => setAnnotationsListFilter('book')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    annotationsListFilter === 'book'
                      ? 'bg-amber-400 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-amber-200'
                  }`}
                >
                  全書卷 ({bookName})
                </button>
                <button
                  onClick={() => setAnnotationsListFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    annotationsListFilter === 'all'
                      ? 'bg-amber-400 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-amber-200'
                  }`}
                >
                  全部筆記與劃線 ({allAnnotations.length})
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={annotationsSearchQuery}
                  onChange={(e) => setAnnotationsSearchQuery(e.target.value)}
                  placeholder="搜尋筆記內容或經文關鍵字..."
                  className="w-full bg-zinc-950 border border-yellow-900/60 focus:border-amber-400 rounded-lg pl-8 pr-3 py-1.5 text-xs text-amber-100 placeholder-zinc-600 focus:outline-none"
                />
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px]">
              {(() => {
                let filtered = allAnnotations;

                if (annotationsListFilter === 'chapter') {
                  filtered = filtered.filter(
                    (a) => a.bookId === selectedBook.id && a.chapter === viewChapter && a.version === selectedVersion
                  );
                } else if (annotationsListFilter === 'book') {
                  filtered = filtered.filter(
                    (a) => a.bookId === selectedBook.id && a.version === selectedVersion
                  );
                }

                if (annotationsSearchQuery.trim()) {
                  const query = annotationsSearchQuery.toLowerCase();
                  filtered = filtered.filter(
                    (a) =>
                      a.note?.toLowerCase().includes(query) ||
                      a.verseText?.toLowerCase().includes(query) ||
                      a.bookName?.toLowerCase().includes(query)
                  );
                }

                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500 space-y-2">
                      <Highlighter className="w-8 h-8 opacity-40 text-amber-500" />
                      <p className="text-xs">
                        {annotationsSearchQuery.trim()
                          ? '找不到符合條件的劃線或筆記'
                          : '尚無任何劃線或筆記紀錄，點選經文即可加入！'}
                      </p>
                    </div>
                  );
                }

                return filtered.map((ann) => {
                  const hlDef = ann.highlightColor ? HIGHLIGHT_COLORS.find((c) => c.id === ann.highlightColor) : null;

                  return (
                    <div
                      key={ann.id}
                      className="p-3 rounded-xl bg-zinc-950/80 border border-yellow-900/50 hover:border-amber-400/60 transition-all space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-300 text-xs">
                            {ann.bookName} 第 {ann.chapter} 章 第 {ann.verse} 節
                          </span>
                          {hlDef && (
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${hlDef.badgeClass}`}>
                              {hlDef.label}劃線
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleJumpToAnnotation(ann)}
                            className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="前往此經節"
                          >
                            <span>前往</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              deleteAnnotation(ann.id);
                              reloadAnnotations();
                            }}
                            className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="刪除紀錄"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Verse Text */}
                      {ann.verseText && (
                        <p className="text-xs text-zinc-400 font-serif line-clamp-2">
                          {ann.verseText}
                        </p>
                      )}

                      {/* Note snippet */}
                      {ann.note && (
                        <div className="p-2 rounded-lg bg-yellow-950/40 border border-amber-500/30 text-xs text-amber-100 flex items-start gap-1.5">
                          <StickyNote className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <p className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed">
                            {ann.note}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
