import React, { useState, useEffect } from 'react';
import { Sparkles, Check, Calendar, Bookmark, Trash2, BookOpen, ListMusic, Play, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { BibleVersion, Bookmark as BookmarkType, PlaylistItem } from '../types';
import { VERSIONS } from '../data/bibleBooks';
import { getDailyVerse } from '../data/dailyVerses';
import { getBookmarks, removeBookmark } from '../services/bookmarkService';
import {
  getPlaylist,
  addToPlaylist,
  removeFromPlaylist,
  movePlaylistItem,
  clearPlaylist,
} from '../services/playlistService';
import { AddPlaylistModal } from './AddPlaylistModal';

interface Tier1VersionSelectProps {
  selectedVersion: BibleVersion;
  onSelectVersion: (version: BibleVersion) => void;
  onOpenBookmark?: (bookmark: BookmarkType) => void;
  onStartPlaylistPlayback?: (startIndex?: number) => void;
}

export const Tier1VersionSelect: React.FC<Tier1VersionSelectProps> = ({
  selectedVersion,
  onSelectVersion,
  onOpenBookmark,
  onStartPlaylistPlayback,
}) => {
  const versionKeys: BibleVersion[] = ['CUV', 'KJV', 'LSG'];
  const dailyVerse = getDailyVerse(selectedVersion);

  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setBookmarks(getBookmarks());
    setPlaylist(getPlaylist());
  }, []);

  const handleDeleteBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removeBookmark(id);
    setBookmarks(updated);
  };

  const handleAddItemToPlaylist = (item: Omit<PlaylistItem, 'id' | 'createdAt'>) => {
    const updated = addToPlaylist(item);
    setPlaylist(updated);
  };

  const handleRemovePlaylistItem = (id: string) => {
    const updated = removeFromPlaylist(id);
    setPlaylist(updated);
  };

  const handleMovePlaylistItem = (id: string, direction: 'up' | 'down') => {
    const updated = movePlaylistItem(id, direction);
    setPlaylist(updated);
  };

  const handleClearPlaylist = () => {
    if (playlist.length === 0) return;
    if (window.confirm('確定要清空整份播放清單嗎？')) {
      const updated = clearPlaylist();
      setPlaylist(updated);
    }
  };

  const handleImportBookmarksToPlaylist = () => {
    if (bookmarks.length === 0) return;
    let addedCount = 0;
    bookmarks.forEach((b) => {
      addToPlaylist({
        version: b.version,
        bookId: b.bookId,
        bookName: b.bookName,
        chapter: b.chapter,
        readingMode: b.readingMode || (b.startVerse ? 'VERSES' : 'CHAPTERS'),
        startVerse: b.startVerse,
        endVerse: b.endVerse,
      });
      addedCount++;
    });
    setPlaylist(getPlaylist());
    alert(`成功將 ${addedCount} 個書籤匯入至播放清單！`);
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

      {/* Daily Verse Bar */}
      <div className="mt-6 p-4 rounded-xl bg-zinc-950/80 border border-yellow-600/30 text-center shadow-md relative overflow-hidden">
        <div className="absolute inset-0 bg-gold-glow opacity-30 pointer-events-none" />
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-950/60 border border-yellow-600/40 text-amber-300 text-[10px] font-semibold mb-2">
          <Calendar className="w-3 h-3 text-yellow-400" />
          <span>每日金句</span>
        </div>
        <p className="text-sm md:text-base font-serif italic text-amber-200 leading-tight">
          {dailyVerse.text}
        </p>
        <p className="text-[11px] text-yellow-500/70 mt-1 font-mono">
          {dailyVerse.reference}
        </p>
      </div>

      {/* 我的播放清單 (My Playlist) Section */}
      <div className="mt-8 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-yellow-800/40">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <ListMusic className="w-5 h-5 text-yellow-400" />
            <span>我的播放清單 (My Playlist)</span>
            <span className="text-xs font-mono font-normal text-yellow-500/80 bg-yellow-950/80 border border-yellow-700/40 px-2 py-0.5 rounded-full">
              {playlist.length} 首章節
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {playlist.length > 0 && (
              <button
                onClick={() => onStartPlaylistPlayback && onStartPlaylistPlayback(0)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all transform hover:scale-[1.02]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>開始連續播放</span>
              </button>
            )}

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-yellow-950 border border-yellow-700/60 hover:border-amber-400 text-amber-300 text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增章節</span>
            </button>

            {bookmarks.length > 0 && (
              <button
                onClick={handleImportBookmarksToPlaylist}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-yellow-900/40 hover:border-amber-500/50 text-zinc-300 hover:text-amber-200 text-xs font-medium flex items-center gap-1 transition-all"
                title="將書籤列表內容匯入播放清單"
              >
                <Bookmark className="w-3 h-3 text-yellow-400" />
                <span>匯入書籤</span>
              </button>
            )}

            {playlist.length > 0 && (
              <button
                onClick={handleClearPlaylist}
                className="p-1.5 rounded-xl bg-zinc-900 border border-red-900/30 text-zinc-500 hover:text-red-400 hover:border-red-800/50 transition-colors"
                title="清空播放清單"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {playlist.length === 0 ? (
          <div className="p-6 rounded-xl bg-zinc-950/60 border border-yellow-900/30 text-center space-y-2">
            <ListMusic className="w-8 h-8 text-yellow-600/30 mx-auto" />
            <p className="text-xs text-yellow-500/80 font-serif">播放清單目前無內容</p>
            <p className="text-[11px] text-zinc-500 font-light max-w-md mx-auto">
              點擊「新增章節」可自由選擇多個喜歡的經卷與章節建立播放順序，點擊「開始連續播放」即可不間斷自動連續收聽！
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {playlist.map((item, index) => {
              const versionBadge = VERSIONS[item.version]?.badge || item.version;
              const isVerseMode = item.readingMode === 'VERSES' || (item.startVerse !== undefined && item.endVerse !== undefined);

              return (
                <div
                  key={item.id}
                  className="group p-3 rounded-xl bg-zinc-950/90 border border-yellow-800/30 hover:border-amber-400/80 hover:bg-yellow-950/30 transition-all flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-yellow-950 text-amber-300 border border-yellow-700/50 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-yellow-950 text-amber-300 border border-yellow-600/30 shrink-0">
                          {versionBadge}
                        </span>
                        <h4 className="text-sm font-bold text-amber-100 group-hover:text-amber-300 truncate">
                          {item.bookName} 第 {item.chapter} 章
                          {isVerseMode && item.startVerse !== undefined && item.endVerse !== undefined && (
                            <span className="ml-1 text-amber-400 font-normal text-xs">
                              (第 {item.startVerse}~{item.endVerse} 節)
                            </span>
                          )}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onStartPlaylistPlayback && onStartPlaylistPlayback(index)}
                      className="px-2.5 py-1 rounded-lg bg-yellow-950 border border-yellow-600/40 text-amber-300 hover:bg-amber-400 hover:text-black hover:border-amber-300 text-xs font-bold flex items-center gap-1 transition-colors"
                      title="從此章節開始連續播放"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>播放</span>
                    </button>

                    <button
                      onClick={() => handleMovePlaylistItem(item.id, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded text-zinc-500 hover:text-amber-300 hover:bg-yellow-950/50 disabled:opacity-30 disabled:hover:text-zinc-500"
                      title="上移"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleMovePlaylistItem(item.id, 'down')}
                      disabled={index === playlist.length - 1}
                      className="p-1 rounded text-zinc-500 hover:text-amber-300 hover:bg-yellow-950/50 disabled:opacity-30 disabled:hover:text-zinc-500"
                      title="下移"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleRemovePlaylistItem(item.id)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition-colors ml-1"
                      title="從清單移除"
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
                      {b.bookName} 第 {b.chapter} 章
                      {isVerseMode && b.startVerse !== undefined && b.endVerse !== undefined ? (
                        <span className="ml-1 text-amber-300 font-normal text-xs">
                          (第 {b.startVerse}~{b.endVerse} 節)
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
                      onClick={(e) => handleDeleteBookmark(b.id, e)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
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

      {/* Add Playlist Modal */}
      <AddPlaylistModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddItem={handleAddItemToPlaylist}
        defaultVersion={selectedVersion}
      />
    </div>
  );
};


