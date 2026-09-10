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

  const handleApplyScope = (scope: LoopScope, versesToUse?: number[]) => {
    onSelectLoopScope(scope, versesToUse ?? selectedVerses);
    onClose();
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
        className="gold-card p-3.5 sm:p-5 rounded-2xl max-w-lg w-full relative border border-yellow-500/50 space-y-3 shadow-2xl cursor-default my-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 text-zinc-400 hover:text-amber-300 p-1.5 rounded-lg bg-zinc-900/90 border border-yellow-700/50 hover:bg-zinc-800 active:scale-95 transition-all touch-manipulation z-20 cursor-pointer"
          title="關閉"
        >
          <X className="w-4 h-4 text-amber-300" />
        </button>

        {/* Header - Compact */}
        <div className="flex items-center gap-2.5 border-b border-yellow-800/40 pb-2.5 pr-8">
          <div className="w-8 h-8 rounded-lg bg-yellow-950 border border-yellow-600/40 flex items-center justify-center text-amber-400 shrink-0">
            <Repeat className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-amber-200 tracking-wide">
              循環模式快速設定
            </h2>
            <p className="text-[11px] text-amber-400/80">
              {bookName} 第 {viewChapter} {chapterUnit}（共 {totalChapters} {chapterUnit}）
            </p>
          </div>
        </div>

        {/* 4 個畫面區塊（本卷、本章、特定、單次）在單一頁面，底色為米黃色 */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          {/* 畫面 1：本卷 */}
          <div
            onClick={() => handleApplyScope('BOOK')}
            className={`p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative group text-left ${
              currentLoopScope === 'BOOK'
                ? 'bg-[#FEF3C7] border-2 border-amber-500 shadow-md ring-2 ring-amber-400/50'
                : 'bg-[#FDF6E2] border-amber-300/80 hover:bg-[#FFFDF7] hover:border-amber-400 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`p-1 rounded-md ${currentLoopScope === 'BOOK' ? 'bg-amber-500 text-black' : 'bg-amber-200/80 text-amber-900'}`}>
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-sm text-stone-900">本卷</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  畫面一
                </span>
              </div>
              <p className="text-[11px] text-stone-800 leading-tight font-medium">
                全卷循環（1~{totalChapters}{chapterUnit}）
              </p>
              <p className="text-[10px] text-stone-600 mt-1">
                唸完重頭自第 1 {chapterUnit}開始
              </p>
            </div>

            <div className="mt-2.5 pt-1.5 border-t border-amber-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-900">顯示「本卷」</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded transition-colors ${
                currentLoopScope === 'BOOK'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-amber-800 bg-amber-100/80 border border-amber-300/60 group-hover:bg-amber-200 group-hover:text-amber-950'
              }`}>
                {currentLoopScope === 'BOOK' ? '✓ 使用中' : '選擇 →'}
              </span>
            </div>
          </div>

          {/* 畫面 2：本章 */}
          <div
            onClick={() => handleApplyScope('CHAPTER')}
            className={`p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative group text-left ${
              currentLoopScope === 'CHAPTER'
                ? 'bg-[#FEF3C7] border-2 border-amber-500 shadow-md ring-2 ring-amber-400/50'
                : 'bg-[#FDF6E2] border-amber-300/80 hover:bg-[#FFFDF7] hover:border-amber-400 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`p-1 rounded-md ${currentLoopScope === 'CHAPTER' ? 'bg-amber-500 text-black' : 'bg-amber-200/80 text-amber-900'}`}>
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-sm text-stone-900">本章</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  畫面二
                </span>
              </div>
              <p className="text-[11px] text-stone-800 leading-tight font-medium">
                本章循環（第 {viewChapter} {chapterUnit}）
              </p>
              <p className="text-[10px] text-stone-600 mt-1">
                本章反覆循環，不跨章
              </p>
            </div>

            <div className="mt-2.5 pt-1.5 border-t border-amber-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-900">顯示「本章」</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded transition-colors ${
                currentLoopScope === 'CHAPTER'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-amber-800 bg-amber-100/80 border border-amber-300/60 group-hover:bg-amber-200 group-hover:text-amber-950'
              }`}>
                {currentLoopScope === 'CHAPTER' ? '✓ 使用中' : '選擇 →'}
              </span>
            </div>
          </div>

          {/* 畫面 3：特定 */}
          <div
            onClick={() => handleApplyScope('VERSES')}
            className={`p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative group text-left ${
              currentLoopScope === 'VERSES'
                ? 'bg-[#FEF3C7] border-2 border-amber-500 shadow-md ring-2 ring-amber-400/50'
                : 'bg-[#FDF6E2] border-amber-300/80 hover:bg-[#FFFDF7] hover:border-amber-400 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`p-1 rounded-md ${currentLoopScope === 'VERSES' ? 'bg-amber-500 text-black' : 'bg-amber-200/80 text-amber-900'}`}>
                    <ListChecks className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-sm text-stone-900">特定</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  畫面三
                </span>
              </div>
              <p className="text-[11px] text-stone-800 leading-tight font-medium">
                特定幾節循環（TTS）
              </p>
              <p className="text-[10px] text-amber-900/90 mt-1 truncate font-semibold">
                已選：第 {selectedVerses.join(', ')} 節
              </p>
            </div>

            <div className="mt-2.5 pt-1.5 border-t border-amber-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-900">顯示「特定」</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded transition-colors ${
                currentLoopScope === 'VERSES'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-amber-800 bg-amber-100/80 border border-amber-300/60 group-hover:bg-amber-200 group-hover:text-amber-950'
              }`}>
                {currentLoopScope === 'VERSES' ? '✓ 使用中' : '選擇 →'}
              </span>
            </div>
          </div>

          {/* 畫面 4：單次 */}
          <div
            onClick={() => handleApplyScope('SINGLE')}
            className={`p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative group text-left ${
              currentLoopScope === 'SINGLE'
                ? 'bg-[#FEF3C7] border-2 border-amber-500 shadow-md ring-2 ring-amber-400/50'
                : 'bg-[#FDF6E2] border-amber-300/80 hover:bg-[#FFFDF7] hover:border-amber-400 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`p-1 rounded-md ${currentLoopScope === 'SINGLE' ? 'bg-amber-500 text-black' : 'bg-stone-200 text-stone-700'}`}>
                    <ArrowRightCircle className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-sm text-stone-900">單次</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  畫面四
                </span>
              </div>
              <p className="text-[11px] text-stone-800 leading-tight font-medium">
                正常單次朗讀（關閉循環）
              </p>
              <p className="text-[10px] text-stone-600 mt-1">
                唸完一章持續唸下一章、唸完一卷持續唸下一卷
              </p>
            </div>

            <div className="mt-2.5 pt-1.5 border-t border-amber-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-stone-700">顯示「單次」</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded transition-colors ${
                currentLoopScope === 'SINGLE'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-amber-800 bg-amber-100/80 border border-amber-300/60 group-hover:bg-amber-200 group-hover:text-amber-950'
              }`}>
                {currentLoopScope === 'SINGLE' ? '✓ 使用中' : '選擇 →'}
              </span>
            </div>
          </div>
        </div>

        {/* 快速節數微調（專屬「特定」畫面的快捷選擇） */}
        <div className="p-2.5 bg-zinc-950/70 rounded-xl border border-yellow-900/40 space-y-1.5">
          <div className="flex items-center justify-between text-xs flex-wrap gap-1">
            <span className="text-[11px] text-amber-300/90 font-medium">
              特定節微調（點選切換節數）：
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSelectOdds}
                className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 cursor-pointer border border-yellow-800/40 active:scale-95"
                title="選取 1, 3, 5 節"
              >
                1, 3, 5節
              </button>
              <button
                type="button"
                onClick={handleSelectAllVerses}
                className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 cursor-pointer border border-yellow-800/40 active:scale-95"
              >
                全選
              </button>
              <button
                type="button"
                onClick={handleClearVerses}
                className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-amber-200 cursor-pointer border border-yellow-800/40 active:scale-95"
              >
                重設
              </button>
            </div>
          </div>

          {/* 小型橫向 / 緊湊節數按鈕 */}
          <div className="max-h-16 overflow-y-auto p-1 bg-zinc-900/80 rounded-lg border border-zinc-800 flex flex-wrap gap-1">
            {Array.from({ length: totalVersesInChapter }, (_, i) => i + 1).map((vNum) => {
              const isSelected = selectedVerses.includes(vNum);
              return (
                <button
                  key={vNum}
                  type="button"
                  onClick={() => handleToggleVerse(vNum)}
                  className={`w-6 h-6 text-[11px] rounded font-bold transition-all cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'bg-amber-400 text-black shadow-xs ring-1 ring-amber-300'
                      : 'bg-zinc-950 text-zinc-400 hover:text-amber-200 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                  title={`第 ${vNum} 節`}
                >
                  {vNum}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[10px] text-zinc-400 truncate max-w-[200px] sm:max-w-[280px]">
              目前選中：第 {selectedVerses.join(', ')} 節
            </span>
            <button
              type="button"
              onClick={() => handleApplyScope('VERSES')}
              className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-black cursor-pointer shadow-xs active:scale-95"
            >
              確認套用特定節
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
