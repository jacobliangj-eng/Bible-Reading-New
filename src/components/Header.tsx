import React from 'react';
import { BookOpen, Home, Volume2, Sparkles, ChevronRight, Settings } from 'lucide-react';
import { BibleVersion, Tier } from '../types';
import { VERSIONS } from '../data/bibleBooks';

interface HeaderProps {
  currentTier: Tier;
  selectedVersion: BibleVersion;
  selectedBookName?: string;
  onGoHome: () => void;
  onGoBackToTier2?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTier,
  selectedVersion,
  selectedBookName,
  onGoHome,
  onGoBackToTier2,
  onOpenSettings,
}) => {
  const versionInfo = VERSIONS[selectedVersion];

  return (
    <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-yellow-600/30 px-4 py-2 shadow-md shadow-black/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Logo & Brand Title */}
        <div 
          onClick={onGoHome}
          className="flex items-center gap-2 cursor-pointer group select-none"
        >
          <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-700 p-[1px] shadow-md shadow-amber-500/20 group-hover:shadow-amber-400/40 transition-shadow">
            <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-amber-400 animate-spin-slow group-hover:scale-110 transition-transform" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base md:text-lg font-bold tracking-tight text-gold-gradient leading-tight">
                {currentTier === 'TIER3' && selectedBookName
                  ? selectedBookName
                  : currentTier !== 'TIER1'
                  ? (versionInfo?.name || '聖經經文朗讀')
                  : '聖經經文朗讀'}
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] uppercase font-semibold bg-yellow-950/80 border border-yellow-500/40 text-amber-300 rounded-full">
                {currentTier !== 'TIER1' ? versionInfo?.badge : 'Holy Bible'}
              </span>
            </div>
            <p className="text-[11px] text-yellow-500/70 hidden sm:block leading-none mt-0.5">
              {currentTier === 'TIER3'
                ? versionInfo?.name
                : currentTier === 'TIER1'
                ? '聖經聽讀系統'
                : '聖經經文朗讀'}
            </p>
          </div>
        </div>

        {/* Center Breadcrumb */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-amber-200/80 bg-zinc-900/90 border border-yellow-600/30 px-2.5 py-1 rounded-full">
          <span className="text-amber-400 font-medium">TIER 1</span>
          {currentTier !== 'TIER1' ? (
            <span>: {versionInfo?.badge}</span>
          ) : (
            <span>: 選擇版本</span>
          )}

          {currentTier !== 'TIER1' && (
            <>
              <ChevronRight className="w-3 h-3 text-yellow-600" />
              <span className="text-amber-400 font-medium">TIER 2</span>
              <span>: 聖經書卷</span>
            </>
          )}

          {currentTier === 'TIER3' && selectedBookName && (
            <>
              <ChevronRight className="w-3 h-3 text-yellow-600" />
              <span className="text-amber-400 font-medium">TIER 3</span>
              <span className="text-amber-300 font-bold">: {selectedBookName}</span>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Back to Tier 2 if in Tier 3 */}
          {currentTier === 'TIER3' && onGoBackToTier2 && (
            <button
              onClick={onGoBackToTier2}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold btn-gold-outline flex items-center gap-1"
              title="回到聖經書卷目錄 (TIER 2)"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>選書卷</span>
            </button>
          )}

          {/* 回到首頁 Button (only shown in TIER 2 and TIER 3) */}
          {currentTier !== 'TIER1' && (
            <button
              onClick={onGoHome}
              className="px-2.5 py-1 rounded-lg text-xs font-bold btn-gold flex items-center gap-1 shadow-md shadow-amber-500/20"
              title="回到首頁，重新選擇聖經版本 (TIER 1)"
            >
              <Home className="w-3.5 h-3.5" />
              <span>回到首頁</span>
            </button>
          )}

          {/* Audio Settings Toggle */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-yellow-600/50 text-amber-300 hover:text-yellow-100 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm touch-manipulation cursor-pointer"
              title="朗讀語音設定"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-200">設定</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
