import React from 'react';
import { Sparkles, Check, Star, Calendar } from 'lucide-react';
import { BibleVersion } from '../types';
import { VERSIONS } from '../data/bibleBooks';
import { getDailyVerse } from '../data/dailyVerses';

interface Tier1VersionSelectProps {
  selectedVersion: BibleVersion;
  onSelectVersion: (version: BibleVersion) => void;
}

export const Tier1VersionSelect: React.FC<Tier1VersionSelectProps> = ({
  selectedVersion,
  onSelectVersion,
}) => {
  const versionKeys: BibleVersion[] = ['CUV', 'KJV', 'LSG'];
  const dailyVerse = getDailyVerse(selectedVersion);

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
    </div>
  );
};
