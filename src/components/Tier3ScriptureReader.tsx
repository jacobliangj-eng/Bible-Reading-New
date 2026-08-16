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
  Bookmark,
  Download,
  Headphones,
  Radio,
  Sparkles,
} from 'lucide-react';
import { BibleBook, BibleVersion, ReadingMode, Verse } from '../types';
import { VERSIONS } from '../data/bibleBooks';
import { fixChineseTTSPronunciation } from '../data/dailyVerses';
import { fetchChapterVerses } from '../services/bibleService';
import { isBookmarked, saveBookmark, removeBookmark, getBookmarkId } from '../services/bookmarkService';
import { getRockAudioUrls, ROCK_AUDIO_INFO } from '../services/rockAudioService';
import { RockAudioModal } from './RockAudioModal';

interface Tier3ScriptureReaderProps {
  selectedBook: BibleBook;
  selectedVersion: BibleVersion;
  initialChapter?: number;
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

  useEffect(() => {
    if (autoStartPlayback) {
      shouldAutoPlayRef.current = true;
    }
  }, [autoStartPlayback, selectedBook, selectedVersion, initialChapter]);


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

  // Bookmark state & toggle
  const isVerseMode = readingMode === 'VERSES' || startVerseNum > 1 || endVerseNum < maxVersesForChapter;
  const sV = Math.min(startVerseNum, endVerseNum);
  const eV = Math.max(startVerseNum, endVerseNum);

  // Audio Engine: 'ROCK_MP3' | 'TTS'
  // When in CUV and chapter-based reading mode (整章/全卷), defaults to 磐石有聲事工 (王濤峰弟兄國語朗讀) MP3
  const [audioEngine, setAudioEngine] = useState<'ROCK_MP3' | 'TTS'>(
    selectedVersion === 'CUV' && !isVerseMode ? 'ROCK_MP3' : 'TTS'
  );

  // Sync audioEngine when version or reading mode changes
  useEffect(() => {
    if (selectedVersion === 'CUV' && !isVerseMode) {
      setAudioEngine('ROCK_MP3');
    } else {
      setAudioEngine('TTS');
    }
  }, [selectedVersion, isVerseMode]);

  // Rock Audio Modal & Local File State
  const [isRockAudioModalOpen, setIsRockAudioModalOpen] = useState<boolean>(false);
  const [localMp3Url, setLocalMp3Url] = useState<string | null>(null);

  // HTML5 Audio Reference for MP3 playback
  const mp3AudioRef = useRef<HTMLAudioElement | null>(null);
  const [mp3CurrentTime, setMp3CurrentTime] = useState<number>(0);
  const [mp3Duration, setMp3Duration] = useState<number>(0);
  const [mp3CandidateIdx, setMp3CandidateIdx] = useState<number>(0);
  const [mp3ErrorMessage, setMp3ErrorMessage] = useState<string | null>(null);

  const formatAudioTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleMp3Seek = (newTime: number) => {
    if (mp3AudioRef.current) {
      mp3AudioRef.current.currentTime = newTime;
      setMp3CurrentTime(newTime);
    }
  };

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


  // Swipe gesture touch positions
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Continuation ref when switching chapter during continuous playback
  const shouldAutoPlayRef = useRef<boolean>(false);

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

  // MP3 Source URL calculation
  const rockAudioTrack = React.useMemo(() => {
    return getRockAudioUrls(selectedBook.number, viewChapter, bookName);
  }, [selectedBook.number, viewChapter, bookName]);

  const activeMp3Source = localMp3Url || (
    mp3CandidateIdx === 0
      ? rockAudioTrack.url
      : rockAudioTrack.fallbackUrls[mp3CandidateIdx - 1] || rockAudioTrack.url
  );

  // Initialize and bind audio element listeners
  useEffect(() => {
    const audio = new Audio();
    mp3AudioRef.current = audio;

    const handleTimeUpdate = () => {
      setMp3CurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setMp3Duration(audio.duration || 0);
      setMp3ErrorMessage(null);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      // Advance to next chapter if within range
      if (viewChapterRef.current < maxChapterRef.current) {
        shouldAutoPlayRef.current = true;
        setViewChapter((prev) => prev + 1);
      } else if (isInfiniteLoopRef.current) {
        if (viewChapterRef.current === minChapterRef.current) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } else {
          shouldAutoPlayRef.current = true;
          setViewChapter(minChapterRef.current);
        }
      } else {
        setIsPlaying(false);
      }
    };

    const handleError = () => {
      console.warn('Audio MP3 loading error, checking fallback sources...');
      setMp3CandidateIdx((prev) => {
        if (prev < rockAudioTrack.fallbackUrls.length) {
          return prev + 1;
        } else {
          setMp3ErrorMessage('線上 MP3 音訊載入受阻，您可點擊「下載 MP3」前往「磐石有聲聖經網站」下載音檔或切換為逐節語音合成 (TTS)。');
          setIsPlaying(false);
          return prev;
        }
      });
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      mp3AudioRef.current = null;
    };
  }, []);

  // Update MP3 audio src when chapter or active source changes
  useEffect(() => {
    const audio = mp3AudioRef.current;
    if (!audio) return;

    if (audioEngine === 'ROCK_MP3') {
      audio.src = activeMp3Source;
      audio.playbackRate = playbackSpeedRef.current;
      setMp3CurrentTime(0);

      if (shouldAutoPlayRef.current) {
        shouldAutoPlayRef.current = false;
        audio.play().catch((err) => {
          console.warn('AutoPlay prevented:', err);
        });
      }
    } else {
      audio.pause();
    }
  }, [activeMp3Source, audioEngine, viewChapter]);

  // Sync playback speed to audio element
  useEffect(() => {
    if (mp3AudioRef.current) {
      mp3AudioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Sync speechPitch to ref
  useEffect(() => {
    speechPitchRef.current = speechPitch;
  }, [speechPitch]);

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
        const sV = Math.min(startVerseNum, endVerseNum);
        const eV = Math.max(startVerseNum, endVerseNum);
        if (sV > 1 || eV < chVerses.length) {
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
      if (mp3AudioRef.current) {
        mp3AudioRef.current.pause();
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
      if (mp3AudioRef.current) {
        mp3AudioRef.current.pause();
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

      setCurrentVerseIndex(index);

      // Construct spoken text: 只有在每章第1節（index 0 且 verse === 1）時前置唸出「書卷名稱」與「第幾章」
      // 自第2節起（或非章首），不用唸書卷名與章節，只唸內文經文
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

      // Set Language, Rate, Pitch
      utterance.lang = versionInfo.langCode || 'zh-TW';
      utterance.rate = playbackSpeedRef.current;
      utterance.pitch = speechPitchRef.current;

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

    if (audioEngine === 'ROCK_MP3' && mp3AudioRef.current) {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      mp3AudioRef.current.play().catch((err) => {
        console.warn('MP3 playback failed:', err);
      });
      return;
    }

    if (!synthRef.current) return;

    if (synthRef.current.paused && synthRef.current.speaking) {
      synthRef.current.resume();
      return;
    }

    speakVerse(currentVerseIndex);
  }, [audioEngine, speakVerse, currentVerseIndex]);

  // Pause button handler (2. 按下「暫停鍵」則暫停朗讀)
  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (audioEngine === 'ROCK_MP3' && mp3AudioRef.current) {
      mp3AudioRef.current.pause();
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  }, [audioEngine]);

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

  // Reset to verse 0 / start of chapter
  const handleRestart = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (audioEngine === 'ROCK_MP3' && mp3AudioRef.current) {
      mp3AudioRef.current.currentTime = 0;
      setMp3CurrentTime(0);
      if (isPlaying) {
        mp3AudioRef.current.play().catch(() => {});
      }
    } else {
      setCurrentVerseIndex(0);
      if (isPlaying) {
        speakVerse(0);
      }
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
          </div>
        </div>
      </div>

      {/* Main Reading Playbar */}
      <div className="sticky top-12 z-30 bg-black/95 border border-yellow-500/50 p-2.5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.9)] backdrop-blur-lg flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Playback Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-start">
          {/* Left Buttons Group */}
          <div className="flex items-center gap-2">
            {/* Main Play/Pause Button */}
            <button
              onClick={handleTogglePlayPause}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
                isPlaying
                  ? 'bg-amber-400 text-black border-yellow-300 shadow-md shadow-amber-500/30'
                  : 'bg-zinc-900 border-yellow-700/50 text-amber-300 hover:bg-yellow-950 hover:border-amber-400'
              }`}
              title={isPlaying ? '暫停朗讀' : '開始朗讀'}
            >
              {isPlaying ? (
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
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all ${
                isInfiniteLoop
                  ? 'bg-amber-400 text-black border-yellow-300 shadow-md shadow-amber-500/30'
                  : 'bg-zinc-900 border-yellow-700/50 text-amber-300 hover:bg-yellow-950 hover:border-amber-400'
              }`}
              title={isInfiniteLoop ? '無限重複中' : '單次朗讀'}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>{isInfiniteLoop ? '循環' : '單次'}</span>
            </button>

            {/* 加書籤按鈕 */}
            <button
              onClick={handleToggleBookmark}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all ${
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

          {/* CUV Rock Audio Ministry MP3 / TTS Switcher & Download button */}
          {selectedVersion === 'CUV' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-950/70 border border-yellow-700/50 text-[11px]">
                <Headphones className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="text-amber-200 font-bold hidden sm:inline">
                  {audioEngine === 'ROCK_MP3' ? '磐石有聲（王濤峰弟兄真人朗讀）' : '語音合成 (TTS)'}
                </span>
                <span className="text-amber-200 font-bold sm:hidden">
                  {audioEngine === 'ROCK_MP3' ? '磐石真人MP3' : '語音TTS'}
                </span>
                {!isVerseMode && (
                  <button
                    onClick={() => setAudioEngine(audioEngine === 'ROCK_MP3' ? 'TTS' : 'ROCK_MP3')}
                    className="text-[10px] text-amber-400 hover:text-amber-200 underline font-bold ml-1"
                    title="切換音訊來源"
                  >
                    {audioEngine === 'ROCK_MP3' ? '改用TTS' : '改用真人MP3'}
                  </button>
                )}
              </div>

              {audioEngine === 'ROCK_MP3' && (
                <button
                  onClick={() => setIsRockAudioModalOpen(true)}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 bg-yellow-900/50 border border-yellow-600/50 text-amber-300 hover:bg-yellow-800 hover:border-amber-400 transition-all"
                  title="前往磐石有聲聖經網站下載 MP3 音檔"
                >
                  <Download className="w-3 h-3 text-amber-400" />
                  <span>下載MP3</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Audio Scrubber Timeline (when in MP3 mode) */}
        {audioEngine === 'ROCK_MP3' && (
          <div className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-sm px-1 text-[11px] text-amber-300/80 font-mono">
            <span className="shrink-0">{formatAudioTime(mp3CurrentTime)}</span>
            <input
              type="range"
              min={0}
              max={mp3Duration || 100}
              step={0.5}
              value={mp3CurrentTime}
              onChange={(e) => handleMp3Seek(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              title="拖曳調整播放進度"
            />
            <span className="shrink-0">{formatAudioTime(mp3Duration)}</span>
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
                  : 'bg-zinc-900 border-yellow-700/50 text-amber-300 hover:bg-yellow-950 hover:border-amber-400'
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
                  : 'bg-zinc-900 border-yellow-700/50 text-amber-300 hover:bg-yellow-950 hover:border-amber-400'
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
      {/* Rock Audio Ministry Modal */}
      <RockAudioModal
        isOpen={isRockAudioModalOpen}
        onClose={() => setIsRockAudioModalOpen(false)}
        bookName={bookName}
        chapter={viewChapter}
        chapterUnit={chapterUnit}
        onLocalFileSelected={(file) => {
          const url = URL.createObjectURL(file);
          setLocalMp3Url(url);
          setAudioEngine('ROCK_MP3');
          setMp3ErrorMessage(null);
        }}
      />

      {/* MP3 Error / Notice Banner */}
      {mp3ErrorMessage && audioEngine === 'ROCK_MP3' && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-40 bg-zinc-950 border border-yellow-600/80 p-3 rounded-xl shadow-2xl text-amber-200 text-xs flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="font-bold text-amber-300">提示：</p>
            <p className="text-zinc-300 leading-snug">{mp3ErrorMessage}</p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setIsRockAudioModalOpen(true)}
                className="text-[11px] font-bold text-amber-400 hover:underline"
              >
                前往下載 MP3
              </button>
              <span className="text-zinc-600">|</span>
              <button
                onClick={() => {
                  setAudioEngine('TTS');
                  setMp3ErrorMessage(null);
                }}
                className="text-[11px] font-bold text-amber-400 hover:underline"
              >
                切換為語音合成 (TTS)
              </button>
            </div>
          </div>
          <button
            onClick={() => setMp3ErrorMessage(null)}
            className="text-zinc-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
