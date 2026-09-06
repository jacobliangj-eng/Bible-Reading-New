import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  X,
  Loader2,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { BibleBook, BibleVersion } from '../types';
import { searchBibleVerses, SearchVerseItem } from '../services/bibleService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVersion: BibleVersion;
  onJumpToScripture: (book: BibleBook, chapter: number, verse: number) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  selectedVersion,
  onJumpToScripture,
}) => {
  const [query, setQuery] = useState<string>('烏鴉');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [results, setResults] = useState<SearchVerseItem[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [searchedQuery, setSearchedQuery] = useState<string>('');
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // Perform search
  const handleExecuteSearch = async (qToSearch?: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const raw = typeof qToSearch === 'string' ? qToSearch : query;
    const cleanQ = raw.trim();
    if (!cleanQ) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      setSelectedResultId(null);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setSearchedQuery(cleanQ);

    try {
      const data = await searchBibleVerses(cleanQ, selectedVersion);
      setResults(data);
      if (data && data.length > 0) {
        setSelectedResultId(data[0].id);
      } else {
        setSelectedResultId(null);
      }
    } catch (err) {
      console.error('Search query failed:', err);
      setResults([]);
      setSelectedResultId(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced auto-search when query changes
  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      handleExecuteSearch(val);
    }, 450);
  };

  // Auto focus & initial search on open
  useEffect(() => {
    if (isOpen) {
      if (query.trim()) {
        handleExecuteSearch(query.trim());
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedResult = results.find((r) => r.id === selectedResultId) || results[0] || null;

  // Jump to selected scripture in TIER 3
  const handleJump = (itemToJump?: SearchVerseItem | null) => {
    const target = itemToJump || selectedResult;
    if (!target) {
      showToast('請先選擇任一筆經文');
      return;
    }
    onJumpToScripture(target.book, target.chapter, target.verse);
    onClose();
  };

  // Copy selected scripture to clipboard
  const handleCopy = async () => {
    if (!selectedResult) {
      showToast('請先選擇任一筆經文');
      return;
    }
    const formatted = `【${selectedResult.book.name[selectedVersion] || selectedResult.book.name.CUV} ${selectedResult.chapter}:${selectedResult.verse}】${selectedResult.text}`;
    try {
      await navigator.clipboard.writeText(formatted);
      showToast(`已複製【${selectedResult.book.shortName[selectedVersion] || selectedResult.book.shortName.CUV} ${selectedResult.chapter}:${selectedResult.verse}】經文`);
    } catch {
      const el = document.createElement('textarea');
      el.value = formatted;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      showToast(`已複製【${selectedResult.book.shortName[selectedVersion] || selectedResult.book.shortName.CUV} ${selectedResult.chapter}:${selectedResult.verse}】經文`);
    }
  };

  // Share selected scripture to other APPs
  const handleShare = async () => {
    if (!selectedResult) {
      showToast('請先選擇任一筆經文');
      return;
    }
    const bookTitle = selectedResult.book.name[selectedVersion] || selectedResult.book.name.CUV;
    const refStr = `${bookTitle} ${selectedResult.chapter}:${selectedResult.verse}`;
    const text = `【${refStr}】${selectedResult.text}\n— 聖經經文朗讀`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: refStr,
          text,
        });
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Navigator share error, falling back to copy:', err);
        } else {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      showToast(`已複製分享內容至剪貼簿`);
    } catch {
      showToast('無法調用分享，請手動複製經文');
    }
  };

  // Split query terms for highlighting (matches red font in 附件4)
  const queryTerms = searchedQuery
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  // Text highlighting renderer with RED color matching 附件4
  const renderHighlightedText = (text: string) => {
    if (!queryTerms || queryTerms.length === 0) {
      return text;
    }

    const escapedTerms = queryTerms
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .filter(Boolean);

    if (escapedTerms.length === 0) return text;

    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      const isMatch = queryTerms.some(
        (term) => term.toLowerCase() === part.toLowerCase()
      );
      if (isMatch) {
        return (
          <span
            key={index}
            className="text-[#c62828] font-bold"
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Version label on top right
  const versionShortLabel =
    selectedVersion === 'CUV'
      ? '新標點'
      : selectedVersion === 'KJV'
      ? 'KJV'
      : 'Segond';

  return (
    <div
      id="search-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center p-0 sm:p-3 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-stone-900/95 text-amber-200 px-3.5 py-1.5 rounded-full shadow-lg border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container matching 附件4 layout and parchment background */}
      <div
        id="search-modal-container"
        className="w-full h-full sm:h-[94vh] sm:max-h-[860px] sm:max-w-xl bg-[#fcf8e3] text-stone-900 flex flex-col sm:rounded-xl shadow-2xl overflow-hidden border border-[#593E36]/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar: 棕色背景、左←、中「搜索」、右「新標點」 */}
        <header className="bg-[#593E36] text-white h-11 px-3.5 flex items-center justify-between shrink-0 select-none shadow-sm">
          <button
            id="search-modal-back-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 -ml-1.5 flex items-center justify-center text-white/90 hover:text-white active:scale-95 transition-all touch-manipulation cursor-pointer"
            title="返回"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <span
            onClick={() => {
              handleExecuteSearch(query);
              inputRef.current?.blur();
            }}
            className="font-medium text-base tracking-wider text-white cursor-pointer select-none touch-manipulation"
            title="點擊執行搜尋"
          >
            搜索
          </span>

          <span className="text-xs text-white/90 font-normal pr-1">
            {versionShortLabel}
          </span>
        </header>

        {/* 聖經經文查詢框框置頂 (置頂在標題欄正下方) */}
        <div className="bg-[#fcf8e3] px-3 pt-2 pb-2 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteSearch(query);
              inputRef.current?.blur();
            }}
            action="#"
            className="flex items-center border border-[#8d6e63]/70 rounded-xs overflow-hidden shadow-xs bg-[#fbf7eb]"
          >
            {/* 左側「全書」標籤塊（手機上點選亦可立即執行查詢） */}
            <button
              type="button"
              onClick={() => {
                handleExecuteSearch(query);
                inputRef.current?.blur();
              }}
              className="bg-[#6d4c41] hover:bg-[#5d4037] active:bg-[#4e342e] text-white px-3.5 py-1.5 text-sm font-medium shrink-0 flex items-center justify-center border-r border-[#8d6e63]/70 select-none touch-manipulation cursor-pointer transition-colors"
              title="點選執行全書查詢"
            >
              全書
            </button>

            {/* 右側輸入欄位 */}
            <div className="relative flex-1 flex items-center">
              <input
                ref={inputRef}
                id="search-combination-input"
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleExecuteSearch(query);
                    inputRef.current?.blur();
                  }
                }}
                onCompositionEnd={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  handleQueryChange(val);
                }}
                placeholder="輸入字詞（例如：烏鴉 或 耶穌 世人）"
                className="w-full pl-2.5 pr-8 py-1.5 bg-[#fcf8e3] text-stone-900 placeholder:text-stone-400 text-sm font-medium focus:outline-none"
              />

              {/* 清除按鈕 */}
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setHasSearched(false);
                    inputRef.current?.focus();
                  }}
                  className="pr-1.5 text-stone-400 hover:text-stone-700 active:scale-90 touch-manipulation cursor-pointer"
                  title="清除"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* 手機即點搜尋按鈕（小放大鏡圖示，點擊立即執行） */}
              <button
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  handleExecuteSearch(query);
                  inputRef.current?.blur();
                }}
                className="pr-2.5 pl-1 py-1 text-[#6d4c41] hover:text-[#4e342e] active:scale-90 transition-transform touch-manipulation cursor-pointer flex items-center justify-center"
                title="執行搜尋"
              >
                <Search className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </form>
        </div>

        {/* 查詢結果清單區 (依附件4格式排列) */}
        <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-2 bg-[#fcf8e3]">
          {/* 總條數標題: 共搜索到相關經文 X 條 */}
          {hasSearched && (
            <div className="font-bold text-stone-900 text-sm sm:text-base pt-0.5 pb-1">
              {isSearching ? (
                <span className="flex items-center gap-1.5 text-stone-600">
                  <Loader2 className="w-4 h-4 animate-spin text-[#6d4c41]" />
                  <span>正在搜尋中...</span>
                </span>
              ) : (
                <span>共搜索到相關經文 {results.length} 條</span>
              )}
            </div>
          )}

          {/* 查無結果狀態 */}
          {!isSearching && hasSearched && results.length === 0 && (
            <div className="py-12 text-center text-stone-500 space-y-1">
              <p className="text-sm font-medium">查無包含「{searchedQuery}」的經文</p>
              <p className="text-xs text-stone-400">請嘗試更換關鍵字或確認字詞拼寫</p>
            </div>
          )}

          {/* 經文列表 (附件4格式: 綠色經卷章節 + 空格 + 經文本文 + 紅字關鍵字) */}
          {!isSearching &&
            results.map((item) => {
              const isSelected = selectedResult?.id === item.id;
              const shortBook =
                item.book.shortName[selectedVersion] || item.book.shortName.CUV;

              return (
                <div
                  key={item.id}
                  id={`search-result-item-${item.id}`}
                  onClick={() => setSelectedResultId(item.id)}
                  onDoubleClick={() => handleJump(item)}
                  className={`text-[16px] sm:text-[16px] leading-relaxed cursor-pointer select-none transition-colors py-1.5 px-1.5 rounded-sm touch-manipulation ${
                    isSelected
                      ? 'bg-[#edd99e]/45 ring-1 ring-[#c7a75c]/60'
                      : 'hover:bg-amber-100/30'
                  }`}
                >
                  {/* 綠色書卷縮寫與章節，例如: 創 8:7 */}
                  <span className="text-[#2e7d32] font-bold mr-1.5 select-none inline-block">
                    {shortBook} {item.chapter}:{item.verse}
                  </span>

                  {/* 經文內容 (關鍵字紅字標示) */}
                  <span className="text-stone-900">
                    {renderHighlightedText(item.text)}
                  </span>
                </div>
              );
            })}
        </div>

        {/* 底部3個控制項: 跳轉、複製、分享 (高度大幅縮小，棕色背景) */}
        <footer
          id="search-bottom-controls"
          className="bg-[#593E36] text-white h-10 px-2 flex items-center justify-around shrink-0 select-none shadow-md"
        >
          {/* 跳轉按鈕 */}
          <button
            id="search-ctrl-jump"
            type="button"
            onClick={() => handleJump()}
            disabled={!selectedResult}
            className="flex-1 h-full flex items-center justify-center text-white/95 hover:text-white active:bg-white/10 text-xs sm:text-sm font-medium transition-colors touch-manipulation cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="跳轉至該卷書經文閱讀 (TIER 3)"
          >
            跳轉
          </button>

          {/* 分隔線 */}
          <div className="w-[1px] h-3.5 bg-white/20" />

          {/* 複製按鈕 */}
          <button
            id="search-ctrl-copy"
            type="button"
            onClick={handleCopy}
            disabled={!selectedResult}
            className="flex-1 h-full flex items-center justify-center text-white/95 hover:text-white active:bg-white/10 text-xs sm:text-sm font-medium transition-colors touch-manipulation cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="複製選取的經文"
          >
            複製
          </button>

          {/* 分隔線 */}
          <div className="w-[1px] h-3.5 bg-white/20" />

          {/* 分享按鈕 */}
          <button
            id="search-ctrl-share"
            type="button"
            onClick={handleShare}
            disabled={!selectedResult}
            className="flex-1 h-full flex items-center justify-center text-white/95 hover:text-white active:bg-white/10 text-xs sm:text-sm font-medium transition-colors touch-manipulation cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="分享選取的經文至其他 APP"
          >
            分享
          </button>
        </footer>
      </div>
    </div>
  );
};
