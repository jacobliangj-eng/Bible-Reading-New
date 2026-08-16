/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BibleBook, BibleVersion, Bookmark, ReadingMode, Tier } from './types';
import { BIBLE_BOOKS } from './data/bibleBooks';
import { Header } from './components/Header';
import { Tier1VersionSelect } from './components/Tier1VersionSelect';
import { Tier2BookSelect } from './components/Tier2BookSelect';
import { Tier3ScriptureReader } from './components/Tier3ScriptureReader';
import { AudioSettingsModal } from './components/AudioSettingsModal';

export default function App() {
  const [currentTier, setCurrentTier] = useState<Tier>('TIER1');
  const [selectedVersion, setSelectedVersion] = useState<BibleVersion>('CUV');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [initialChapter, setInitialChapter] = useState<number>(1);
  const [initialReadingMode, setInitialReadingMode] = useState<ReadingMode | undefined>(undefined);
  const [initialStartVerse, setInitialStartVerse] = useState<number | undefined>(undefined);
  const [initialEndVerse, setInitialEndVerse] = useState<number | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

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

  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('large');
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

  // Scroll to top automatically whenever currentTier changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentTier]);

  // Nav Handlers
  const handleSelectVersion = (version: BibleVersion) => {
    setSelectedVersion(version);
    setCurrentTier('TIER2');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleSelectBook = (book: BibleBook) => {
    setSelectedBook(book);
    setInitialChapter(1);
    setInitialReadingMode(undefined);
    setInitialStartVerse(undefined);
    setInitialEndVerse(undefined);
    setCurrentTier('TIER3');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleOpenBookmark = (bookmark: Bookmark) => {
    const book = BIBLE_BOOKS.find((b) => b.id === bookmark.bookId);
    if (book) {
      setSelectedVersion(bookmark.version);
      setSelectedBook(book);
      setInitialChapter(bookmark.chapter);
      setInitialReadingMode(bookmark.readingMode || (bookmark.startVerse !== undefined ? 'VERSES' : 'CHAPTERS'));
      setInitialStartVerse(bookmark.startVerse);
      setInitialEndVerse(bookmark.endVerse);
      setCurrentTier('TIER3');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  };

  const handleGoHome = () => {
    setCurrentTier('TIER1');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleGoBackToTier2 = () => {
    setCurrentTier('TIER2');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  return (
    <div className="min-h-screen bg-black text-amber-100 flex flex-col font-sans selection:bg-amber-400 selection:text-black">
      {/* Top Header Navigation */}
      <Header
        currentTier={currentTier}
        selectedVersion={selectedVersion}
        selectedBookName={selectedBook?.name[selectedVersion]}
        onGoHome={handleGoHome}
        onGoBackToTier2={handleGoBackToTier2}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Tier View Container */}
      <main className="flex-1 pb-16">
        {currentTier === 'TIER1' && (
          <Tier1VersionSelect
            selectedVersion={selectedVersion}
            onSelectVersion={handleSelectVersion}
            onOpenBookmark={handleOpenBookmark}
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
          />
        )}

        {currentTier === 'TIER3' && selectedBook && (
          <Tier3ScriptureReader
            selectedBook={selectedBook}
            selectedVersion={selectedVersion}
            initialChapter={initialChapter}
            initialReadingMode={initialReadingMode}
            initialStartVerse={initialStartVerse}
            initialEndVerse={initialEndVerse}
            onGoBackToTier2={handleGoBackToTier2}
            onGoHome={handleGoHome}
            onOpenSettings={() => setIsSettingsOpen(true)}
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
            speechPitch={speechPitch}
            fontSize={fontSize}
            setFontSize={setFontSize}
            selectedVoiceName={selectedVoiceName}
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
        selectedVoiceName={selectedVoiceName}
        onVoiceNameChange={setSelectedVoiceName}
        isNightMode={isNightMode}
        onNightModeChange={setIsNightMode}
        sleepTimerEndTime={sleepTimerEndTime}
        onSetSleepTimer={handleSetSleepTimer}
      />
    </div>
  );
}
