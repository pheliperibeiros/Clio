import React, { useState } from 'react';
import { Download, Copy, Check, FileText, X } from 'lucide-react';
import { ExtratoData, formatDuration, formatBytes, generateExtratoPdf } from '../services/pdfGenerator';
import { formatSha256ForDisplay } from '../services/cryptoHash';

interface ExtratoModalProps {
  data: ExtratoData;
  videoBlob: Blob;
  onClose: () => void;
}

export const ExtratoModal: React.FC<ExtratoModalProps> = ({ data, videoBlob, onClose }) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [videoUrl] = useState(() => URL.createObjectURL(videoBlob));

  const handleCopyHash = () => {
    navigator.clipboard.writeText(data.sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownloadPdf = () => {
    const doc = generateExtratoPdf(data);
    const pdfFilename = data.filename.replace(/\.[^/.]+$/, '') + '_EXTRATO.pdf';
    doc.save(pdfFilename);
  };

  const handleDownloadVideo = () => {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = data.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-950 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-bold text-zinc-100 tracking-wide uppercase font-mono">
              Extrato Oficial de Registro Audiovisual
            </h2>
            <p className="text-xs text-zinc-400">
              Gravação finalizada e verificada criptograficamente (SHA-256)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-zinc-300">
          {/* Main Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-md p-3 flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Depoente
              </span>
              <span className="font-semibold text-zinc-100 truncate" title={data.metadata.nomePessoa}>
                {data.metadata.nomePessoa || 'Não informado'}
              </span>
              <span className="text-[11px] text-zinc-400">
                {data.metadata.qualificacao || 'Testemunha'}
              </span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800/80 rounded-md p-3 flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Duração
              </span>
              <span className="font-mono text-sm font-semibold text-zinc-100">
                {formatDuration(data.durationSeconds)}
              </span>
              <span className="text-[11px] text-zinc-400">
                {data.startedAt.toLocaleTimeString('pt-BR')} às {data.endedAt.toLocaleTimeString('pt-BR')}
              </span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800/80 rounded-md p-3 flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Tamanho
              </span>
              <span className="font-mono text-sm font-semibold text-zinc-100">
                {formatBytes(data.totalBytes)}
              </span>
              <span className="text-[11px] text-zinc-400">
                Contêiner Contínuo
              </span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800/80 rounded-md p-3 flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Resolução
              </span>
              <span className="font-semibold text-zinc-100">
                1920x1080
              </span>
              <span className="text-[11px] text-zinc-400">
                {data.fps} FPS
              </span>
            </div>
          </div>

          {/* Cryptographic SHA-256 Block */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-md p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                Código Hash de Integridade Probatória (SHA-256)
              </span>
              <button
                onClick={handleCopyHash}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs rounded border border-zinc-800 transition-colors"
              >
                {copiedHash ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar Hash</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-2.5 bg-zinc-900/80 rounded border border-zinc-800 font-mono text-[11px] text-zinc-200 break-all select-all leading-relaxed">
              {formatSha256ForDisplay(data.sha256)}
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              O hash criptográfico acima garante a inalterabilidade do registro audiovisual em conformidade com o Art. 158-B do CPP. Qualquer edição ou supressão posterior modifica o valor hash.
            </p>
          </div>

          {/* Video Preview */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Prévia da Gravação com Carimbo
            </span>
            <div className="aspect-video max-h-52 w-full bg-black rounded-md overflow-hidden border border-zinc-800 flex items-center justify-center">
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-zinc-400 truncate max-w-sm" title={data.filename}>
            Arquivo: <span className="font-mono text-zinc-300">{data.filename}</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleDownloadVideo}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-md text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Vídeo (.webm)</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-semibold transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Emitir Extrato em PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
