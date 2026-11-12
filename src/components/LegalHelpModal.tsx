import React from 'react';
import { X, Check } from 'lucide-react';

interface LegalHelpModalProps {
  onClose: () => void;
}

export const LegalHelpModal: React.FC<LegalHelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-950 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-bold text-zinc-100 tracking-wide uppercase font-mono">
              Orientações Legais & Cadeia de Custódia
            </h2>
            <p className="text-xs text-zinc-400">
              Diretrizes para audiências e oitivas audiovisuais
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs text-zinc-300 leading-relaxed font-sans">
          <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Cadeia de Custódia Probatória (Art. 158-B do CPP)
            </h3>
            <p className="text-zinc-400">
              O Art. 158-B do Código de Processo Penal estabelece os procedimentos formais de custódia da evidência digital. O <strong>Clio</strong> atende a esses requisitos através dos seguintes mecanismos probatórios:
            </p>
            <ul className="space-y-1 text-zinc-400 pt-1">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-zinc-300 shrink-0 mt-0.5" />
                <span><strong>Carimbo temporal inalterável:</strong> Estampa de data, hora e processo gravada no fluxo de vídeo.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-zinc-300 shrink-0 mt-0.5" />
                <span><strong>Gravação tolerante a falhas:</strong> Contêiner MKV/WebM contínuo com diário de segurança.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-zinc-300 shrink-0 mt-0.5" />
                <span><strong>Integridade matemática:</strong> Cálculo de hash SHA-256 imediato ao encerrar a gravação.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-zinc-300 shrink-0 mt-0.5" />
                <span><strong>Certidão documental:</strong> Emissão de Extrato em PDF com assinatura eletrônica/física.</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1.5">
              <span className="font-semibold text-zinc-200 text-xs uppercase tracking-wider">
                Posicionamento de Câmeras
              </span>
              <p className="text-zinc-400 text-[11px]">
                <strong>Câmera 1 (Depoente):</strong> Enquadramento em plano médio na altura dos olhos.<br />
                <strong>Câmera 2 (Mesa/Sala):</strong> Visão angular da autoridade condutora e defensores.
              </p>
            </div>

            <div className="p-3.5 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1.5">
              <span className="font-semibold text-zinc-200 text-xs uppercase tracking-wider">
                Monitoramento de Áudio
              </span>
              <p className="text-zinc-400 text-[11px]">
                Acompanhe o indicador VU no rodapé do estúdio. Mantenha os níveis médios entre 30% e 70% para garantir clareza probatória nas transcrições oficiais.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-zinc-950 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium transition-colors border border-zinc-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
