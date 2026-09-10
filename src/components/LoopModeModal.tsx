import React, { useState, useEffect } from 'react';
import { X, Repeat, BookOpen, FileText, CheckCircle2, ListChecks, ArrowRightCircle } from 'lucide-react';

export type LoopScope = 'SINGLE' | 'BOOK' | 'CHAPTER' | 'VERSES';

interface LoopModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLoopScope: LoopScope;
  bookName: string;
  viewChapter: number;
  totalChapters: number;
  chapterUnit: string;
  totalVersesInChapter: number;
  initialSelectedVerses?: number[];
  onSelectLoopScope: (scope: LoopScope, verses?: number[]) => void;
}

export const LoopModeModal: React.FC<LoopModeModalProps> = ({
  isOpen,
  onClose,
  currentLoopScope,
  bookName,
  viewChapter,
  totalChapters,
  chapterUnit,
  totalVersesInChapter,
  initialSelectedVerses = [],
  onSelectLoopScope,
}) => {
  // Local state for verse selection inside modal
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (initialSelectedVerses && initialSelectedVerses.length > 0) {
        setSelectedVerses([...initialSelectedVerses].sort((a, b) => a - b));
      } else {
        // Default to first verse if none selected
        setSelectedVerses([1]);
      }
    }
  }, [isOpen, initialSelectedVerses]);

  if (!isOpen) return null;

  const handleToggleVerse = (vNum: number) => {
    setSelectedVerses((prev) => {
      if (prev.includes(vNum)) {
        if (prev.length <= 1) return prev; // keep at least 1 verse
        return prev.filter((n) => n !== vNum);
      } else {
        return [...prev, vNum].sort((a, b) => a - b);
      }
    });
  };

  const handleSelectAllVerses = () => {
    const all = Array.from({ length: totalVersesInChapter }, (_, i) => i + 1);
    setSelectedVerses(all);
  };

  const handleClearVerses = () => {
    setSelectedVerses([1]);
  };

  const handleSelectOdds = () => {
    const odds = Array.from({ length: totalVersesInChapter }, (_, i) => i + 1).filter((n) => n % 2 === 1);
    setSelectedVerses(odds);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in touch-manipulation cursor-pointer"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="gold-card p-4 sm:p-6 rounded-2xl max-w-lg w-full relative border border-yellow-500/50 space-y-4 max-h-[90vh] overflow-y-auto my-auto shadow-2xl cursor-default"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-zinc-400 hover:text-amber-300 p-2 rounded-xl bg-zinc-900/90 border border-yellow-700/50 hover:bg-zinc-800 active:scale-95 transition-all touch-manipulation z-20 cursor-pointer"
          title="關閉循環設定"
        >
          <X className="w-5 h-5 text-amber-300" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-yellow-800/40 pb-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-950 border border-yellow-600/40 flex items-center justify-center text-amber-400 shrink-0">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-amber-200 tracking-wide">
              朗讀循環模式設定
            </h2>
            <p className="text-xs text-amber-400/80 mt-0.5">
              當前經文：<span className="font-semibold text-yellow-300">{bookName} 第 {viewChapter} {chapterUnit}</span>（共 {totalChapters} {chapterUnit}）
            </p>
          </div>
        </div>

        {/* Loop Options List */}
        <div className="space-y-3 pt-1">
          {/* Option 1: Book Loop (本卷書的循環) */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              currentLoopScope === 'BOOK'
                ? 'bg-amber-950/40 border-yellow-400 shadow-md shadow-amber-500/10'
                : 'bg-zinc-900/80 border-yellow-800/40 hover:border-amber-500/60'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${currentLoopScope === 'BOOK' ? 'bg-amber-500 text-black' : 'bg-yellow-950 text-amber-400 border border-yellow-700/50'}`}>
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-yellow-200">本卷書的循環</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-400 text-black">
                      按鈕顯示「本卷」
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    例如當前唸到<strong className="text-amber-300">{bookName}第 {viewChapter} {chapterUnit}</strong>時，選擇此項目，{bookName}會從第 1 {chapterUnit}唸到第 {totalChapters} {chapterUnit}，結束後又會從第 1 {chapterUnit}開始重新循環朗讀。
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onSelectLoopScope('BOOK');
                  onClose();
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentLoopScope === 'BOOK'
                    ? 'bg-amber-400 text-black shadow-md font-extrabold'
                    : 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/50'
                }`}
              >
                {currentLoopScope === 'BOOK' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>目前使用中</span>
                  </>
                ) : (
                  <span>啟用本卷循環</span>
                )}
              </button>
            </div>
          </div>

          {/* Option 2: Chapter Loop (本章的循環) */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              currentLoopScope === 'CHAPTER'
                ? 'bg-amber-950/40 border-yellow-400 shadow-md shadow-amber-500/10'
                : 'bg-zinc-900/80 border-yellow-800/40 hover:border-amber-500/60'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${currentLoopScope === 'CHAPTER' ? 'bg-amber-500 text-black' : 'bg-yellow-950 text-amber-400 border border-yellow-700/50'}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-yellow-200">本章的循環</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-400 text-black">
                      按鈕顯示「本章」
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    例如當前唸到<strong className="text-amber-300">{bookName}第 {viewChapter} {chapterUnit}</strong>時，選擇此項目，第 {viewChapter} {chapterUnit}會不斷地循環朗讀，絕不跨越至下一章。
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onSelectLoopScope('CHAPTER');
                  onClose();
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentLoopScope === 'CHAPTER'
                    ? 'bg-amber-400 text-black shadow-md font-extrabold'
                    : 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/50'
                }`}
              >
                {currentLoopScope === 'CHAPTER' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>目前使用中</span>
                  </>
                ) : (
                  <span>啟用本章循環</span>
                )}
              </button>
            </div>
          </div>

          {/* Option 3: Specific Verses Loop (特定幾節的循環) */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              currentLoopScope === 'VERSES'
                ? 'bg-amber-950/40 border-yellow-400 shadow-md shadow-amber-500/10'
                : 'bg-zinc-900/80 border-yellow-800/40 hover:border-amber-500/60'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${currentLoopScope === 'VERSES' ? 'bg-amber-500 text-black' : 'bg-yellow-950 text-amber-400 border border-yellow-700/50'}`}>
                  <ListChecks className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-yellow-200">特定幾節的循環</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-400 text-black">
                      按鈕顯示「特定」
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    例如在<strong className="text-amber-300">{bookName}第 {viewChapter} {chapterUnit}</strong>時，選擇如第 1、3、5 節後，會由語音合成（TTS）不斷地循環朗讀這幾節經文。
                  </p>
                </div>
              </div>
            </div>

            {/* Verse Selector Area */}
            <div className="mt-3 pt-2.5 border-t border-yellow-800/40 space-y-2">
              <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                <span className="text-amber-300 font-semibold">
                  點選本章欲循環之節數（已選 {selectedVerses.length} 節）：
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSelectOdds}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 cursor-pointer border border-yellow-800/40"
                    title="選取奇數節如1, 3, 5節"
                  >
                    1, 3, 5節
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllVerses}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 cursor-pointer border border-yellow-800/40"
                  >
                    全選
                  </button>
                  <button
                    type="button"
                    onClick={handleClearVerses}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-amber-200 cursor-pointer border border-yellow-800/40"
                  >
                    重設
                  </button>
                </div>
              </div>

              {/* Grid of verse buttons */}
              <div className="max-h-28 overflow-y-auto p-1.5 bg-zinc-950/80 rounded-lg border border-yellow-900/50 flex flex-wrap gap-1.5">
                {Array.from({ length: totalVersesInChapter }, (_, i) => i + 1).map((vNum) => {
                  const isSelected = selectedVerses.includes(vNum);
                  return (
                    <button
                      key={vNum}
                      type="button"
                      onClick={() => handleToggleVerse(vNum)}
                      className={`w-7 h-7 text-xs rounded font-bold transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'bg-amber-400 text-black shadow-xs ring-1 ring-amber-300'
                          : 'bg-zinc-900 text-zinc-400 hover:text-amber-200 hover:bg-zinc-800 border border-zinc-800'
                      }`}
                      title={`第 ${vNum} 節`}
                    >
                      {vNum}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-amber-400/90 truncate max-w-[240px]">
                  目前選中：第 {selectedVerses.join(', ')} 節
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onSelectLoopScope('VERSES', selectedVerses);
                    onClose();
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    currentLoopScope === 'VERSES'
                      ? 'bg-amber-400 text-black shadow-md font-extrabold'
                      : 'bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-md shadow-amber-500/20'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>啟用特定節循環</span>
                </button>
              </div>
            </div>
          </div>

          {/* Option 4: Single Playback (單次播放 / 關閉循環) */}
          <div
            className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
              currentLoopScope === 'SINGLE'
                ? 'bg-zinc-900/90 border-amber-500/50'
                : 'bg-zinc-950/60 border-zinc-800 hover:border-yellow-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${currentLoopScope === 'SINGLE' ? 'bg-zinc-800 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
                <ArrowRightCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-zinc-300">單次播放（關閉循環）</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-normal text-zinc-400 border border-zinc-700">
                    按鈕顯示「單次」
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  朗讀完畢即自動停止，不進行重複循環。
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectLoopScope('SINGLE');
                onClose();
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentLoopScope === 'SINGLE'
                  ? 'bg-zinc-800 text-amber-300 border border-yellow-700/40'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'
              }`}
            >
              {currentLoopScope === 'SINGLE' ? '使用中' : '切換單次'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
