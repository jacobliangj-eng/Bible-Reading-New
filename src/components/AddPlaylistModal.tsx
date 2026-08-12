import React, { useState } from 'react';
import { X, Plus, BookOpen, Bookmark as BookmarkIcon, Check, Sparkles } from 'lucide-react';
import { BibleBook, BibleVersion, Bookmark, PlaylistItem, ReadingMode } from '../types';
import { BIBLE_BOOKS, VERSIONS } from '../data/bibleBooks';
import { getBookmarks } from '../services/bookmarkService';

interface AddPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: Omit<PlaylistItem, 'id' | 'createdAt'>) => void;
  defaultVersion?: BibleVersion;
}

export const AddPlaylistModal: React.FC<AddPlaylistModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
  defaultVersion = 'CUV',
}) => {
  const [tab, setTab] = useState<'SELECT' | 'BOOKMARK'>('SELECT');
  const [selectedVersion, setSelectedVersion] = useState<BibleVersion>(defaultVersion);
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedBook, setSelectedBook] = useState<BibleBook>(BIBLE_BOOKS[0]); // GEN
  const [chapter, setChapter] = useState<number>(1);
  const [mode, setMode] = useState<ReadingMode>('CHAPTERS');
  const [startVerse, setStartVerse] = useState<number>(1);
  const [endVerse, setEndVerse] = useState<number>(10);

  const [bookmarks] = useState<Bookmark[]>(() => getBookmarks());

  if (!isOpen) return null;

  const filteredBooks = BIBLE_BOOKS.filter((b) => {
    if (testamentFilter !== 'ALL' && b.testament !== testamentFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const cuvName = b.name.CUV.toLowerCase();
      const kjvName = b.name.KJV.toLowerCase();
      const lsgName = b.name.LSG.toLowerCase();
      return cuvName.includes(term) || kjvName.includes(term) || lsgName.includes(term);
    }
    return true;
  });

  const handleSelectBook = (book: BibleBook) => {
    setSelectedBook(book);
    setChapter(1);
    setStartVerse(1);
    setEndVerse(10);
  };

  const handleConfirmAdd = () => {
    const bookName = selectedBook.name[selectedVersion] || selectedBook.name.CUV;
    onAddItem({
      version: selectedVersion,
      bookId: selectedBook.id,
      bookName,
      chapter,
      readingMode: mode,
      startVerse: mode === 'VERSES' ? Math.min(startVerse, endVerse) : undefined,
      endVerse: mode === 'VERSES' ? Math.max(startVerse, endVerse) : undefined,
    });
    onClose();
  };

  const handleAddFromBookmark = (b: Bookmark) => {
    onAddItem({
      version: b.version,
      bookId: b.bookId,
      bookName: b.bookName,
      chapter: b.chapter,
      readingMode: b.readingMode || (b.startVerse ? 'VERSES' : 'CHAPTERS'),
      startVerse: b.startVerse,
      endVerse: b.endVerse,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-yellow-600/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-yellow-800/40 bg-gradient-to-r from-yellow-950/60 to-zinc-900">
          <div className="flex items-center gap-2 text-amber-200 font-bold">
            <Plus className="w-5 h-5 text-amber-400" />
            <span>新增章節至播放清單</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-200 hover:bg-yellow-950/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-yellow-900/40 bg-zinc-900/50 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setTab('SELECT')}
            className={`px-4 py-2 rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
              tab === 'SELECT'
                ? 'bg-yellow-950/80 text-amber-300 border-amber-400 font-bold'
                : 'text-zinc-400 border-transparent hover:text-amber-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>選擇書卷章節</span>
          </button>
          <button
            onClick={() => setTab('BOOKMARK')}
            className={`px-4 py-2 rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
              tab === 'BOOKMARK'
                ? 'bg-yellow-950/80 text-amber-300 border-amber-400 font-bold'
                : 'text-zinc-400 border-transparent hover:text-amber-200'
            }`}
          >
            <BookmarkIcon className="w-3.5 h-3.5 text-yellow-400" />
            <span>從我的書籤匯入 ({bookmarks.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {tab === 'SELECT' ? (
            <>
              {/* Version Selector */}
              <div>
                <label className="block text-xs font-bold text-amber-300/90 mb-1.5">
                  1. 選擇聖經版本
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CUV', 'KJV', 'LSG'] as BibleVersion[]).map((v) => {
                    const isSelected = selectedVersion === v;
                    return (
                      <button
                        key={v}
                        onClick={() => setSelectedVersion(v)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
                          isSelected
                            ? 'bg-yellow-950 border-amber-400 text-amber-200 shadow-md shadow-amber-500/20'
                            : 'bg-zinc-900/80 border-yellow-800/30 text-zinc-400 hover:border-yellow-600/50 hover:text-amber-200'
                        }`}
                      >
                        <div>{VERSIONS[v].badge}</div>
                        <div className="text-[10px] text-zinc-500 font-normal">{VERSIONS[v].language}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Book Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-amber-300/90">
                    2. 選擇經卷 ({selectedBook.name[selectedVersion] || selectedBook.name.CUV})
                  </label>
                  {/* Testament Filter */}
                  <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-yellow-900/30 text-[11px]">
                    <button
                      onClick={() => setTestamentFilter('ALL')}
                      className={`px-2 py-0.5 rounded ${testamentFilter === 'ALL' ? 'bg-yellow-950 text-amber-300 font-bold' : 'text-zinc-400'}`}
                    >
                      全部
                    </button>
                    <button
                      onClick={() => setTestamentFilter('OT')}
                      className={`px-2 py-0.5 rounded ${testamentFilter === 'OT' ? 'bg-yellow-950 text-amber-300 font-bold' : 'text-zinc-400'}`}
                    >
                      舊約
                    </button>
                    <button
                      onClick={() => setTestamentFilter('NT')}
                      className={`px-2 py-0.5 rounded ${testamentFilter === 'NT' ? 'bg-yellow-950 text-amber-300 font-bold' : 'text-zinc-400'}`}
                    >
                      新約
                    </button>
                  </div>
                </div>

                {/* Search */}
                <input
                  type="text"
                  placeholder="搜尋經卷名稱..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full mb-2 px-3 py-1.5 text-xs rounded-xl bg-zinc-900 border border-yellow-800/40 text-amber-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400"
                />

                {/* Grid of Books */}
                <div className="max-h-40 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 p-1 bg-zinc-900/50 rounded-xl border border-yellow-900/30">
                  {filteredBooks.map((b) => {
                    const isSelected = selectedBook.id === b.id;
                    const name = b.name[selectedVersion] || b.name.CUV;
                    return (
                      <button
                        key={b.id}
                        onClick={() => handleSelectBook(b)}
                        className={`p-1.5 rounded-lg text-xs font-medium text-left truncate transition-all ${
                          isSelected
                            ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-500/30'
                            : 'bg-zinc-900 hover:bg-yellow-950/60 text-zinc-300 hover:text-amber-200'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chapter & Mode Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-yellow-900/30">
                <div>
                  <label className="block text-xs font-bold text-amber-300/90 mb-1">
                    3. 選擇章數 (共 {selectedBook.chaptersCount} 章)
                  </label>
                  <select
                    value={chapter}
                    onChange={(e) => setChapter(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-900 border border-yellow-800/40 text-amber-100 font-bold focus:outline-none focus:border-amber-400"
                  >
                    {Array.from({ length: selectedBook.chaptersCount }, (_, i) => i + 1).map((ch) => (
                      <option key={ch} value={ch}>
                        第 {ch} 章
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-300/90 mb-1">
                    4. 朗讀模式
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-zinc-900 p-1 rounded-xl border border-yellow-800/30">
                    <button
                      onClick={() => setMode('CHAPTERS')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all ${
                        mode === 'CHAPTERS'
                          ? 'bg-yellow-950 text-amber-300 border border-amber-400/60 font-bold'
                          : 'text-zinc-400 hover:text-amber-200'
                      }`}
                    >
                      整章朗讀
                    </button>
                    <button
                      onClick={() => setMode('VERSES')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all ${
                        mode === 'VERSES'
                          ? 'bg-yellow-950 text-amber-300 border border-amber-400/60 font-bold'
                          : 'text-zinc-400 hover:text-amber-200'
                      }`}
                    >
                      指定節段
                    </button>
                  </div>
                </div>
              </div>

              {/* Verses Range Input */}
              {mode === 'VERSES' && (
                <div className="p-3 bg-yellow-950/30 border border-yellow-700/40 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    <span>指定節數範圍</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] text-zinc-400">起始節：</label>
                      <input
                        type="number"
                        min={1}
                        value={startVerse}
                        onChange={(e) => setStartVerse(Math.max(1, Number(e.target.value)))}
                        className="w-full px-2.5 py-1 text-xs rounded-lg bg-zinc-900 border border-yellow-800/40 text-amber-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <span className="text-zinc-500 font-bold pt-4">至</span>
                    <div className="flex-1">
                      <label className="text-[11px] text-zinc-400">結束節：</label>
                      <input
                        type="number"
                        min={1}
                        value={endVerse}
                        onChange={(e) => setEndVerse(Math.max(1, Number(e.target.value)))}
                        className="w-full px-2.5 py-1 text-xs rounded-lg bg-zinc-900 border border-yellow-800/40 text-amber-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* BOOKMARK TAB */
            <div className="space-y-2">
              <p className="text-xs text-zinc-400">點選以下任何書籤，快速將該經文加入播放清單：</p>
              {bookmarks.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs">尚無任何書籤記錄</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {bookmarks.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => handleAddFromBookmark(b)}
                      className="p-3 rounded-xl bg-zinc-900 border border-yellow-800/30 hover:border-amber-400 hover:bg-yellow-950/40 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-yellow-950 text-amber-300 border border-yellow-600/30">
                            {VERSIONS[b.version]?.badge || b.version}
                          </span>
                          <span className="text-xs font-bold text-amber-100 group-hover:text-amber-300">
                            {b.bookName} 第 {b.chapter} 章
                            {b.startVerse !== undefined && b.endVerse !== undefined && (
                              <span className="ml-1 text-xs font-normal text-amber-400">
                                (第 {b.startVerse}~{b.endVerse} 節)
                              </span>
                            )}
                          </span>
                        </div>
                        {b.previewText && (
                          <p className="text-[11px] text-zinc-400 line-clamp-1 italic">{b.previewText}</p>
                        )}
                      </div>

                      <div className="px-2 py-1 rounded bg-yellow-950 text-amber-300 border border-yellow-600/40 text-[11px] font-bold flex items-center gap-1 group-hover:bg-amber-400 group-hover:text-black transition-colors shrink-0">
                        <Plus className="w-3 h-3" />
                        <span>加入清單</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {tab === 'SELECT' && (
          <div className="p-4 border-t border-yellow-800/40 bg-zinc-900/80 flex items-center justify-between">
            <div className="text-xs text-amber-200/80 font-serif">
              將加入：
              <span className="font-bold text-amber-300 ml-1">
                {VERSIONS[selectedVersion]?.badge} ── {selectedBook.name[selectedVersion] || selectedBook.name.CUV} 第 {chapter} 章
                {mode === 'VERSES' && ` (第 ${Math.min(startVerse, endVerse)}~${Math.max(startVerse, endVerse)} 節)`}
              </span>
            </div>
            <button
              onClick={handleConfirmAdd}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>確定加入播放清單</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
