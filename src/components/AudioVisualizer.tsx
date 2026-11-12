import React, { useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface AudioVisualizerProps {
  currentLevel: number; // 0 to 1
  peakLevel: number;
  isMuted: boolean;
  gain: number;
  onToggleMute: () => void;
  onChangeGain: (gain: number) => void;
  onActivateAudio?: () => void;
  micLabel?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  currentLevel,
  peakLevel,
  isMuted,
  gain,
  onToggleMute,
  onChangeGain,
  onActivateAudio,
  micLabel,
}) => {
  const [showGainSlider, setShowGainSlider] = useState(false);

  const segmentCount = 20;
  const activeSegments = Math.round(currentLevel * segmentCount);
  const peakSegment = Math.round(peakLevel * segmentCount);

  return (
    <div
      onClick={onActivateAudio}
      className="flex items-center gap-3 bg-zinc-950/90 border border-zinc-800/80 rounded-md px-3 h-8 text-xs select-none"
    >
      {/* Mic mute button */}
      <button
        onClick={onToggleMute}
        title={isMuted ? 'Desmutar microfone' : 'Mutar microfone'}
        className={`p-1 rounded transition-colors ${
          isMuted
            ? 'text-rose-400 bg-rose-950/40'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
      </button>

      {/* Meter Bar */}
      <div className="flex flex-col gap-1 min-w-[130px] max-w-[180px] flex-1">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
          <span className="truncate max-w-[100px]" title={micLabel || 'Microfone Ativo'}>
            {micLabel ? micLabel.replace(/\s*\(.*\)/, '') : 'MIC 1'}
          </span>
          <span className="tabular-nums">
            {isMuted ? 'MUDO' : `${Math.round(currentLevel * 100)}%`}
          </span>
        </div>

        {/* LED segments */}
        <div className="flex items-center gap-[2px] h-2 bg-zinc-900 p-[1px] rounded border border-zinc-800/60">
          {Array.from({ length: segmentCount }).map((_, idx) => {
            const isActive = !isMuted && idx <= activeSegments;
            const isPeak = !isMuted && idx === peakSegment;

            let barColor = 'bg-zinc-800/60';
            if (isActive || isPeak) {
              if (idx > segmentCount * 0.85) {
                barColor = 'bg-rose-500';
              } else if (idx > segmentCount * 0.7) {
                barColor = 'bg-amber-400';
              } else {
                barColor = 'bg-emerald-500';
              }
            }

            return (
              <div
                key={idx}
                className={`flex-1 h-full rounded-[1px] transition-all duration-75 ${barColor} ${
                  isPeak && !isActive ? 'opacity-70' : ''
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Gain Button */}
      <div className="relative">
        <button
          onClick={() => setShowGainSlider(!showGainSlider)}
          className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded text-[10px] font-mono border border-zinc-800 transition-colors"
          title="Ganho de Áudio"
        >
          <Volume2 className="w-3 h-3" />
          <span>{gain.toFixed(1)}x</span>
        </button>

        {showGainSlider && (
          <div className="absolute bottom-full mb-2 right-0 bg-zinc-900 border border-zinc-700/80 rounded-md p-3 shadow-xl z-50 w-44">
            <div className="flex justify-between text-xs text-zinc-300 mb-2">
              <span>Ganho de Áudio</span>
              <span className="font-mono text-zinc-100">{gain.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={gain}
              onChange={(e) => onChangeGain(parseFloat(e.target.value))}
              className="w-full accent-zinc-300 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
              <span>0.5x</span>
              <span>1.0x</span>
              <span>3.0x</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
