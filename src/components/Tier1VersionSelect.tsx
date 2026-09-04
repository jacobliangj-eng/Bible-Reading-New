import React, { useState, useEffect } from 'react';
import { Sparkles, Check, Calendar, Bookmark, Trash2, BookOpen, Volume2, AlertTriangle, X, History, Play, ArrowRight } from 'lucide-react';
import { BibleVersion, Bookmark as BookmarkType } from '../types';
import { VERSIONS } from '../data/bibleBooks';
import { getDailyVerse, getRandomVerse, formatReferenceForSpeech, fixChineseTTSPronunciation, DailyVerse } from '../data/dailyVerses';
import { getBookmarks, removeBookmark } from '../services/bookmarkService';
import { getLastReadRecord, LastReadRecord } from '../services/lastReadService';
import { BibleSearchSection } from './BibleSearchSection';

interface Tier1VersionSelectProps {
  selectedVersion: BibleVersion;
  onSelectVersion: (version: BibleVersion) => void;
  onOpenBookmark?: (bookmark: BookmarkType) => void;
  onOpenLastRead?: (record: LastReadRecord) => void;
  onNavigateToScripture?: (bookId: string, chapter: number) => void;
  playbackSpeed?: number;
  speechPitch?: number;
  selectedVoiceName?: string;
}

export const Tier1VersionSelect: React.FC<Tier1VersionSelectProps> = ({
  selectedVersion,
  onSelectVersion,
  onOpenBookmark,
  onOpenLastRead,
  onNavigateToScripture,
  playbackSpeed = 1.0,
  speechPitch = 1.0,
  selectedVoiceName = '',
}) => {
  const versionKeys: BibleVersion[] = ['CUV', 'KJV', 'LSG'];

  // Current Verse State
  const [currentVerse, setCurrentVerse] = useState<{ text: string; reference: string; rawVerse: DailyVerse }>(() =>
    getDailyVerse(selectedVersion)
  );

  // Speech State
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [bookmarkToDelete, setBookmarkToDelete] = useState<BookmarkType | null>(null);
  const [lastRead, setLastRead] = useState<LastReadRecord | null>(null);

  useEffect(() => {
    const refreshData = () => {
      setBookmarks(getBookmarks());
      setLastRead(getLastReadRecord());
    };

    refreshData();

    window.addEventListener('focus', refreshData);
    document.addEventListener('visibilitychange', refreshData);

    return () => {
      window.removeEventListener('focus', refreshData);
      document.removeEventListener('visibilitychange', refreshData);
    };
  }, []);

  // Sync displayed verse when selectedVersion changes
  useEffect(() => {
    setCurrentVerse((prev) => ({
      text: prev.rawVerse.text[selectedVersion] || prev.rawVerse.text.CUV,
      reference: prev.rawVerse.reference[selectedVersion] || prev.rawVerse.reference.CUV,
      rawVerse: prev.rawVerse,
    }));
  }, [selectedVersion]);

  // Clean up speech when unmounting
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getVerseLabel = (b: BookmarkType) => {
    if (b.verseNumbers && b.verseNumbers.length > 0) {
      if (b.verseNumbers.length === 1) {
        return `(第 ${b.verseNumbers[0]} 節)`;
      }
      const isConsecutive = b.verseNumbers.every((num, i, arr) => i === 0 || num === arr[i - 1] + 1);
      if (isConsecutive) {
        return `(第 ${b.verseNumbers[0]}~${b.verseNumbers[b.verseNumbers.length - 1]} 節)`;
      }
      return `(第 ${b.verseNumbers.join(', ')} 節)`;
    }
    if (b.startVerse !== undefined && b.endVerse !== undefined) {
      return b.startVerse === b.endVerse ? `(第 ${b.startVerse} 節)` : `(第 ${b.startVerse}~${b.endVerse} 節)`;
    }
    return '';
  };

  const handleRequestDelete = (bookmark: BookmarkType, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkToDelete(bookmark);
  };

  const handleConfirmDelete = () => {
    if (!bookmarkToDelete) return;
    const updated = removeBookmark(bookmarkToDelete.id);
    setBookmarks(updated);
    setBookmarkToDelete(null);
  };

  const handleCancelDelete = () => {
    setBookmarkToDelete(null);
  };

  const handleChangeVerse = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    const newVerse = getRandomVerse(selectedVersion);
    setCurrentVerse(newVerse);
  };

  const handleSpeakVerse = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('您的瀏覽器不支援語音合成朗讀功能');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    const spokenRef = formatReferenceForSpeech(currentVerse.reference, selectedVersion);
    const rawSpokenText = `${currentVerse.text}。 ${spokenRef}`;
    const spokenText = selectedVersion === 'CUV' ? fixChineseTTSPronunciation(rawSpokenText) : rawSpokenText;
    const utterance = new SpeechSynthesisUtterance(spokenText);

    const versionConfig = VERSIONS[selectedVersion];
    utterance.lang = versionConfig?.langCode || 'zh-TW';
    utterance.rate = playbackSpeed;
    utterance.pitch = speechPitch;

    // Apply voice if selectedVoiceName is specified
    if (selectedVoiceName) {
      const availableVoices = window.speechSynthesis.getVoices();
      const matchedVoice = availableVoices.find((v) => v.name === selectedVoiceName);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
      {/* Title Hero Banner */}
      <div className="text-center mb-4 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-950/60 border border-yellow-500/50 text-amber-300 text-xs font-semibold tracking-wider uppercase shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span>聖經版本選擇</span>
        </div>
      </div>

      {/* 3 Version Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {versionKeys.map((key) => {
          const info = VERSIONS[key];
          const isSelected = selectedVersion === key;

          return (
            <div
              key={key}
              onClick={() => onSelectVersion(key)}
              className={`relative cursor-pointer rounded-xl p-4 transition-all duration-300 flex flex-col justify-between select-none ${
                isSelected
                  ? 'bg-gradient-to-b from-yellow-950/70 via-black to-zinc-950 border-2 border-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.35)] scale-[1.01]'
                  : 'gold-card gold-card-hover hover:border-yellow-500/60'
              }`}
            >
              {/* Active Golden Tag */}
              {isSelected && (
                <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>已選擇</span>
                </div>
              )}

              <div className="space-y-2.5">
                {/* Title & Native Title */}
                <div>
                  <h3 className="text-lg font-bold text-amber-100 tracking-wide leading-tight group-hover:text-amber-300">
                    {info.name}
                  </h3>
                  <p className="text-[11px] font-mono text-yellow-500/80 mt-0.5 leading-none">
                    {info.nativeName}
                  </p>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-400 leading-snug font-light">
                  {info.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Last Read Resume Card (上次朗讀進度) */}
      {lastRead && (
        <div className="mt-5 p-3.5 md:p-4 rounded-xl bg-gradient-to-r from-amber-950/70 via-yellow-950/50 to-zinc-950 border border-amber-500/50 hover:border-amber-400 shadow-md hover:shadow-amber-500/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-amber-900/60 border border-amber-600/40 text-amber-300 group-hover:scale-105 transition-transform shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-900/80 text-amber-200 border border-amber-600/50">
                  上次朗讀進度
                </span>
                <span className="text-[10px] text-yellow-500/80 font-mono">
                  {new Date(lastRead.updatedAt).toLocaleDateString('zh-TW', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <h3 className="text-sm md:text-base font-bold text-amber-100 flex items-center gap-1.5">
                <span>{lastRead.bookName}</span>
                <span className="text-amber-300">
                  第 {lastRead.chapter} {lastRead.bookId === 'PSA' || lastRead.bookName.includes('詩篇') ? '篇' : '章'}
                  {lastRead.verse ? ` 第 ${lastRead.verse} 節` : ''}
                </span>
                <span className="text-xs font-normal text-zinc-400">({VERSIONS[lastRead.version]?.badge || lastRead.version})</span>
              </h3>
              {lastRead.previewText && (
                <p className="text-xs text-zinc-400 italic line-clamp-1 font-serif">
                  {lastRead.previewText}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenLastRead && onOpenLastRead(lastRead)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-200 hover:bg-yellow-100 text-zinc-900 border border-yellow-300/80 font-bold text-xs md:text-sm shadow-md hover:shadow-yellow-200/20 cursor-pointer transition-all active:scale-95 shrink-0 self-end sm:self-center"
          >
            <Play className="w-3.5 h-3.5 fill-zinc-900" />
            <span>繼續上次朗讀</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bible Fast Full-Text Search Section */}
      <BibleSearchSection
        selectedVersion={selectedVersion}
        onNavigateToScripture={(bookId, chapter) => {
          if (onNavigateToScripture) {
            onNavigateToScripture(bookId, chapter);
          }
        }}
      />

      {/* Daily Verse Card */}
      <div
        className={`mt-6 p-4 md:p-5 rounded-xl border transition-all duration-300 relative overflow-hidden select-none ${
          isSpeaking
            ? 'bg-gradient-to-r from-yellow-950/90 via-amber-950/80 to-zinc-950 border-amber-400 shadow-[0_0_20px_rgba(234,179,8,0.4)] ring-1 ring-amber-400/50'
            : 'bg-zinc-950/90 border-yellow-600/40'
        }`}
      >
        <div className="absolute inset-0 bg-gold-glow opacity-30 pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 relative z-10">
          <button
            onClick={handleChangeVerse}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-950/90 border border-yellow-600/60 hover:border-amber-400 hover:bg-yellow-900/90 text-amber-300 hover:text-amber-200 text-xs font-bold shadow-sm cursor-pointer transition-all active:scale-95 self-start group"
            title="點擊「今日金句」更換金句"
          >
            <Calendar className="w-3.5 h-3.5 text-yellow-400 group-hover:rotate-12 transition-transform" />
            <span>今日金句</span>
            <span className="text-[10px] text-yellow-500/80 font-normal ml-0.5"></span>
          </button>

        </div>

        {/* 經文內容區塊：點擊經文本身會自動朗讀 */}
        <div
          onClick={handleSpeakVerse}
          className="text-center space-y-1.5 relative z-10 py-2 px-3 cursor-pointer rounded-lg hover:bg-yellow-950/30 border border-transparent hover:border-yellow-700/30 transition-all group active:scale-[0.99]"
          title="點擊經文朗讀/停止"
        >
          <p
            className={`text-base md:text-lg font-serif italic text-amber-100 leading-relaxed group-hover:text-amber-200 transition-colors ${
              selectedVersion === 'KJV' || selectedVersion === 'LSG' ? 'font-calibri' : ''
            }`}
          >
            {currentVerse.text}
          </p>
          <p className="text-xs text-yellow-500/90 font-mono font-semibold tracking-wide">
            — {currentVerse.reference}
          </p>
        </div>
      </div>

      {/* 我的書籤 (My Bookmarks) Section */}
      <div className="mt-8 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-yellow-800/40">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <Bookmark className="w-4.5 h-4.5 text-yellow-400 fill-amber-400/20" />
            <span>我的書籤 (My Bookmarks)</span>
            <span className="text-xs font-mono font-normal text-yellow-500/80 bg-yellow-950/80 border border-yellow-700/40 px-2 py-0.5 rounded-full">
              {bookmarks.length} 個紀錄
            </span>
          </div>
        </div>

        {bookmarks.length === 0 ? (
          <div className="p-6 rounded-xl bg-zinc-950/60 border border-yellow-900/30 text-center space-y-2">
            <Bookmark className="w-8 h-8 text-yellow-600/30 mx-auto" />
            <p className="text-xs text-yellow-500/80 font-serif">目前尚無儲存的經文書籤</p>
            <p className="text-[11px] text-zinc-500 font-light">
              在第三階經文閱讀器中，點選章節旁邊的「書籤」小圖示即可將該章經文儲存於此。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {bookmarks.map((b) => {
              const versionBadge = VERSIONS[b.version]?.badge || b.version;
              const dateStr = new Date(b.savedAt).toLocaleDateString('zh-TW', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });

              const isVerseMode = b.readingMode === 'VERSES' || (b.startVerse !== undefined && b.endVerse !== undefined);

              return (
                <div
                  key={b.id}
                  onClick={() => onOpenBookmark && onOpenBookmark(b)}
                  className="group relative cursor-pointer p-3.5 rounded-xl bg-zinc-950/90 border border-yellow-700/40 hover:border-amber-400/80 hover:bg-yellow-950/40 transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-amber-500/10 flex flex-col justify-between space-y-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-950 text-amber-300 border border-yellow-600/30">
                          {versionBadge}
                        </span>
                        {isVerseMode && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-600/40">
                            節段朗讀
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {dateStr}
                      </span>
                    </div>

                    <h4 className={`text-sm font-bold text-amber-100 group-hover:text-amber-300 transition-colors ${b.version === 'KJV' || b.version === 'LSG' ? 'font-calibri' : ''}`}>
                      {b.version === 'KJV'
                        ? `${b.bookName} ${b.bookId === 'PSA' ? 'Psalm' : 'Chapter'} ${b.chapter}`
                        : b.version === 'LSG'
                        ? `${b.bookName} ${b.bookId === 'PSA' ? 'Psaume' : 'Chapitre'} ${b.chapter}`
                        : `${b.bookName} 第 ${b.chapter} ${b.bookId === 'PSA' || b.bookName.includes('詩篇') ? '篇' : '章'}`}
                      {getVerseLabel(b) ? (
                        <span className="ml-1 text-amber-300 font-normal text-xs">
                          {getVerseLabel(b)}
                        </span>
                      ) : null}
                    </h4>

                    {b.previewText && (
                      <p className={`text-xs text-zinc-400 line-clamp-2 italic font-serif group-hover:text-amber-200/80 ${b.version === 'KJV' || b.version === 'LSG' ? 'font-calibri' : ''}`}>
                        {b.previewText}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-yellow-900/30 text-[11px]">
                    <span className="text-amber-400/90 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      <span>快速前往閱讀</span>
                    </span>

                    <button
                      onClick={(e) => handleRequestDelete(b, e)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-950/50 transition-colors cursor-pointer"
                      title="刪除此書籤"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 刪除書籤確認彈窗 (Delete Confirmation Modal) */}
      {bookmarkToDelete && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={handleCancelDelete}
        >
          <div
            className="gold-card max-w-sm w-full p-5 rounded-2xl border border-yellow-600/50 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-yellow-800/40 pb-3">
              <h3 className="text-sm md:text-base font-bold text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>刪除書籤確認</span>
              </h3>
              <button
                onClick={handleCancelDelete}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800/60 transition-colors cursor-pointer"
                title="取消"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-zinc-300 leading-relaxed">
                確定要刪除以下經文書籤嗎？此操作無法復原。
              </p>
              <div className="bg-zinc-950/90 p-3 rounded-xl border border-yellow-900/60 text-xs text-amber-200 font-serif">
                <div className="font-bold text-amber-300 mb-1">
                  【{bookmarkToDelete.bookName}{' '}
                  {bookmarkToDelete.version === 'KJV'
                    ? `${bookmarkToDelete.bookId === 'PSA' ? 'Psalm' : 'Chapter'} ${bookmarkToDelete.chapter}`
                    : bookmarkToDelete.version === 'LSG'
                    ? `${bookmarkToDelete.bookId === 'PSA' ? 'Psaume' : 'Chapitre'} ${bookmarkToDelete.chapter}`
                    : `第 ${bookmarkToDelete.chapter} ${bookmarkToDelete.bookId === 'PSA' || bookmarkToDelete.bookName.includes('詩篇') ? '篇' : '章'}`}
                  {getVerseLabel(bookmarkToDelete) ? ` ${getVerseLabel(bookmarkToDelete)}` : ''}】
                </div>
                {bookmarkToDelete.previewText && (
                  <p className="text-zinc-400 text-[11px] line-clamp-2 italic">
                    {bookmarkToDelete.previewText}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-yellow-900/40">
              <button
                onClick={handleCancelDelete}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800/60 transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>確認刪除</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



