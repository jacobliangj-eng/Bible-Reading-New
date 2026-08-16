import React, { useEffect, useState } from 'react';
import { X, Volume2, Settings, Sparkles, Check, Moon, Sliders, Timer, Clock } from 'lucide-react';
import { BibleVersion } from '../types';
import { VERSIONS } from '../data/bibleBooks';
import { fixChineseTTSPronunciation } from '../data/dailyVerses';

interface AudioSettingsModalProps {
  isOpen: boolean;
  selectedVersion: BibleVersion;
  onClose: () => void;
  playbackSpeed?: number;
  onPlaybackSpeedChange?: (speed: number) => void;
  speechPitch?: number;
  onSpeechPitchChange?: (pitch: number) => void;
  fontSize?: 'normal' | 'large' | 'xlarge';
  onFontSizeChange?: (size: 'normal' | 'large' | 'xlarge') => void;
  selectedVoiceName?: string;
  onVoiceNameChange?: (voiceName: string) => void;
  isNightMode?: boolean;
  onNightModeChange?: (isNightMode: boolean) => void;
  sleepTimerEndTime?: number | null;
  onSetSleepTimer?: (minutes: number | null) => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  selectedVersion,
  onClose,
  playbackSpeed = 1.0,
  onPlaybackSpeedChange,
  speechPitch = 1.0,
  onSpeechPitchChange,
  fontSize = 'large',
  onFontSizeChange,
  selectedVoiceName = '',
  onVoiceNameChange,
  isNightMode = false,
  onNightModeChange,
  sleepTimerEndTime = null,
  onSetSleepTimer,
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const versionInfo = VERSIONS[selectedVersion];

  useEffect(() => {
    if (!sleepTimerEndTime) {
      setRemainingSeconds(0);
      return;
    }
    const updateRemaining = () => {
      const secs = Math.max(0, Math.ceil((sleepTimerEndTime - Date.now()) / 1000));
      setRemainingSeconds(secs);
    };
    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [sleepTimerEndTime]);

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
    } else {
      sampleText = fixChineseTTSPronunciation(sampleText);
    }

    const utterance = new SpeechSynthesisUtterance(sampleText);
    utterance.lang = versionInfo.langCode;
    utterance.rate = playbackSpeed;
    utterance.pitch = speechPitch;

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

        {/* 語音音調 (Pitch / 粗細) 滑桿 */}
        <div className="bg-zinc-900/90 p-3.5 rounded-xl border border-yellow-800/50 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>語音音調 (Pitch / 聲音粗細)</span>
            </label>
            <span className="text-xs font-mono font-bold text-amber-300 bg-yellow-950/80 px-2 py-0.5 rounded border border-yellow-700/50">
              {speechPitch < 1.0 ? `${speechPitch.toFixed(1)}x (低沉)` : speechPitch === 1.0 ? '1.0x (標準)' : `${speechPitch.toFixed(1)}x (高亢)`}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-bold text-zinc-400 shrink-0">低沉 (粗)</span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.1}
              value={speechPitch}
              onChange={(e) => onSpeechPitchChange && onSpeechPitchChange(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-zinc-950 rounded-lg"
            />
            <span className="text-[11px] font-bold text-zinc-400 shrink-0">高亢 (細)</span>
          </div>
          <p className="text-[10px] text-zinc-400 leading-tight">
            往左可使朗讀聲更加低沉厚重，往右則使聲音較高亢細緻。
          </p>
        </div>

        {/* 睡眠定時器 (Sleep Timer) */}
        <div className="bg-zinc-900/90 p-3.5 rounded-xl border border-yellow-800/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-yellow-950 border border-yellow-700/50 flex items-center justify-center text-amber-400 shrink-0">
                <Timer className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-amber-200 block">
                  睡眠定時器 (Sleep Timer)
                </label>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  睡前聆聽專用，指定時間後自動停止朗讀
                </p>
              </div>
            </div>

            {remainingSeconds > 0 && (
              <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-950/90 px-2 py-0.5 rounded-md border border-amber-500/50 animate-pulse flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>
                  {Math.floor(remainingSeconds / 60)}分{String(remainingSeconds % 60).padStart(2, '0')}秒
                </span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            {[
              { minutes: 0, label: '無定時' },
              { minutes: 15, label: '15 分鐘' },
              { minutes: 30, label: '30 分鐘' },
              { minutes: 60, label: '60 分鐘' },
            ].map((option) => {
              const isSelected =
                option.minutes === 0
                  ? !sleepTimerEndTime
                  : sleepTimerEndTime !== null &&
                    Math.abs((sleepTimerEndTime - Date.now()) / 1000 - option.minutes * 60) < 60;

              return (
                <button
                  key={option.minutes}
                  type="button"
                  onClick={() => {
                    if (onSetSleepTimer) {
                      onSetSleepTimer(option.minutes === 0 ? null : option.minutes);
                    }
                  }}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'bg-amber-500 text-black border-amber-300 font-extrabold shadow-md shadow-amber-500/20'
                      : 'bg-zinc-950 text-amber-200 border-yellow-700/40 hover:border-amber-500/60 hover:bg-zinc-800'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 夜間護眼模式 (Night Mode) 切換開關 */}
        <div className="bg-zinc-900/90 p-3.5 rounded-xl border border-yellow-800/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                isNightMode
                  ? 'bg-indigo-900/80 text-indigo-200 border border-indigo-500/60 shadow-inner'
                  : 'bg-yellow-950 text-amber-400 border border-yellow-700/50'
              }`}
            >
              <Moon className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-200">夜間模式 (Night Mode)</span>
                {isNightMode && (
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-indigo-900/90 text-indigo-200 border border-indigo-500/40">
                    深藍低對比已開啟
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight">
                主色調改為深藍色並降低對比度，減少夜間閱讀時的眼睛疲勞
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNightModeChange && onNightModeChange(!isNightMode)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isNightMode ? 'bg-indigo-600' : 'bg-zinc-700'
            }`}
            role="switch"
            aria-checked={isNightMode}
            title="開啟/關閉夜間深藍護眼模式"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isNightMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
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
