/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { BibleBook, BibleVersion, Bookmark, FontFamily, ReadingMode, Tier } from './types';
import { BIBLE_BOOKS } from './data/bibleBooks';
import { Header } from './components/Header';
import { Tier1VersionSelect } from './components/Tier1VersionSelect';
import { Tier2BookSelect } from './components/Tier2BookSelect';
import { Tier3ScriptureReader } from './components/Tier3ScriptureReader';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { SearchModal } from './components/SearchModal';
import { LastReadRecord } from './services/lastReadService';

export default function App() {
  const [currentTier, setCurrentTier] = useState<Tier>('TIER1');
  const [selectedVersion, setSelectedVersion] = useState<BibleVersion>('CUV');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [initialChapter, setInitialChapter] = useState<number>(1);
  const [initialVerse, setInitialVerse] = useState<number | undefined>(undefined);
  const [initialReadingMode, setInitialReadingMode] = useState<ReadingMode | undefined>(undefined);
  const [initialStartVerse, setInitialStartVerse] = useState<number | undefined>(undefined);
  const [initialEndVerse, setInitialEndVerse] = useState<number | undefined>(undefined);
  const [initialVerseNumbers, setInitialVerseNumbers] = useState<number[] | undefined>(undefined);
  const [isFromBookmark, setIsFromBookmark] = useState<boolean>(false);
  const [activeBookmarkOrigin, setActiveBookmarkOrigin] = useState<{
    book: BibleBook;
    chapter: number;
    version: BibleVersion;
  } | null>(null);
  const [tier3SessionKey, setTier3SessionKey] = useState<number>(0);
  const [autoStartPlayback, setAutoStartPlayback] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Global Playback, Voice, Font Size, Pitch & Night Mode State
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bible_speech_pitch');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return 1.0;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bible_speech_pitch', String(speechPitch));
    }
  }, [speechPitch]);

  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bible_font_size');
      if (saved === 'normal' || saved === 'large' || saved === 'xlarge') return saved;
    }
    return 'large';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bible_font_size', fontSize);
    }
  }, [fontSize]);

  const [fontFamily, setFontFamily] = useState<FontFamily>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bible_font_family');
      if (saved === 'sans' || saved === 'serif' || saved === 'kai') return saved as FontFamily;
    }
    return 'sans';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bible_font_family', fontFamily);
      document.body.setAttribute('data-font', fontFamily);
    }
  }, [fontFamily]);

  // 經文字體粗細設定 (預設常規 false，使用者可在設定中切換加粗)
  const [isScriptureBold, setIsScriptureBold] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bible_scripture_bold') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bible_scripture_bold', String(isScriptureBold));
      document.body.setAttribute('data-scripture-bold', String(isScriptureBold));
    }
  }, [isScriptureBold]);

  // 書卷選擇頁面字體粗細設定 (預設常規 false，使用者可在設定中切換加粗)
  const [isBookSelectorBold, setIsBookSelectorBold] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bible_book_selector_bold') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bible_book_selector_bold', String(isBookSelectorBold));
    }
  }, [isBookSelectorBold]);

  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [isNightMode, setIsNightMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bible_night_mode') === 'true';
    }
    return false;
  });

  // Sleep Timer State
  const [sleepTimerEndTime, setSleepTimerEndTime] = useState<number | null>(null);

  useEffect(() => {
    if (!sleepTimerEndTime) return;

    const checkTimer = () => {
      if (Date.now() >= sleepTimerEndTime) {
        if (typeof window !== 'undefined') {
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          document.querySelectorAll('audio').forEach((a) => {
            try {
              a.pause();
            } catch {
              // Ignore pause errors
            }
          });
        }
        setSleepTimerEndTime(null);
        alert('⏰ 睡眠定時時間已到，聖經朗讀已自動停止。祝您安睡，晚安！');
      }
    };

    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEndTime]);

  const handleSetSleepTimer = (minutes: number | null) => {
    if (minutes === null || minutes <= 0) {
      setSleepTimerEndTime(null);
    } else {
      setSleepTimerEndTime(Date.now() + minutes * 60 * 1000);
    }
  };

  // Sync Night Mode class with document.body and localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bible_night_mode', String(isNightMode));
      if (isNightMode) {
        document.body.classList.add('night-mode');
      } else {
        document.body.classList.remove('night-mode');
      }
    }
  }, [isNightMode]);

  // Ensure page scrolls to top on initial mount and whenever tier changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, 100);
    return () => clearTimeout(timer);
  }, [currentTier]);

  // Nav Handlers
  const handleSelectVersion = (version: BibleVersion) => {
    setSelectedVersion(version);
    setIsFromBookmark(false);
    setActiveBookmarkOrigin(null);
    setCurrentTier('TIER2');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleSelectBook = (book: BibleBook, chapter: number = 1, autoPlay: boolean = false) => {
    setSelectedBook(book);
    setInitialChapter(chapter);
    setInitialVerse(undefined);
    setInitialReadingMode(undefined);
    setInitialStartVerse(undefined);
    setInitialEndVerse(undefined);
    setInitialVerseNumbers(undefined);
    if (currentTier !== 'TIER3') {
      setIsFromBookmark(false);
      setActiveBookmarkOrigin({
        book,
        chapter,
        version: selectedVersion,
      });
    }
    setAutoStartPlayback(autoPlay);
    setTier3SessionKey((k) => k + 1);
    setCurrentTier('TIER3');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleOpenBookmark = (bookmark: Bookmark) => {
    const book = BIBLE_BOOKS.find((b) => b.id === bookmark.bookId);
    if (book) {
      setSelectedVersion(bookmark.version);
      setSelectedBook(book);
      setInitialChapter(bookmark.chapter);
      setInitialVerse(bookmark.startVerse);
      setInitialReadingMode(
        bookmark.readingMode ||
          (bookmark.startVerse !== undefined || (bookmark.verseNumbers && bookmark.verseNumbers.length > 0)
            ? 'VERSES'
            : 'CHAPTERS')
      );
      setInitialStartVerse(bookmark.startVerse);
      setInitialEndVerse(bookmark.endVerse ?? bookmark.startVerse);
      setInitialVerseNumbers(bookmark.verseNumbers);
      setIsFromBookmark(true);
      setActiveBookmarkOrigin({
        book,
        chapter: bookmark.chapter,
        version: bookmark.version,
      });
      setTier3SessionKey((k) => k + 1);
      setCurrentTier('TIER3');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  };

  const handleOpenLastRead = (record: LastReadRecord) => {
    const book = BIBLE_BOOKS.find((b) => b.id === record.bookId);
    if (book) {
      setSelectedVersion(record.version);
      setSelectedBook(book);
      setInitialChapter(record.chapter);
      setInitialVerse(record.verse);
      setInitialReadingMode(record.readingMode || 'CHAPTERS');
      setInitialStartVerse(record.startVerse || record.verse);
      setInitialEndVerse(record.endVerse);
      setInitialVerseNumbers(undefined);
      setIsFromBookmark(false);
      setActiveBookmarkOrigin({
        book,
        chapter: record.chapter,
        version: record.version,
      });
      setAutoStartPlayback(true);
      setTier3SessionKey((k) => k + 1);
      setCurrentTier('TIER3');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  };

  const handleNavigateToScripture = (bookId: string, chapter: number) => {
    const book = BIBLE_BOOKS.find((b) => b.id === bookId);
    if (book) {
      setSelectedBook(book);
      setInitialChapter(chapter);
      setInitialVerse(undefined);
      setInitialReadingMode('CHAPTERS');
      setInitialStartVerse(undefined);
      setInitialEndVerse(undefined);
      setInitialVerseNumbers(undefined);
      setIsFromBookmark(false);
      setActiveBookmarkOrigin({
        book,
        chapter,
        version: selectedVersion,
      });
      setTier3SessionKey((k) => k + 1);
      setCurrentTier('TIER3');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  };

  const handleGoHome = () => {
    setIsFromBookmark(false);
    setActiveBookmarkOrigin(null);
    setCurrentTier('TIER1');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleGoBackToTier2 = () => {
    setIsFromBookmark(false);
    setCurrentTier('TIER2');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleHeaderBookNameClick = () => {
    if (currentTier === 'TIER3') {
      const origin = activeBookmarkOrigin || (selectedBook ? {
        book: selectedBook,
        chapter: initialChapter || 1,
        version: selectedVersion,
      } : null);

      if (origin) {
        setSelectedVersion(origin.version);
        setSelectedBook(origin.book);
        setInitialChapter(origin.chapter);
        setInitialVerse(1);
        setInitialReadingMode('CHAPTERS');
        setInitialStartVerse(1);
        setInitialEndVerse(undefined);
        setInitialVerseNumbers(undefined);
        setAutoStartPlayback(false);
        setTier3SessionKey((k) => k + 1);
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    }
  };

  // Remember scroll position before opening search, to restore upon returning
  const prevScrollYRef = useRef<number>(0);

  const handleOpenSearch = () => {
    prevScrollYRef.current = window.scrollY;
    setIsSearchOpen(true);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setTimeout(() => {
      window.scrollTo({ top: prevScrollYRef.current, left: 0, behavior: 'instant' });
    }, 20);
  };

  // Jump from search result to book & chapter & verse
  const handleJumpFromSearch = (book: BibleBook, chapter: number, verse: number) => {
    setSelectedBook(book);
    setInitialChapter(chapter);
    setInitialVerse(verse);
    setInitialReadingMode('CHAPTERS');
    setInitialStartVerse(verse);
    setInitialEndVerse(undefined);
    setInitialVerseNumbers(undefined);
    setIsFromBookmark(false);
    setActiveBookmarkOrigin({
      book,
      chapter,
      version: selectedVersion,
    });
    setAutoStartPlayback(false);
    setTier3SessionKey((k) => k + 1);
    setCurrentTier('TIER3');
    setIsSearchOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  return (
    <div className="min-h-screen bg-black text-amber-100 flex flex-col font-sans selection:bg-amber-400 selection:text-black">
      {/* Top Header Navigation (在搜尋頁面時隱藏，由搜尋頁面自身的棕色頂欄提供返回與搜尋) */}
      {!isSearchOpen && (
        <Header
          currentTier={currentTier}
          selectedVersion={selectedVersion}
          selectedBookName={selectedBook ? ((selectedBook.name as any)[selectedVersion] || selectedBook.name.WEB || selectedBook.name.CUV) : undefined}
          onGoHome={handleGoHome}
          onGoBackToTier2={handleGoBackToTier2}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onBookNameClick={handleHeaderBookNameClick}
          onOpenSearch={handleOpenSearch}
        />
      )}

      {/* Main Tier View Container (在搜尋時 hidden 保留 DOM 與音訊狀態) */}
      <main className={`flex-1 ${isSearchOpen ? 'hidden' : 'pb-16'}`}>
        {currentTier === 'TIER1' && (
          <Tier1VersionSelect
            selectedVersion={selectedVersion}
            onSelectVersion={handleSelectVersion}
            onOpenBookmark={handleOpenBookmark}
            onOpenLastRead={handleOpenLastRead}
            onNavigateToScripture={handleNavigateToScripture}
            playbackSpeed={playbackSpeed}
            speechPitch={speechPitch}
            selectedVoiceName={selectedVoiceName}
          />
        )}

        {currentTier === 'TIER2' && (
          <Tier2BookSelect
            selectedVersion={selectedVersion}
            onSelectBook={handleSelectBook}
            onGoHome={handleGoHome}
            initialBook={selectedBook || undefined}
            isBookSelectorBold={isBookSelectorBold}
          />
        )}

        {currentTier === 'TIER3' && selectedBook && (
          <Tier3ScriptureReader
            key={`tier3-${selectedBook.id}-${tier3SessionKey}`}
            selectedBook={selectedBook}
            selectedVersion={selectedVersion}
            initialChapter={initialChapter}
            initialVerse={initialVerse}
            initialReadingMode={initialReadingMode}
            initialStartVerse={initialStartVerse}
            initialEndVerse={initialEndVerse}
            initialVerseNumbers={initialVerseNumbers}
            onSelectBook={handleSelectBook}
            onGoBackToTier2={handleGoBackToTier2}
            onGoHome={handleGoHome}
            onOpenSettings={() => setIsSettingsOpen(true)}
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
            speechPitch={speechPitch}
            fontSize={fontSize}
            setFontSize={setFontSize}
            fontFamily={fontFamily}
            isScriptureBold={isScriptureBold}
            isBookSelectorBold={isBookSelectorBold}
            selectedVoiceName={selectedVoiceName}
            autoStartPlayback={autoStartPlayback}
            isFromBookmark={isFromBookmark}
          />
        )}
      </main>


      {/* Settings Modal */}
      <AudioSettingsModal
        isOpen={isSettingsOpen}
        selectedVersion={selectedVersion}
        onClose={() => setIsSettingsOpen(false)}
        playbackSpeed={playbackSpeed}
        onPlaybackSpeedChange={setPlaybackSpeed}
        speechPitch={speechPitch}
        onSpeechPitchChange={setSpeechPitch}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        fontFamily={fontFamily}
        onFontFamilyChange={setFontFamily}
        isScriptureBold={isScriptureBold}
        onScriptureBoldChange={setIsScriptureBold}
        isBookSelectorBold={isBookSelectorBold}
        onBookSelectorBoldChange={setIsBookSelectorBold}
        selectedVoiceName={selectedVoiceName}
        onVoiceNameChange={setSelectedVoiceName}
        isNightMode={isNightMode}
        onNightModeChange={setIsNightMode}
        sleepTimerEndTime={sleepTimerEndTime}
        onSetSleepTimer={handleSetSleepTimer}
      />

      {/* Scripture Search View (在文件流中滾動，手機上滑時瀏覽器底欄自動收起) */}
      {isSearchOpen && (
        <SearchModal
          isOpen={isSearchOpen}
          onClose={handleCloseSearch}
          selectedVersion={selectedVersion}
          onVersionChange={setSelectedVersion}
          onJumpToScripture={handleJumpFromSearch}
        />
      )}
    </div>
  );
}
