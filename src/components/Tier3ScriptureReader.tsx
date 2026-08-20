import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
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
} from 'lucide-react';
import { BibleBook, BibleVersion, ReadingMode, Verse } from '../types';
import { VERSIONS } from '../data/bibleBooks';
import { fixChineseTTSPronunciation } from '../data/dailyVerses';
import { fetchChapterVerses, getFhlChapterAudioUrls } from '../services/bibleService';
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

  // Reset / Restart Playback
  const handleRestart = () => {
    if (isFhlMp3Mode) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setAudioCurrentTime(0);
        if (isPlaying) {
          audioRef.current.play().catch((err) => console.warn(err));
        }
      }
      return;
    }

    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setCurrentVerseIndex(0);
    if (isPlaying) {
      speakVerse(0);
    }
  };

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

  // Double click / double tap handler for verses
  const handleVerseClick = (v: Verse, idx: number) => {
    const now = Date.now();
    const verseKey = `${v.chapter}:${v.verse}`;
    if (lastVerseTapRef.current.id === verseKey && now - lastVerseTapRef.current.time < 450) {
      handleOpenCopyModal(v, idx);
      lastVerseTapRef.current = { id: '', time: 0 };
    } else {
      lastVerseTapRef.current = { id: verseKey, time: now };
    }
  };

  // Copy verse handler
  const handleCopyVerseText = async () => {
    if (!selectedCopyVerse) return;
    const formattedText = `【${bookName} ${selectedCopyVerse.chapter}:${selectedCopyVerse.verse}】${selectedCopyVerse.text}`;
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

            {/* Restart Button */}
            <button
              onClick={handleRestart}
              className="px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-zinc-900 border border-yellow-700/50 text-amber-300 hover:bg-yellow-950 hover:border-amber-400 transition-all cursor-pointer"
              title="重頭開始播放"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">重播</span>
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
              <span>{isBookmarkedState ? '已加入' : '加書籤'}</span>
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
        <div className="flex items-center justify-center sm:justify-end pb-2.5 border-b border-yellow-800/40">
          {/* Chapter Navigation Bar */}
          <div className="flex items-center gap-1.5">
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
          <div className="space-y-0.5">
            {activeVerses.map((v, idx) => {
              const isActive = isPlaying && currentVerseIndex === idx;

              return (
                <div
                  key={`${v.chapter}_${v.verse}_${idx}`}
                  ref={(el) => {
                    verseRefs.current[idx] = el;
                  }}
                  onClick={() => handleVerseClick(v, idx)}
                  className={`py-0.5 px-2 md:py-1 md:px-2.5 rounded-md cursor-pointer transition-all duration-150 relative group touch-manipulation select-none ${
                    isActive
                      ? 'active-verse bg-yellow-950/70 border border-yellow-500/60 shadow-sm shadow-amber-500/10'
                      : 'bg-zinc-900/40 border border-zinc-800/70 hover:border-yellow-600/40 hover:bg-zinc-900/80'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Chapter & Verse Badge */}
                    <span
                      className={`inline-block px-1.5 py-0 rounded text-[11px] font-mono font-bold shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-amber-400 text-black shadow-sm'
                          : 'bg-yellow-950/80 text-amber-300 border border-yellow-700/40 group-hover:border-amber-400'
                      }`}
                    >
                      {v.chapter}:{v.verse}
                    </span>

                    {/* Verse Text */}
                    <div className="flex-1">
                      <p
                        className={`font-serif tracking-normal transition-all ${getFontSizeClass()} ${
                          isActive
                            ? 'text-amber-100 font-normal'
                            : 'text-zinc-200 group-hover:text-amber-200'
                        }`}
                      >
                        {v.text}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
              <div className="bg-zinc-950/90 p-3.5 rounded-xl border border-yellow-900/60 text-xs md:text-sm text-amber-100 leading-relaxed font-serif max-h-48 overflow-y-auto">
                <span className="font-bold text-amber-400 mr-1.5">
                  【{bookName} {selectedCopyVerse.chapter}:{selectedCopyVerse.verse}】
                </span>
                {selectedCopyVerse.text}
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
    </div>
  );
};
