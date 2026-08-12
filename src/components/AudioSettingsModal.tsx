import React, { useEffect, useState } from 'react';
import { X, Volume2, Settings, Sparkles, Check } from 'lucide-react';
import { BibleVersion } from '../types';
import { VERSIONS } from '../data/bibleBooks';

interface AudioSettingsModalProps {
  isOpen: boolean;
  selectedVersion: BibleVersion;
  onClose: () => void;
  playbackSpeed?: number;
  onPlaybackSpeedChange?: (speed: number) => void;
  fontSize?: 'normal' | 'large' | 'xlarge';
  onFontSizeChange?: (size: 'normal' | 'large' | 'xlarge') => void;
  selectedVoiceName?: string;
  onVoiceNameChange?: (voiceName: string) => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  selectedVersion,
  onClose,
  playbackSpeed = 1.0,
  onPlaybackSpeedChange,
  fontSize = 'large',
  onFontSizeChange,
  selectedVoiceName = '',
  onVoiceNameChange,
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const versionInfo = VERSIONS[selectedVersion];

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  if (!isOpen) return null;

  const handleCloseModal = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    onClose();
  };

  const handleTestVoice = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    let sampleText = '創世記第1章。神說：要有光，就有了光。';
    if (selectedVersion === 'KJV') {
      sampleText = 'Genesis, Chapter 1. In the beginning God created the heaven and the earth.';
    } else if (selectedVersion === 'LBS') {
      sampleText = 'Genèse, Chapitre 1. Au commencement, Dieu créa les cieux et la terre.';
    }

    const utterance = new SpeechSynthesisUtterance(sampleText);
    utterance.lang = versionInfo.langCode;
    utterance.rate = playbackSpeed;

    if (selectedVoiceName) {
      const v = voices.find((v) => v.name === selectedVoiceName);
      if (v) utterance.voice = v;
    }

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      onClick={handleCloseModal}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in touch-manipulation cursor-pointer"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="gold-card p-4 sm:p-6 rounded-2xl max-w-md w-full relative border border-yellow-500/50 space-y-4 sm:space-y-5 max-h-[88vh] overflow-y-auto my-auto shadow-2xl cursor-default"
      >
        {/* Close Button */}
        <button
          onClick={handleCloseModal}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-zinc-400 hover:text-amber-300 p-2 rounded-xl bg-zinc-900/90 border border-yellow-700/50 hover:bg-zinc-800 active:scale-95 transition-all touch-manipulation z-20 cursor-pointer"
          title="關閉語音設定"
        >
          <X className="w-5 h-5 text-amber-300" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-950 border border-yellow-600/40 flex items-center justify-center text-amber-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gold-gradient">朗讀語音設定</h3>
            <p className="text-xs text-yellow-500/70">
              調整朗讀速度、經文字級與聲音引擎
            </p>
          </div>
        </div>

        {/* 置頂：語速與字級設定 (Top pinned settings) */}
        <div className="grid grid-cols-2 gap-3 bg-zinc-900/90 p-3.5 rounded-xl border border-yellow-800/50">
          {/* 語速 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-amber-200 block">
              朗讀語速 (Speed)
            </label>
            <select
              value={playbackSpeed}
              onChange={(e) => onPlaybackSpeedChange && onPlaybackSpeedChange(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-yellow-600/50 rounded-lg px-2.5 py-1.5 text-amber-200 text-xs font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value={0.5}>0.5x (慢速)</option>
              <option value={0.75}>0.75x (較慢)</option>
              <option value={1.0}>1.0x (標準)</option>
              <option value={1.25}>1.25x (稍快)</option>
              <option value={1.5}>1.5x (快速)</option>
              <option value={1.8}>1.8x (特快)</option>
              <option value={2.0}>2.0x (雙倍)</option>
            </select>
          </div>

          {/* 字級 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-amber-200 block">
              經文字級 (Size)
            </label>
            <select
              value={fontSize}
              onChange={(e) => onFontSizeChange && onFontSizeChange(e.target.value as any)}
              className="w-full bg-zinc-950 border border-yellow-600/50 rounded-lg px-2.5 py-1.5 text-amber-200 text-xs font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="normal">中 (標準)</option>
              <option value="large">大 (放大)</option>
              <option value="xlarge">特大 (超大)</option>
            </select>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-zinc-900/90 p-3.5 rounded-xl border border-yellow-800/40 text-xs space-y-2 text-zinc-300">
          <p className="flex items-center gap-2 text-amber-300 font-semibold">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>目前版本：{versionInfo.name}</span>
          </p>
          <p className="text-yellow-100/70">
            預設語系代碼：<code className="text-amber-400 font-mono">{versionInfo.langCode}</code>
          </p>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            本系統採用瀏覽器即時語音合成（Web Speech API），支援 66 卷經文逐節點擊高亮、無縫循環與彈性調速。
          </p>
        </div>

        {/* 磐石有聲事工 MP3 資訊 */}
        {selectedVersion === 'CUV' && (
          <div className="bg-yellow-950/40 border border-yellow-700/50 p-3.5 rounded-xl space-y-1.5 text-xs text-zinc-300">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>磐石有聲事工《中文和合本有聲聖經》說明</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              若您想收聽由<strong>磐石有聲事工（王濤峰弟兄國語朗讀）</strong>的整章/整卷真人錄音 MP3 檔案，您可前往「磐石有聲聖經網站」或使用相應的 Audio Bible App 下載完整的 MP3 音檔。
            </p>
            <p className="text-[10px] text-yellow-500/80 italic">
              （註：本網頁為實現逐節點擊、高亮字幕同步與無限循環，乃使用系統語音引擎即時生成發音。）
            </p>
          </div>
        )}

        {/* Voice Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-amber-200 block">
            選擇裝置朗讀語音 (Voice Engine):
          </label>
          <select
            value={selectedVoiceName}
            onChange={(e) => onVoiceNameChange && onVoiceNameChange(e.target.value)}
            className="w-full bg-zinc-900 border border-yellow-600/50 rounded-xl px-3 py-2 text-xs text-amber-200 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="">-- 自動預設最佳語音 --</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-yellow-900/40">
          <button
            onClick={handleTestVoice}
            className="btn-gold-outline px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform touch-manipulation cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>試聽範例</span>
          </button>

          <button
            onClick={handleCloseModal}
            className="btn-gold px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold active:scale-95 transition-transform touch-manipulation cursor-pointer shadow-md shadow-amber-500/20"
          >
            確定完成
          </button>
        </div>
      </div>
    </div>
  );
};
