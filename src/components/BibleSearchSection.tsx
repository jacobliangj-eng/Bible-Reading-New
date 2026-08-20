import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Loader2,
  BookOpen,
  ArrowRight,
  Sparkles,
  ChevronDown,
  Filter,
  Volume2,
} from 'lucide-react';
import { BibleBook, BibleSearchResult, BibleVersion, Testament } from '../types';
import { parseScriptureReference, searchScriptureByKeyword, ReferenceMatch } from '../services/searchService';
import { BIBLE_BOOKS } from '../data/bibleBooks';

interface BibleSearchSectionProps {
  selectedVersion: BibleVersion;
  onNavigateToScripture: (bookId: string, chapter: number) => void;
}

const POPULAR_KEYWORDS = [
  '愛',
  '平安',
  '喜樂',
  '信心',
  '光明',
  '救恩',
  '恩典',
  '詩篇 23',
  '約 3:16',
  '創 1:1',
];

export const BibleSearchSection: React.FC<BibleSearchSectionProps> = ({
  selectedVersion,
  onNavigateToScripture,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [results, setResults] = useState<BibleSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [directReference, setDirectReference] = useState<ReferenceMatch | null>(null);
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | Testament>('ALL');
  const [displayCount, setDisplayCount] = useState<number>(12);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Instant direct reference check on input
  useEffect(() => {
    if (!searchTerm.trim()) {
      setDirectReference(null);
      return;
    }
    const matched = parseScriptureReference(searchTerm, selectedVersion);
    setDirectReference(matched);
  }, [searchTerm, selectedVersion]);

  // Execute full text search
  const executeSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setDisplayCount(12);

    try {
      const searchResults = await searchScriptureByKeyword(trimmed, selectedVersion);
      setResults(searchResults);
    } catch (err) {
      console.warn('Search error:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced auto-search when user types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length >= 1) {
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(val);
      }, 400);
    } else {
      setResults([]);
      setHasSearched(false);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setHasSearched(false);
    setDirectReference(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

  const handleChipClick = (keyword: string) => {
    setSearchTerm(keyword);
    executeSearch(keyword);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    executeSearch(searchTerm);
  };

  // Filtered results by Testament
  const filteredResults = results.filter((r) => {
    if (testamentFilter === 'ALL') return true;
    return r.testament === testamentFilter;
  });

  const otCount = results.filter((r) => r.testament === 'OT').length;
  const ntCount = results.filter((r) => r.testament === 'NT').length;

  // Helper to highlight matching keywords in verse text
  const renderHighlightedText = (text: string, keyword: string) => {
    if (!keyword.trim()) return text;
    const cleanKw = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${cleanKw})`, 'gi'));

    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === keyword.toLowerCase() ? (
            <mark
              key={i}
              className="bg-amber-400 text-black font-bold px-1 py-0.2 rounded mx-0.5 shadow-xs"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <div
      id="tier1-bible-search-section"
      className="mt-6 p-4 md:p-5 rounded-xl bg-gradient-to-b from-zinc-950/90 via-zinc-900/60 to-zinc-950 border border-yellow-700/40 shadow-lg relative overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-yellow-950/80 border border-yellow-600/40 text-amber-300">
            <Search className="w-4 h-4" />
          </div>
          <h2 className="text-sm md:text-base font-bold text-amber-200 tracking-wide">
            聖經全書快速搜尋
          </h2>
        </div>
        <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
          支援關鍵字（如：愛、平安）或書卷章節（如：約 3:16、詩篇 23）
        </span>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleFormSubmit} className="relative flex items-center">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-amber-400/80" />
            )}
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            placeholder="輸入關鍵字（例如：愛、平安、光）或書卷章節（例如：約 3:16、太 5、詩 23）..."
            className="w-full pl-10 pr-20 py-2.5 rounded-lg bg-zinc-900/90 border border-yellow-600/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-amber-100 placeholder-zinc-500 text-xs md:text-sm transition-all outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-12 pr-2 flex items-center text-zinc-400 hover:text-zinc-200 cursor-pointer"
              title="清除搜尋"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="absolute inset-y-1 right-1 px-3 rounded-md bg-yellow-200 hover:bg-yellow-100 text-zinc-900 border border-yellow-300 font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
          >
            搜尋
          </button>
        </div>
      </form>

      {/* Suggested keywords chips */}
      {!hasSearched && !searchTerm && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-zinc-500 flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-yellow-500/80" />
            熱門推薦:
          </span>
          {POPULAR_KEYWORDS.map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => handleChipClick(kw)}
              className="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-yellow-950 border border-yellow-700/30 hover:border-amber-500/60 text-zinc-300 hover:text-amber-200 text-xs font-mono transition-all cursor-pointer active:scale-95"
            >
              {kw}
            </button>
          ))}
        </div>
      )}

      {/* 1. Direct Reference Quick Jump Card */}
      {directReference && (
        <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-amber-950/90 via-yellow-950/70 to-zinc-950 border border-amber-400/80 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-black">
                  ⚡ 快速直達
                </span>
                <span className="text-xs text-zinc-400">
                  {directReference.book.testament === 'OT' ? '舊約' : '新約'}
                </span>
              </div>
              <h3 className="text-sm md:text-base font-bold text-amber-100 mt-0.5">
                {directReference.displayText}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onNavigateToScripture(
                directReference.book.id,
                directReference.chapter
              )
            }
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-200 hover:bg-yellow-100 text-zinc-900 font-bold text-xs md:text-sm shadow-md cursor-pointer transition-all active:scale-95 shrink-0 self-end sm:self-center"
          >
            <span>前往該章閱讀 / 朗讀</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Keyword Search Results List */}
      {hasSearched && (
        <div className="mt-4 space-y-3 animate-in fade-in duration-300">
          {/* Header & Testament Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-yellow-800/30">
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-200 font-medium">
                搜尋「<strong className="text-amber-400 font-bold">{searchTerm}</strong>」共找到{' '}
                <span className="text-yellow-300 font-mono font-bold">{results.length}</span> 處經文
              </span>
            </div>

            {results.length > 0 && (
              <div className="flex items-center gap-1 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setTestamentFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    testamentFilter === 'ALL'
                      ? 'bg-amber-500 text-black shadow-xs'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  全部 ({results.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTestamentFilter('OT')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    testamentFilter === 'OT'
                      ? 'bg-amber-500 text-black shadow-xs'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  舊約 ({otCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTestamentFilter('NT')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    testamentFilter === 'NT'
                      ? 'bg-amber-500 text-black shadow-xs'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  新約 ({ntCount})
                </button>
              </div>
            )}
          </div>

          {/* Results List */}
          {filteredResults.length > 0 ? (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {filteredResults.slice(0, displayCount).map((res, index) => {
                const isPsalm = res.bookId === 'PSA' || res.bookName.includes('詩篇');
                const unit = isPsalm ? '篇' : '章';

                return (
                  <div
                    key={`${res.bookId}_${res.chapter}_${res.verse}_${index}`}
                    onClick={() => onNavigateToScripture(res.bookId, res.chapter)}
                    className="p-3 rounded-lg bg-zinc-900/80 hover:bg-yellow-950/40 border border-yellow-700/30 hover:border-amber-500/60 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-yellow-500" />
                          <span>{res.bookName}</span>
                          <span className="font-mono text-amber-200">
                            第 {res.chapter} {unit} 第 {res.verse} 節
                          </span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                          {res.testament === 'OT' ? '舊約' : '新約'}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-zinc-300 font-serif leading-relaxed line-clamp-2">
                        {renderHighlightedText(res.text, searchTerm)}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 group-hover:bg-amber-500 text-zinc-300 group-hover:text-black font-bold text-xs transition-all shrink-0 self-end sm:self-center shadow-xs"
                    >
                      <span>前往該章</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              {/* Load More Button */}
              {filteredResults.length > displayCount && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setDisplayCount((prev) => prev + 20)}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-yellow-950 text-amber-300 hover:text-amber-200 border border-yellow-700/40 text-xs font-bold transition-all cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>查看更多經文 (剩餘 {filteredResults.length - displayCount} 處)</span>
                  </button>
                </div>
              )}
            </div>
          ) : !isSearching ? (
            <div className="py-8 text-center bg-zinc-900/40 rounded-xl border border-zinc-800">
              <p className="text-sm text-zinc-400 font-serif">
                未找到包含「<strong className="text-amber-300">{searchTerm}</strong>」的相關經文。
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                請嘗試簡化關鍵字（如：愛、信、望、平安），或使用書卷章節簡寫（如：約 3:16、太 5、詩 23）
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
