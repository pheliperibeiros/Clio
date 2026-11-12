import React from 'react';
import { RefreshCw } from 'lucide-react';
import { DetectedDevice } from '../services/deviceManager';
import { LayoutMode } from '../types/oitiva';

interface DeviceSelectorProps {
  cameras: DetectedDevice[];
  microphones: DetectedDevice[];
  selectedCamera1Id: string | null;
  selectedCamera2Id: string | null;
  selectedMicrophoneId: string | null;
  layoutMode: LayoutMode;
  onSelectCamera1: (id: string) => void;
  onSelectCamera2: (id: string) => void;
  onSelectMicrophone: (id: string) => void;
  onChangeLayout: (mode: LayoutMode) => void;
  onRefreshDevices: () => void;
  isDetecting: boolean;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  cameras,
  microphones,
  selectedCamera1Id,
  selectedCamera2Id,
  selectedMicrophoneId,
  layoutMode,
  onSelectCamera1,
  onSelectCamera2,
  onSelectMicrophone,
  onChangeLayout,
  onRefreshDevices,
  isDetecting,
}) => {
  return (
    <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg p-4 flex flex-col gap-3.5 text-xs">
      {/* Top row: Status & Auto-Detect */}
      <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 text-zinc-300">
          <span className="font-semibold uppercase tracking-wide text-[11px]">
            Fontes de Captura Audiovisual
          </span>
          <span className="text-zinc-500">·</span>
          <span className="text-[11px] text-zinc-400 font-mono">
            {cameras.length} Câmera(s), {microphones.length} Mic(s)
          </span>
        </div>

        <button
          onClick={onRefreshDevices}
          disabled={isDetecting}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-700/60 transition-colors disabled:opacity-50"
          title="Redetectar dispositivos USB conectados"
        >
          <RefreshCw className={`w-3 h-3 ${isDetecting ? 'animate-spin text-zinc-100' : 'text-zinc-400'}`} />
          <span>Redetectar</span>
        </button>
      </div>

      {/* Device Selectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        {/* Camera 1 (Depoente) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Câmera 1 (Depoente / Testemunha)
          </label>
          <select
            value={selectedCamera1Id || ''}
            onChange={(e) => onSelectCamera1(e.target.value)}
            className="w-full h-9 bg-zinc-950 border border-zinc-800 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/50 rounded-md px-2.5 text-xs text-zinc-200 transition-colors"
          >
            {cameras.length === 0 ? (
              <option value="">Nenhuma câmera detectada</option>
            ) : (
              cameras.map((c) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label || 'Câmera Primária'}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Camera 2 (Mesa / Autoridade) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Câmera 2 (Mesa / Autoridade)
          </label>
          <select
            value={selectedCamera2Id || ''}
            onChange={(e) => onSelectCamera2(e.target.value)}
            className="w-full h-9 bg-zinc-950 border border-zinc-800 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/50 rounded-md px-2.5 text-xs text-zinc-200 transition-colors"
          >
            {cameras.length <= 1 ? (
              <option value="">Câmera 2 não conectada (Modo 1 Câmera)</option>
            ) : (
              <>
                <option value="">(Desativar 2ª Câmera)</option>
                {cameras.map((c) => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label || 'Câmera Secundária'}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* Microphone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Microfone Principal
          </label>
          <select
            value={selectedMicrophoneId || ''}
            onChange={(e) => onSelectMicrophone(e.target.value)}
            className="w-full h-9 bg-zinc-950 border border-zinc-800 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/50 rounded-md px-2.5 text-xs text-zinc-200 transition-colors"
          >
            {microphones.length === 0 ? (
              <option value="">Nenhum microfone detectado</option>
            ) : (
              microphones.map((m) => (
                <option key={m.deviceId} value={m.deviceId}>
                  {m.label || 'Microfone Padrão'}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Automated Layout Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
        <span className="text-[11px] text-zinc-400 font-medium">
          Composição de Cena:
        </span>

        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-md border border-zinc-800">
          <button
            onClick={() => onChangeLayout('split')}
            className={`h-7 px-2.5 text-xs rounded transition-colors flex items-center justify-center ${
              layoutMode === 'split'
                ? 'bg-zinc-800 text-zinc-100 font-medium shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Lado a Lado (50/50)
          </button>
          <button
            onClick={() => onChangeLayout('pip-camera1')}
            className={`h-7 px-2.5 text-xs rounded transition-colors flex items-center justify-center ${
              layoutMode === 'pip-camera1'
                ? 'bg-zinc-800 text-zinc-100 font-medium shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            PiP (Depoente)
          </button>
          <button
            onClick={() => onChangeLayout('pip-camera2')}
            className={`h-7 px-2.5 text-xs rounded transition-colors flex items-center justify-center ${
              layoutMode === 'pip-camera2'
                ? 'bg-zinc-800 text-zinc-100 font-medium shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            PiP (Mesa)
          </button>
          <button
            onClick={() => onChangeLayout('single-camera1')}
            className={`h-7 px-2.5 text-xs rounded transition-colors flex items-center justify-center ${
              layoutMode === 'single-camera1'
                ? 'bg-zinc-800 text-zinc-100 font-medium shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Câmera 1
          </button>
          <button
            onClick={() => onChangeLayout('single-camera2')}
            className={`h-7 px-2.5 text-xs rounded transition-colors flex items-center justify-center ${
              layoutMode === 'single-camera2'
                ? 'bg-zinc-800 text-zinc-100 font-medium shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Câmera 2
          </button>
        </div>
      </div>
    </div>
  );
};
