/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BibleBook, BibleVersion, Bookmark, PlaylistItem, ReadingMode, Tier } from './types';
import { BIBLE_BOOKS } from './data/bibleBooks';
import { Header } from './components/Header';
import { Tier1VersionSelect } from './components/Tier1VersionSelect';
import { Tier2BookSelect } from './components/Tier2BookSelect';
import { Tier3ScriptureReader } from './components/Tier3ScriptureReader';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { getPlaylist } from './services/playlistService';

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

  // Playlist Continuous Playback State
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [playlistIndex, setPlaylistIndex] = useState<number | null>(null);
  const [autoStartPlayback, setAutoStartPlayback] = useState<boolean>(false);

  // Scroll to top automatically whenever currentTier changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentTier]);

  // Nav Handlers
  const handleSelectVersion = (version: BibleVersion) => {
    setSelectedVersion(version);
    setPlaylistIndex(null);
    setCurrentTier('TIER2');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleSelectBook = (book: BibleBook) => {
    setSelectedBook(book);
    setInitialChapter(1);
    setInitialReadingMode(undefined);
    setInitialStartVerse(undefined);
    setInitialEndVerse(undefined);
    setAutoStartPlayback(false);
    setPlaylistIndex(null);
    setCurrentTier('TIER3');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleOpenBookmark = (bookmark: Bookmark) => {
    const book = BIBLE_BOOKS.find((b) => b.id === bookmark.bookId);
    if (book) {
      setSelectedVersion(bookmark.version);
      setSelectedBook(book);
      setInitialChapter(bookmark.chapter);
      setInitialReadingMode(bookmark.readingMode);
      setInitialStartVerse(bookmark.startVerse);
      setInitialEndVerse(bookmark.endVerse);
      setAutoStartPlayback(false);
      setPlaylistIndex(null);
      setCurrentTier('TIER3');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  };

  // Start playlist playback at specified index
  const handleStartPlaylistPlayback = (startIndex: number = 0) => {
    const items = getPlaylist();
    if (!items || items.length === 0) return;
    setPlaylistItems(items);
    const validIndex = Math.min(Math.max(0, startIndex), items.length - 1);
    setPlaylistIndex(validIndex);

    const item = items[validIndex];
    const book = BIBLE_BOOKS.find((b) => b.id === item.bookId);
    if (book) {
      setSelectedVersion(item.version);
      setSelectedBook(book);
      setInitialChapter(item.chapter);
      setInitialReadingMode(item.readingMode || (item.startVerse ? 'VERSES' : 'CHAPTERS'));
      setInitialStartVerse(item.startVerse);
      setInitialEndVerse(item.endVerse);
      setAutoStartPlayback(true);
      setCurrentTier('TIER3');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  };

  const handlePlayNextPlaylistItem = () => {
    if (playlistIndex !== null && playlistIndex + 1 < playlistItems.length) {
      const nextIndex = playlistIndex + 1;
      setPlaylistIndex(nextIndex);
      const item = playlistItems[nextIndex];
      const book = BIBLE_BOOKS.find((b) => b.id === item.bookId);
      if (book) {
        setSelectedVersion(item.version);
        setSelectedBook(book);
        setInitialChapter(item.chapter);
        setInitialReadingMode(item.readingMode || (item.startVerse ? 'VERSES' : 'CHAPTERS'));
        setInitialStartVerse(item.startVerse);
        setInitialEndVerse(item.endVerse);
        setAutoStartPlayback(true);
      }
    } else {
      // Playlist completed
      setPlaylistIndex(null);
      alert('🎉 播放清單中的所有章節已全部自動播放完畢！');
    }
  };

  const handlePlayPrevPlaylistItem = () => {
    if (playlistIndex !== null && playlistIndex > 0) {
      const prevIndex = playlistIndex - 1;
      setPlaylistIndex(prevIndex);
      const item = playlistItems[prevIndex];
      const book = BIBLE_BOOKS.find((b) => b.id === item.bookId);
      if (book) {
        setSelectedVersion(item.version);
        setSelectedBook(book);
        setInitialChapter(item.chapter);
        setInitialReadingMode(item.readingMode || (item.startVerse ? 'VERSES' : 'CHAPTERS'));
        setInitialStartVerse(item.startVerse);
        setInitialEndVerse(item.endVerse);
        setAutoStartPlayback(true);
      }
    }
  };

  const handleExitPlaylistMode = () => {
    setPlaylistIndex(null);
  };

  const handleGoHome = () => {
    setPlaylistIndex(null);
    setCurrentTier('TIER1');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleGoBackToTier2 = () => {
    setPlaylistIndex(null);
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
            onStartPlaylistPlayback={handleStartPlaylistPlayback}
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
            playlistItems={playlistItems}
            playlistIndex={playlistIndex}
            onPlayNextPlaylistItem={handlePlayNextPlaylistItem}
            onPlayPrevPlaylistItem={handlePlayPrevPlaylistItem}
            onExitPlaylistMode={handleExitPlaylistMode}
            autoStartPlayback={autoStartPlayback}
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
      />
    </div>
  );
}
