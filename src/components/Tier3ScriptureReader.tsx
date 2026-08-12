import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ArrowLeft,
  Home,
  Volume2,
  VolumeX,
  Settings,
  BookOpen,
  ListOrdered,
  Repeat,
  Sliders,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { BibleBook, BibleVersion, ReadingMode, Verse } from '../types';
import { VERSIONS } from '../data/bibleBooks';
import { fetchChapterVerses } from '../services/bibleService';

interface Tier3ScriptureReaderProps {
  selectedBook: BibleBook;
  selectedVersion: BibleVersion;
  onGoBackToTier2: () => void;
  onGoHome: () => void;
  onOpenSettings?: () => void;
  playbackSpeed?: number;
  setPlaybackSpeed?: (speed: number) => void;
  fontSize?: 'normal' | 'large' | 'xlarge';
  setFontSize?: (size: 'normal' | 'large' | 'xlarge') => void;
  selectedVoiceName?: string;
}

export const Tier3ScriptureReader: React.FC<Tier3ScriptureReaderProps> = ({
  selectedBook,
  selectedVersion,
  onGoBackToTier2,
  onGoHome,
  onOpenSettings,
  playbackSpeed: propSpeed,
  setPlaybackSpeed: propSetSpeed,
  fontSize: propFontSize,
  setFontSize: propSetFontSize,
  selectedVoiceName = '',
}) => {
  const versionInfo = VERSIONS[selectedVersion];
  const bookName = selectedBook.name[selectedVersion];

  // Mode Selection:
  // 1) 全卷重複朗讀 (BOOK)
  // 2) 重複朗讀幾章 (CHAPTERS)
  // 3) 重複朗讀某章內的某幾節 (VERSES)
  const [readingMode, setReadingMode] = useState<ReadingMode>('CHAPTERS');

  // Chapter & Verse selections
  const [startChapter, setStartChapter] = useState<number>(1);
  const [endChapter, setEndChapter] = useState<number>(
    selectedBook.chaptersCount
  );

  useEffect(() => {
    setStartChapter(1);
    setEndChapter(selectedBook.chaptersCount);
    setTargetChapter(1);
    setViewChapter(1);
  }, [selectedBook]);

  const [targetChapter, setTargetChapter] = useState<number>(1);
  const [startVerseNum, setStartVerseNum] = useState<number>(1);
  const [endVerseNum, setEndVerseNum] = useState<number>(31);
  const [maxVersesForChapter, setMaxVersesForChapter] = useState<number>(31);

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
          setStartVerseNum(1);
          setEndVerseNum(totalCount);
        }
      } catch (err) {
        console.warn('Error fetching chapter verses count:', err);
      }
    };

    updateVerseBounds();

    return () => {
      isCancelled = true;
    };
  }, [targetChapter, selectedBook.id, bookName, selectedVersion]);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState<number>(0);
  const [localPlaybackSpeed, setLocalPlaybackSpeed] = useState<number>(1.0);
  const [isInfiniteLoop, setIsInfiniteLoop] = useState<boolean>(false);
  const [localFontSize, setLocalFontSize] = useState<'normal' | 'large' | 'xlarge'>('large');

  const playbackSpeed = propSpeed ?? localPlaybackSpeed;
  const setPlaybackSpeed = propSetSpeed ?? setLocalPlaybackSpeed;
  const fontSize = propFontSize ?? localFontSize;
  const setFontSize = propSetFontSize ?? setLocalFontSize;

  // Currently loaded verses array for display
  const [activeVerses, setActiveVerses] = useState<Verse[]>([]);
  const [isLoadingVerses, setIsLoadingVerses] = useState<boolean>(true);

  // Copy Verse Confirmation Modal State
  const [selectedCopyVerse, setSelectedCopyVerse] = useState<{
    chapter: number;
    verse: number;
    text: string;
    index: number;
  } | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const lastVerseTapRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });

  // Currently displayed chapter number (page by page)
  const [viewChapter, setViewChapter] = useState<number>(1);

  // Swipe gesture touch positions
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Continuation ref when switching chapter during continuous playback
  const shouldAutoPlayRef = useRef<boolean>(false);

  // Refs for Speech Synthesis and Auto-scrolling
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const verseRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Min & Max Chapter bounds based on reading mode
  const minChapter = React.useMemo(() => {
    if (readingMode === 'BOOK') return 1;
    if (readingMode === 'CHAPTERS') return Math.min(startChapter, endChapter);
    return targetChapter;
  }, [readingMode, startChapter, endChapter, targetChapter]);

  const maxChapter = React.useMemo(() => {
    if (readingMode === 'BOOK') return selectedBook.chaptersCount;
    if (readingMode === 'CHAPTERS') return Math.max(startChapter, endChapter);
    return targetChapter;
  }, [readingMode, startChapter, endChapter, targetChapter, selectedBook.chaptersCount]);

  // Sync viewChapter within valid min/max bounds when readingMode or chapter selectors change
  useEffect(() => {
    if (readingMode === 'BOOK') {
      setViewChapter(1);
    } else if (readingMode === 'CHAPTERS') {
      const sCh = Math.min(startChapter, endChapter);
      setViewChapter(sCh);
    } else if (readingMode === 'VERSES') {
      setViewChapter(targetChapter);
    }
  }, [readingMode, startChapter, endChapter, targetChapter]);

  // Refs to keep track of freshest state inside audio callbacks
  const activeVersesRef = useRef<Verse[]>([]);
  const viewChapterRef = useRef<number>(1);
  const minChapterRef = useRef<number>(1);
  const maxChapterRef = useRef<number>(1);
  const isInfiniteLoopRef = useRef<boolean>(false);
  const playbackSpeedRef = useRef<number>(1.0);

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
  }, [playbackSpeed]);

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
        if (readingMode === 'VERSES') {
          const sV = Math.min(startVerseNum, endVerseNum);
          const eV = Math.max(startVerseNum, endVerseNum);
          resultVerses = chVerses.filter((v) => v.verse >= sV && v.verse <= eV);
        }

        if (!isCancelled) {
          setActiveVerses(resultVerses);
          setCurrentVerseIndex(0);
          setIsLoadingVerses(false);

          if (synthRef.current) {
            synthRef.current.cancel();
          }

          if (shouldAutoPlayRef.current) {
            shouldAutoPlayRef.current = false;
            setIsPlaying(true);
            setTimeout(() => {
              speakVerse(0);
            }, 80);
          } else {
            setIsPlaying(false);
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
  ]);

  // Prev / Next Chapter Handlers
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

  // Touch Swipe Handlers for Chapter Switching (向右滑：上一章, 向左滑：下一章)
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

    // Check if horizontal swipe is dominant and beyond threshold (50px)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        // Swiped Left -> Next Chapter (向左滑動顯示下一章)
        handleNextChapter();
      } else {
        // Swiped Right -> Previous Chapter (向右滑動顯示上一章)
        handlePrevChapter();
      }
    }
  };

  // Handle Speech for a given verse index
  const speakVerse = useCallback(
    (index: number) => {
      const currentVerses = activeVersesRef.current;
      if (!synthRef.current || index < 0 || index >= currentVerses.length) {
        // Reached end of current chapter verses
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

      // Cancel ongoing utterance if currently speaking
      if (synthRef.current.speaking || synthRef.current.pending) {
        synthRef.current.cancel();
      }

      const verseObj = currentVerses[index];
      if (!verseObj) {
        setIsPlaying(false);
        return;
      }

      // Construct spoken text: 只有在每章第1節（index 0 且 verse === 1）時前置唸出「書卷名稱」與「第幾章」
      // 自第2節起（或非章首），不用唸書卷名與章節，只唸內文經文
      const isChapterStart = index === 0 && verseObj.verse === 1;
      let speechText = '';
      if (isChapterStart) {
        if (selectedVersion === 'KJV') {
          speechText = `${bookName}, Chapter ${verseObj.chapter}. ${verseObj.text}`;
        } else if (selectedVersion === 'LBS') {
          speechText = `${bookName}, Chapitre ${verseObj.chapter}. ${verseObj.text}`;
        } else {
          speechText = `${bookName}第${verseObj.chapter}章。${verseObj.text}`;
        }
      } else {
        speechText = verseObj.text;
      }

      const utterance = new SpeechSynthesisUtterance(speechText);

      // Set Language
      utterance.lang = versionInfo.langCode || 'zh-TW';
      utterance.rate = playbackSpeedRef.current;

      // Find matching voice if available
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
        // Scroll verse into view
        if (verseRefs.current[index]) {
          verseRefs.current[index]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      };

      utterance.onend = () => {
        const nextIndex = index + 1;
        if (nextIndex < currentVerses.length) {
          setCurrentVerseIndex(nextIndex);
          speakVerse(nextIndex);
        } else {
          // Reached end of chapter
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
        // Ignore canceled and interrupted errors on mobile browsers
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          setIsPlaying(false);
        }
      };

      currentUtteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    },
    [versionInfo.langCode, selectedVersion, bookName, selectedVoiceName]
  );

  // Play button handler (1. 按下「朗讀」鍵可自動朗讀)
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    if (!synthRef.current) return;

    if (synthRef.current.paused && synthRef.current.speaking) {
      synthRef.current.resume();
      return;
    }

    speakVerse(currentVerseIndex);
  }, [speakVerse, currentVerseIndex]);

  // Pause button handler (2. 按下「暫停鍵」則暫停朗讀)
  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (!synthRef.current) return;
    synthRef.current.cancel();
  }, []);

  // Toggle Play/Pause
  const handleTogglePlayPause = useCallback(() => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [isPlaying, handlePause, handlePlay]);

  // Keyboard listener for Spacebar toggle play/pause (按下空白鍵等同按下暫停/播放按鈕)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        const target = e.target as HTMLElement;
        // Don't trigger when user is typing in text inputs or textareas
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

  // Reset to verse 0
  const handleRestart = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setCurrentVerseIndex(0);
    if (isPlaying) {
      speakVerse(0);
    }
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

  // Double click / double tap handler for verses (連續點擊兩次經文才會觸發，防止滑動或單擊誤觸)
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
    setCurrentVerseIndex(idx);
    setIsPlaying(true);
    speakVerse(idx);
  };

  // Font size CSS mapping with tighter line spacing (簡化與緊湊行距)
  const getFontSizeClass = () => {
    if (fontSize === 'normal') return 'text-sm md:text-base leading-snug';
    if (fontSize === 'large') return 'text-base md:text-lg leading-snug';
    return 'text-lg md:text-xl leading-normal';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 space-y-3">
      {/* TIER 3 (1) 朗讀模式選擇器 */}
      <div className="gold-card p-3.5 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-yellow-800/40">
          <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs md:text-sm">
            <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
            <span>朗讀模式設定 (Reading Mode)</span>
          </div>
        </div>

        {/* 2 Radio Mode Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Mode 1: 重複朗讀幾章 */}
          <button
            onClick={() => setReadingMode('CHAPTERS')}
            className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
              readingMode === 'CHAPTERS'
                ? 'bg-yellow-950/80 border-amber-400 text-amber-200 shadow-md'
                : 'bg-zinc-900/80 border-yellow-900/40 text-zinc-400 hover:border-yellow-600/50 hover:text-amber-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-amber-100">
                1）重複朗讀幾章
              </span>
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </button>

          {/* Mode 2: 重複朗讀某章內的某幾節 */}
          <button
            onClick={() => setReadingMode('VERSES')}
            className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
              readingMode === 'VERSES'
                ? 'bg-yellow-950/80 border-amber-400 text-amber-200 shadow-md'
                : 'bg-zinc-900/80 border-yellow-900/40 text-zinc-400 hover:border-yellow-600/50 hover:text-amber-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-amber-100">
                2）重複朗讀某章內的某幾節
              </span>
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </button>
        </div>

        {/* Mode Specific Controls & Scope Selectors */}
        <div className="mt-1 pt-1.5 border-t border-yellow-900/40 bg-black/60 px-2.5 py-1 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {readingMode === 'CHAPTERS' && (
              <div className="col-start-1 flex items-center justify-start gap-1 text-xs flex-nowrap overflow-x-auto">
                <span className="font-bold text-amber-200 shrink-0">範圍：</span>
                <select
                  value={startChapter}
                  onChange={(e) => setStartChapter(Number(e.target.value))}
                  className="bg-zinc-900 border border-yellow-600/50 rounded px-1.5 py-0.5 text-amber-200 font-bold text-xs focus:border-amber-400 shrink-0 cursor-pointer"
                >
                  {Array.from({ length: selectedBook.chaptersCount }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      第 {i + 1} 章
                    </option>
                  ))}
                </select>

                <span className="text-yellow-600 font-bold shrink-0 px-0.5">至</span>

                <select
                  value={endChapter}
                  onChange={(e) => setEndChapter(Number(e.target.value))}
                  className="bg-zinc-900 border border-yellow-600/50 rounded px-1.5 py-0.5 text-amber-200 font-bold text-xs focus:border-amber-400 shrink-0 cursor-pointer"
                >
                  {Array.from({ length: selectedBook.chaptersCount }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      第 {i + 1} 章
                    </option>
                  ))}
                </select>
              </div>
            )}

            {readingMode === 'VERSES' && (
              <div className="col-start-1 md:col-start-2 flex items-center justify-start gap-1 text-xs flex-nowrap overflow-x-auto">
                <select
                  value={targetChapter}
                  onChange={(e) => setTargetChapter(Number(e.target.value))}
                  className="bg-zinc-900 border border-yellow-600/50 rounded px-1.5 py-0.5 text-amber-200 font-bold text-xs focus:border-amber-400 shrink-0 cursor-pointer"
                >
                  {Array.from({ length: selectedBook.chaptersCount }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      第 {i + 1} 章
                    </option>
                  ))}
                </select>

                <select
                  value={startVerseNum}
                  onChange={(e) => setStartVerseNum(Number(e.target.value))}
                  className="bg-zinc-900 border border-yellow-600/50 rounded px-1.5 py-0.5 text-amber-200 font-bold text-xs focus:border-amber-400 shrink-0 cursor-pointer"
                >
                  {Array.from({ length: maxVersesForChapter }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      第 {i + 1} 節
                    </option>
                  ))}
                </select>

                <span className="text-yellow-600 font-bold shrink-0 px-0.5">至</span>

                <select
                  value={endVerseNum}
                  onChange={(e) => setEndVerseNum(Number(e.target.value))}
                  className="bg-zinc-900 border border-yellow-600/50 rounded px-1.5 py-0.5 text-amber-200 font-bold text-xs focus:border-amber-400 shrink-0 cursor-pointer"
                >
                  {Array.from({ length: maxVersesForChapter }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      第 {i + 1} 節
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Reading Playbar */}
      <div className="sticky top-12 z-30 bg-black/95 border border-yellow-500/50 p-2.5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.9)] backdrop-blur-lg flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Main Play/Pause Button */}
          <button
            onClick={handleTogglePlayPause}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 text-xs shadow-md transition-all ${
              isPlaying
                ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/40'
                : 'btn-gold shadow-amber-500/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>暫停朗讀</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>開始朗讀</span>
              </>
            )}
          </button>

          {/* Reset / Restart Reading Button */}
          <button
            onClick={handleRestart}
            className="p-2 rounded-lg bg-zinc-900 border border-yellow-700/40 text-amber-400 hover:text-yellow-200 hover:bg-zinc-800 transition-colors"
            title="重新從第一節朗讀"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Repeat Mode Toggle */}
          <button
            onClick={() => setIsInfiniteLoop(!isInfiniteLoop)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
              isInfiniteLoop
                ? 'bg-yellow-950 text-amber-300 border-amber-400'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
            title="切換是否重複循環朗讀"
          >
            <Repeat className="w-3 h-3" />
            <span>{isInfiniteLoop ? '無限重複中' : '單次朗讀'}</span>
          </button>


        </div>
      </div>

      {/* Scripture Verses Display List with Swipe Gesture Support */}
      <div
        className="gold-card p-3 md:p-4 rounded-xl min-h-[350px] space-y-2 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pb-2.5 border-b border-yellow-800/40">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-bold text-gold-bright">
              {bookName} 第 {viewChapter} 章
            </h3>
          </div>

          {/* Chapter Navigation Bar */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevChapter}
              disabled={viewChapter <= minChapter}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all ${
                viewChapter <= minChapter
                  ? 'opacity-30 border-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-900 border-yellow-700/50 text-amber-300 hover:bg-yellow-950 hover:border-amber-400'
              }`}
              title="上一章 (向右滑動)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>上一章</span>
            </button>

            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-yellow-950/80 border border-yellow-600/40 rounded-lg text-amber-200">
              {viewChapter} / {maxChapter} 章
            </span>

            <button
              onClick={handleNextChapter}
              disabled={viewChapter >= maxChapter}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all ${
                viewChapter >= maxChapter
                  ? 'opacity-30 border-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-900 border-yellow-700/50 text-amber-300 hover:bg-yellow-950 hover:border-amber-400'
              }`}
              title="下一章 (向左滑動)"
            >
              <span>下一章</span>
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
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800/60 transition-colors"
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
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-300 border border-amber-500/40 hover:bg-yellow-950/60 flex items-center gap-1.5 transition-all"
                title="從此節開始朗讀"
              >
                <Play className="w-3.5 h-3.5 text-amber-400" />
                <span>從此節朗讀</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedCopyVerse(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 hover:bg-zinc-800/60 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleCopyVerseText}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
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
