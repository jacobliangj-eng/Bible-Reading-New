import React, { useState, useMemo } from 'react';
import { Search, BookOpen, Layers, Compass } from 'lucide-react';
import { BibleBook, BibleVersion, Testament } from '../types';
import { BIBLE_BOOKS, VERSIONS } from '../data/bibleBooks';

interface Tier2BookSelectProps {
  selectedVersion: BibleVersion;
  onSelectBook: (book: BibleBook) => void;
  onGoHome: () => void;
}

export const Tier2BookSelect: React.FC<Tier2BookSelectProps> = ({
  selectedVersion,
  onSelectBook,
}) => {
  const [activeTestament, setActiveTestament] = useState<'ALL' | Testament>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const otBooks = useMemo(
    () => BIBLE_BOOKS.filter((b) => b.testament === 'OT'),
    []
  );
  const ntBooks = useMemo(
    () => BIBLE_BOOKS.filter((b) => b.testament === 'NT'),
    []
  );

  const filteredBooks = useMemo(() => {
    let list = BIBLE_BOOKS;
    if (activeTestament !== 'ALL') {
      list = list.filter((b) => b.testament === activeTestament);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((b) => {
        const nameInLang = b.name[selectedVersion].toLowerCase();
        const cuv = b.name.CUV.toLowerCase();
        const kjv = b.name.KJV.toLowerCase();
        const lsg = b.name.LSG.toLowerCase();
        const num = b.number.toString();
        return (
          nameInLang.includes(q) ||
          cuv.includes(q) ||
          kjv.includes(q) ||
          lsg.includes(q) ||
          num === q
        );
      });
    }
    return list;
  }, [activeTestament, searchQuery, selectedVersion]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-3 md:py-5">
      {/* Testament Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        {/* Testament Tabs */}
        <div className="flex items-center bg-zinc-900 p-1 rounded-lg border border-yellow-700/40 gap-1">
          <button
            onClick={() => setActiveTestament('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeTestament === 'ALL'
                ? 'bg-amber-400 text-black shadow-sm'
                : 'text-amber-200/80 hover:text-amber-100 hover:bg-zinc-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>全部 66 卷</span>
          </button>

          <button
            onClick={() => setActiveTestament('OT')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeTestament === 'OT'
                ? 'bg-amber-400 text-black shadow-sm'
                : 'text-amber-200/80 hover:text-amber-100 hover:bg-zinc-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>舊約 (39卷)</span>
          </button>

          <button
            onClick={() => setActiveTestament('NT')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeTestament === 'NT'
                ? 'bg-amber-400 text-black shadow-sm'
                : 'text-amber-200/80 hover:text-amber-100 hover:bg-zinc-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>新約 (27卷)</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋書卷名稱或簡稱..."
            className="w-full bg-zinc-900 border border-yellow-700/40 rounded-lg pl-8 pr-3 py-1.5 text-xs text-yellow-100 placeholder-yellow-600/60 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* Book Grid */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-8 gold-card rounded-xl">
          <p className="text-amber-300 font-semibold text-sm">未找到匹配的書卷</p>
          <p className="text-xs text-yellow-600 mt-0.5">請嘗試其他搜尋關鍵字</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* If ALL tab active and no search query, show OT & NT separated headers */}
          {activeTestament === 'ALL' && !searchQuery ? (
            <>
              {/* Old Testament Section */}
              <div>
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-yellow-700/40">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/80" />
                  <h3 className="text-base md:text-lg font-bold text-gold-bright tracking-wide">
                    舊約 39 卷 (Old Testament)
                  </h3>
                  <span className="text-[10px] text-yellow-500/80 bg-yellow-950 px-2 py-0.5 rounded-full border border-yellow-600/30 font-mono">
                    1 - 39
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {otBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      selectedVersion={selectedVersion}
                      onSelect={onSelectBook}
                    />
                  ))}
                </div>
              </div>

              {/* New Testament Section */}
              <div>
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-yellow-700/40 mt-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/80" />
                  <h3 className="text-base md:text-lg font-bold text-gold-bright tracking-wide">
                    新約 27 卷 (New Testament)
                  </h3>
                  <span className="text-[10px] text-yellow-500/80 bg-yellow-950 px-2 py-0.5 rounded-full border border-yellow-600/30 font-mono">
                    40 - 66
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {ntBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      selectedVersion={selectedVersion}
                      onSelect={onSelectBook}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Single Grid for OT/NT or filtered search */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {filteredBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  selectedVersion={selectedVersion}
                  onSelect={onSelectBook}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface BookCardProps {
  book: BibleBook;
  selectedVersion: BibleVersion;
  onSelect: (book: BibleBook) => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, selectedVersion, onSelect }) => {
  const bookName = book.name[selectedVersion];

  return (
    <div
      onClick={() => onSelect(book)}
      className="gold-card gold-card-hover p-2.5 rounded-lg cursor-pointer flex flex-col justify-between group select-none border border-yellow-600/30 hover:border-amber-400"
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="text-[9px] font-mono text-amber-500/80 bg-yellow-950/80 px-1 py-0.2 rounded border border-yellow-700/30">
          #{book.number}
        </span>
        <span className="text-[10px] text-zinc-400">
          {book.chaptersCount} 章
        </span>
      </div>

      <div>
        <h4 className="text-xs md:text-sm font-bold text-amber-100 group-hover:text-amber-300 transition-colors line-clamp-1 leading-snug">
          {bookName}
        </h4>
      </div>
    </div>
  );
};
