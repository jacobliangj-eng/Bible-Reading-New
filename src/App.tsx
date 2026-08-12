/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BibleBook, BibleVersion, Tier } from './types';
import { Header } from './components/Header';
import { Tier1VersionSelect } from './components/Tier1VersionSelect';
import { Tier2BookSelect } from './components/Tier2BookSelect';
import { Tier3ScriptureReader } from './components/Tier3ScriptureReader';
import { AudioSettingsModal } from './components/AudioSettingsModal';

export default function App() {
  const [currentTier, setCurrentTier] = useState<Tier>('TIER1');
  const [selectedVersion, setSelectedVersion] = useState<BibleVersion>('CUV');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Global Playback, Voice & Font Size State
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  // Nav Handlers
  const handleSelectVersion = (version: BibleVersion) => {
    setSelectedVersion(version);
    setCurrentTier('TIER2');
  };

  const handleSelectBook = (book: BibleBook) => {
    setSelectedBook(book);
    setCurrentTier('TIER3');
  };

  const handleGoHome = () => {
    setCurrentTier('TIER1');
  };

  const handleGoBackToTier2 = () => {
    setCurrentTier('TIER2');
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
            onGoBackToTier2={handleGoBackToTier2}
            onGoHome={handleGoHome}
            onOpenSettings={() => setIsSettingsOpen(true)}
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
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
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        selectedVoiceName={selectedVoiceName}
        onVoiceNameChange={setSelectedVoiceName}
      />
    </div>
  );
}
