import React, { useRef, useState } from 'react';
import { Download, ExternalLink, Music, Volume2, X, Check, Upload } from 'lucide-react';
import { ROCK_AUDIO_INFO } from '../services/rockAudioService';

interface RockAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookName: string;
  chapter: number;
  chapterUnit: string;
  onLocalFileSelected?: (file: File) => void;
}

export const RockAudioModal: React.FC<RockAudioModalProps> = ({
  isOpen,
  onClose,
  bookName,
  chapter,
  chapterUnit,
  onLocalFileSelected,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFileName(file.name);
      if (onLocalFileSelected) {
        onLocalFileSelected(file);
      }
      setTimeout(() => {
        onClose();
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-lg bg-zinc-950 border border-yellow-600/70 rounded-2xl shadow-2xl p-5 md:p-6 space-y-4 text-amber-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="關閉"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 pb-2 border-b border-yellow-700/40">
          <div className="p-2 rounded-xl bg-yellow-950/80 border border-yellow-600/50 text-amber-400">
            <Volume2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-bold text-amber-200">
              磐石有聲事工｜真人朗讀 MP3 下載
            </h3>
            <p className="text-xs text-zinc-400">
              中文和合本．{ROCK_AUDIO_INFO.narrator} 錄音
            </p>
          </div>
        </div>

        {/* Current Chapter Target Info */}
        <div className="p-3 bg-yellow-950/30 border border-yellow-800/40 rounded-xl space-y-1">
          <div className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-amber-400" />
            <span>當前選取：{bookName} 第 {chapter} {chapterUnit}</span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">
            以「章」為單位的朗讀模式已切換為<strong>磐石有聲事工（王濤峰弟兄國語朗讀）</strong>的整章真人錄音。您可直接線上聆聽，或前往磐石有聲聖經官方網站下載完整 66 卷 MP3 音檔收藏。
          </p>
        </div>

        {/* Download & Resource Links */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-amber-300">
            官方網站與下載資源：
          </h4>

          <div className="grid grid-cols-1 gap-2 text-xs">
            {/* Link 1: 磐石有聲聖經官方網站 */}
            <a
              href=""
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-yellow-600/40 hover:border-amber-400 hover:bg-yellow-950/60 transition-all text-amber-200 group"
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="font-bold">前往「磐石有聲聖經網站」下載完整 MP3</span>
                  <p className="text-[10px] text-zinc-400">官方網站提供整本聖經 MP3 音檔下載專區</p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            </a>

            {/* Link 2: 備用磐石有聲事工網站 */}
            <a
              href=""
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-yellow-600/40 hover:border-amber-400 hover:bg-yellow-950/60 transition-all text-amber-200 group"
            >
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="font-bold">磐石事工首頁</span>
                  <p className="text-[10px] text-zinc-400">了解更多事工異象、有聲書與見證分享</p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            </a>
          </div>
        </div>

        {/* Local File Upload Option for Offline Listening */}
        <div className="pt-2 border-t border-yellow-800/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300">
              載入本地已下載的 MP3 檔案（離線播放）：
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="audio/mp3,audio/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-yellow-900/60 border border-yellow-600/60 text-xs font-bold text-amber-200 hover:bg-amber-500 hover:text-black transition-all flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>選擇本地 MP3 檔案</span>
            </button>
            {selectedFileName ? (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                已載入：{selectedFileName}
              </span>
            ) : (
              <span className="text-[11px] text-zinc-500">
                可選取您已下載至手機或電腦的整章 MP3
              </span>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-colors"
          >
            確定完成
          </button>
        </div>
      </div>
    </div>
  );
};
