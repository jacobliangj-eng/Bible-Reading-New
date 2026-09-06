import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { BibleBook, BibleVersion } from '../types';
import { BIBLE_BOOKS } from '../data/bibleBooks';
import { getRecentBookIds, addRecentBook } from '../services/lastReadService';

export interface BookChapterSelectorProps {
  selectedVersion: BibleVersion;
  initialTab?: 'BOOK' | 'CHAPTER';
  currentBook?: BibleBook;
  currentChapter?: number;
  onSelectChapter: (book: BibleBook, chapter: number) => void;
  onBack: () => void;
  isModal?: boolean;
}

export const BookChapterSelector: React.FC<BookChapterSelectorProps> = ({
  selectedVersion,
  initialTab = 'BOOK',
  currentBook,
  currentChapter = 1,
  onSelectChapter,
  onBack,
  isModal = false,
}) => {
  const [activeTab, setActiveTab] = useState<'BOOK' | 'CHAPTER'>(initialTab);
  const [activeBook, setActiveBook] = useState<BibleBook>(
    currentBook || BIBLE_BOOKS.find((b) => b.id === 'PSA') || BIBLE_BOOKS[0]
  );
  const [isRecentExpanded, setIsRecentExpanded] = useState<boolean>(true);
  const [isOtExpanded, setIsOtExpanded] = useState<boolean>(true);
  const [isNtExpanded, setIsNtExpanded] = useState<boolean>(true);

  // Sync activeBook when currentBook changes
  useEffect(() => {
    if (currentBook) {
      setActiveBook(currentBook);
    }
  }, [currentBook]);

  // Support Escape key to close modal
  useEffect(() => {
    if (!isModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModal, onBack]);

  // Keep track of recent books
  const recentBooks = useMemo(() => {
    const recentIds = getRecentBookIds();
    const books = recentIds
      .map((id) => BIBLE_BOOKS.find((b) => b.id === id))
      .filter((b): b is BibleBook => Boolean(b));
    return books;
  }, [activeBook]);

  const otBooks = useMemo(() => BIBLE_BOOKS.filter((b) => b.testament === 'OT'), []);
  const ntBooks = useMemo(() => BIBLE_BOOKS.filter((b) => b.testament === 'NT'), []);

  // Chapters list for active book
  const chapterList = useMemo(() => {
    const count = activeBook.chaptersCount || 1;
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [activeBook]);

  const handleBookClick = (book: BibleBook) => {
    setActiveBook(book);
    addRecentBook(book.id);
    setActiveTab('CHAPTER');
  };

  const handleChapterClick = (chapterNum: number) => {
    addRecentBook(activeBook.id);
    onSelectChapter(activeBook, chapterNum);
  };

  const content = (
    <div className="w-full h-full flex flex-col bg-[#f7f5dc] select-none">
      {/* Top Header Bar (深咖啡色 #593E36) - 刪除左邊往左箭號與右邊垂直三點，居中顯示頁籤 */}
      <div className="bg-[#593E36] text-white px-3 py-2 sm:py-2.5 flex items-center justify-center shrink-0 shadow-md">
        {/* Center: Segmented Book & Chapter Bookmark Tabs */}
        <div className="inline-flex items-center bg-[#463026] p-0.5 rounded-lg border border-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('BOOK')}
            className={`px-4 sm:px-6 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all cursor-pointer whitespace-nowrap max-w-[160px] sm:max-w-[200px] truncate ${
              activeTab === 'BOOK'
                ? 'bg-white text-[#3e2723] shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
            title={activeTab === 'CHAPTER' ? `目前為「${activeBook.name[selectedVersion]}」，點擊回到書卷選單` : '書卷選單'}
          >
            {activeTab === 'CHAPTER' ? activeBook.name[selectedVersion] : '書卷'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CHAPTER')}
            className={`px-5 sm:px-7 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'CHAPTER'
                ? 'bg-white text-[#3e2723] shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
            title="章節選單"
          >
            章
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'CHAPTER' ? (
        /* Chapter Selection Grid (圖1 / 附件1) */
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto bg-[#e5dece]" style={{ overflowAnchor: 'none' }}>
            <div className="grid grid-cols-5 gap-[1px] bg-[#d7cfbc]">
              {chapterList.map((ch) => {
                const isSelected =
                  activeBook.id === currentBook?.id && ch === currentChapter;
                return (
                  <button
                    key={`ch-${ch}`}
                    type="button"
                    onClick={() => handleChapterClick(ch)}
                    className={`h-16 sm:h-20 flex items-center justify-center cursor-pointer transition-all active:scale-95 select-none ${
                      isSelected
                        ? 'bg-[#fedac0] text-zinc-950 font-normal'
                        : 'bg-[#f7f5dc] text-zinc-900 font-normal hover:bg-[#ede9cb]'
                    }`}
                  >
                    <span className="text-xl sm:text-2xl font-normal">{ch}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Bar: Book Name & Chapter : Verse (深咖啡色 #593E36) */}
          <div
            onClick={isModal ? onBack : undefined}
            className={`bg-[#593E36] text-white py-2.5 px-4 text-center shrink-0 shadow-inner ${
              isModal ? 'cursor-pointer hover:bg-[#4a332c] active:bg-[#3d2923] transition-colors' : ''
            }`}
            title={isModal ? '點擊關閉選單' : undefined}
          >
            <span className="text-sm sm:text-base font-medium tracking-wide">
              {activeBook.name[selectedVersion]}{' '}
              {activeBook.id === currentBook?.id ? currentChapter : 1}:1
            </span>
          </div>
        </div>
      ) : (
        /* Book Selection Grid (圖2 / 附件2) */
        <div className="flex-1 overflow-y-auto bg-[#f7f5dc] select-none" style={{ overflowAnchor: 'none' }}>
          {/* Section 1: 最近記錄 */}
          {recentBooks.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setIsRecentExpanded(!isRecentExpanded)}
                className="w-full bg-[#593E36] text-white px-3 py-1.5 flex items-center gap-1.5 cursor-pointer select-none text-left"
              >
                <div className="w-4 h-4 rounded-full border border-white/60 flex items-center justify-center shrink-0">
                  <ChevronDown
                    className={`w-3 h-3 text-white transition-transform ${
                      isRecentExpanded ? '' : '-rotate-90'
                    }`}
                  />
                </div>
                <span className="text-sm font-bold tracking-wide">最近記錄</span>
              </button>

              {isRecentExpanded && (
                <div className="grid grid-cols-5 gap-[1px] bg-[#d7cfbc] border-b border-[#d7cfbc]">
                  {recentBooks.map((book) => {
                    const isSelected = book.id === activeBook.id;
                    return (
                      <button
                        key={`recent-${book.id}`}
                        type="button"
                        onClick={() => handleBookClick(book)}
                        className={`h-16 sm:h-20 flex flex-col items-center justify-center p-1 cursor-pointer transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-[#fedac0] text-zinc-950 font-normal'
                            : 'bg-[#f7f5dc] text-zinc-900 hover:bg-[#ede9cb]'
                        }`}
                      >
                        <span className="text-lg sm:text-xl font-normal leading-tight">
                          {book.shortName[selectedVersion]}
                        </span>
                        <span className="text-[11px] sm:text-xs text-zinc-800 truncate text-center font-normal mt-0.5 max-w-full px-0.5">
                          {book.name[selectedVersion]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section 2: 舊約 */}
          <div>
            <button
              type="button"
              onClick={() => setIsOtExpanded(!isOtExpanded)}
              className="w-full bg-[#593E36] text-white px-3 py-1.5 flex items-center gap-1.5 cursor-pointer select-none text-left"
            >
              <div className="w-4 h-4 rounded-full border border-white/60 flex items-center justify-center shrink-0">
                <ChevronDown
                  className={`w-3 h-3 text-white transition-transform ${
                    isOtExpanded ? '' : '-rotate-90'
                  }`}
                />
              </div>
              <span className="text-sm font-bold tracking-wide">舊約</span>
            </button>

            {isOtExpanded && (
              <div className="grid grid-cols-5 gap-[1px] bg-[#d7cfbc] border-b border-[#d7cfbc]">
                {otBooks.map((book) => {
                  const isSelected = book.id === activeBook.id;
                  return (
                    <button
                      key={`ot-${book.id}`}
                      type="button"
                      onClick={() => handleBookClick(book)}
                      className={`h-16 sm:h-20 flex flex-col items-center justify-center p-1 cursor-pointer transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-[#fedac0] text-zinc-950 font-normal'
                          : 'bg-[#f7f5dc] text-zinc-900 hover:bg-[#ede9cb]'
                      }`}
                    >
                      <span className="text-lg sm:text-xl font-normal leading-tight">
                        {book.shortName[selectedVersion]}
                      </span>
                      <span className="text-[11px] sm:text-xs text-zinc-800 truncate text-center font-normal mt-0.5 max-w-full px-0.5">
                        {book.name[selectedVersion]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: 新約 */}
          <div>
            <button
              type="button"
              onClick={() => setIsNtExpanded(!isNtExpanded)}
              className="w-full bg-[#593E36] text-white px-3 py-1.5 flex items-center gap-1.5 cursor-pointer select-none text-left"
            >
              <div className="w-4 h-4 rounded-full border border-white/60 flex items-center justify-center shrink-0">
                <ChevronDown
                  className={`w-3 h-3 text-white transition-transform ${
                    isNtExpanded ? '' : '-rotate-90'
                  }`}
                />
              </div>
              <span className="text-sm font-bold tracking-wide">新約</span>
            </button>

            {isNtExpanded && (
              <div className="grid grid-cols-5 gap-[1px] bg-[#d7cfbc] border-b border-[#d7cfbc]">
                {ntBooks.map((book) => {
                  const isSelected = book.id === activeBook.id;
                  return (
                    <button
                      key={`nt-${book.id}`}
                      type="button"
                      onClick={() => handleBookClick(book)}
                      className={`h-16 sm:h-20 flex flex-col items-center justify-center p-1 cursor-pointer transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-[#fedac0] text-zinc-950 font-normal'
                          : 'bg-[#f7f5dc] text-zinc-900 hover:bg-[#ede9cb]'
                      }`}
                    >
                      <span className="text-lg sm:text-xl font-normal leading-tight">
                        {book.shortName[selectedVersion]}
                      </span>
                      <span className="text-[11px] sm:text-xs text-zinc-800 truncate text-center font-normal mt-0.5 max-w-full px-0.5">
                        {book.name[selectedVersion]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onBack();
        }}
        className="fixed inset-0 z-50 bg-black/60 flex flex-col justify-end sm:justify-center items-center backdrop-blur-xs cursor-pointer"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full h-[92vh] sm:max-w-md md:max-w-lg sm:h-[92vh] sm:max-h-[850px] bg-[#f7f5dc] flex flex-col shadow-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden border-t sm:border border-[#8d6e63] cursor-default"
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md md:max-w-lg mx-auto min-h-[90vh] bg-[#f7f5dc] flex flex-col shadow-2xl sm:rounded-2xl overflow-hidden sm:my-4 border-x sm:border border-[#8d6e63]">
      {content}
    </div>
  );
};
