import React from 'react';
import { Play, Square, Pause, HardDrive } from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  totalBytes: number;
  chunksCount: number;
  hasName: boolean;
  directDiskActive: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onTogglePause: () => void;
  onToggleDirectDisk: () => void;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  isPaused,
  elapsedSeconds,
  totalBytes,
  chunksCount,
  hasName,
  directDiskActive,
  onStartRecording,
  onStopRecording,
  onTogglePause,
  onToggleDirectDisk,
}) => {
  const h = Math.floor(elapsedSeconds / 3600);
  const m = Math.floor((elapsedSeconds % 3600) / 60);
  const s = Math.floor(elapsedSeconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  const timerStr = `${pad(h)}:${pad(m)}:${pad(s)}`;

  const formatMB = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1);
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg p-3.5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
      {/* Left: Timer & Recording Telemetry */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              isRecording
                ? isPaused
                  ? 'bg-amber-400'
                  : 'bg-rose-500 animate-pulse'
                : 'bg-zinc-700'
            }`}
          />

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-zinc-400">
              {isRecording
                ? isPaused
                  ? 'Gravação Pausada (Recesso)'
                  : 'Gravação Ativa'
                : 'Aguardando Início'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xl font-semibold tracking-tight text-zinc-100 tabular-nums">
                {timerStr}
              </span>
              {isRecording && (
                <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                  · {formatMB(totalBytes)} MB ({chunksCount} blocos)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400 font-mono">
          <span>MKV/WebM Contínuo (Tolerante a Falhas)</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
        {/* Direct Disk Stream Toggle */}
        <button
          onClick={onToggleDirectDisk}
          disabled={isRecording}
          className={`h-9 flex items-center gap-1.5 px-3 text-xs rounded-md border transition-colors ${
            directDiskActive
              ? 'bg-zinc-800 text-zinc-200 border-zinc-600'
              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-300'
          }`}
          title="Gravação direta no disco rígido para preservação de memória"
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>{directDiskActive ? 'Disco Físico: Direto' : 'Armazenamento: Local'}</span>
        </button>

        {isRecording ? (
          <>
            <button
              onClick={onTogglePause}
              className="h-9 flex items-center gap-1.5 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md border border-zinc-700 text-xs font-medium transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>{isPaused ? 'Retomar' : 'Pausar'}</span>
            </button>

            <button
              onClick={onStopRecording}
              className="h-9 flex items-center gap-2 px-4 bg-rose-700 hover:bg-rose-600 text-white rounded-md text-xs font-semibold transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Finalizar & Gerar Extrato</span>
            </button>
          </>
        ) : (
          <button
            onClick={onStartRecording}
            className={`h-9 flex items-center gap-2 px-5 rounded-md text-xs font-medium transition-colors ${
              hasName
                ? 'bg-rose-700 hover:bg-rose-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 cursor-pointer'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Iniciar Gravação da Oitiva</span>
          </button>
        )}
      </div>
    </div>
  );
};
