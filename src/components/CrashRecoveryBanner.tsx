import React from 'react';
import { Download, Trash2, AlertCircle } from 'lucide-react';
import { formatBytes } from '../services/pdfGenerator';
import { OitivaMetadata } from '../types/oitiva';

interface InterruptedSessionInfo {
  session: {
    id: string;
    metadata: OitivaMetadata;
    startedAt: string;
    mimeType: string;
  };
  chunkCount: number;
  totalSize: number;
}

interface CrashRecoveryBannerProps {
  recoverySessions: InterruptedSessionInfo[];
  onRecover: (sessionId: string) => void;
  onDismiss: (sessionId: string) => void;
  isRecovering: boolean;
}

export const CrashRecoveryBanner: React.FC<CrashRecoveryBannerProps> = ({
  recoverySessions,
  onRecover,
  onDismiss,
  isRecovering,
}) => {
  if (recoverySessions.length === 0) return null;

  const firstSession = recoverySessions[0];
  const dateStr = new Date(firstSession.session.startedAt).toLocaleString('pt-BR');
  const nome = firstSession.session.metadata?.nomePessoa || 'Depoente não identificado';

  return (
    <div className="bg-zinc-900 border border-amber-500/40 rounded-lg p-3.5 text-xs text-zinc-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-100 uppercase tracking-wide text-[11px]">
              Gravação Anterior Interrompida
            </span>
            <span className="text-zinc-600">·</span>
            <span className="font-mono text-zinc-400 text-[11px]">{dateStr}</span>
          </div>
          <p className="text-zinc-400 leading-relaxed text-[11px]">
            Sessão de <strong className="text-zinc-200">{nome}</strong> preservada no diário de segurança com <strong className="text-zinc-200">{formatBytes(firstSession.totalSize)}</strong> ({firstSession.chunkCount} blocos recuperados).
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
        <button
          onClick={() => onDismiss(firstSession.session.id)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded border border-zinc-800 text-[11px] transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          <span>Descartar</span>
        </button>

        <button
          onClick={() => onRecover(firstSession.session.id)}
          disabled={isRecovering}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded text-[11px] transition-colors disabled:opacity-50"
        >
          <Download className="w-3 h-3" />
          <span>{isRecovering ? 'Restaurando...' : 'Resgatar Gravação'}</span>
        </button>
      </div>
    </div>
  );
};
