import React from 'react';
import { OitivaMetadata } from '../types/oitiva';
import { generateRecordingFilename } from '../services/cryptoHash';

interface MetadataFormProps {
  metadata: OitivaMetadata;
  onChange: (updated: Partial<OitivaMetadata>) => void;
  isRecording: boolean;
}

export const MetadataForm: React.FC<MetadataFormProps> = ({
  metadata,
  onChange,
  isRecording,
}) => {
  const filenamePreview = generateRecordingFilename(
    metadata.nomePessoa,
    metadata.numeroProcesso,
    new Date(),
    'webm'
  );

  return (
    <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg p-4 flex flex-col gap-3.5 text-xs">
      <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
        <span className="font-semibold text-zinc-200 tracking-wide uppercase text-[11px]">
          Identificação da Audiência & Depoente
        </span>
        <span className="text-[11px] text-zinc-400 font-mono">
          Carimbo Probatório
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Nome do Depoente */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Nome da Pessoa Ouvida (Depoente) *
          </label>
          <input
            type="text"
            disabled={isRecording}
            value={metadata.nomePessoa}
            onChange={(e) => onChange({ nomePessoa: e.target.value })}
            placeholder="Nome completo do depoente"
            className="w-full h-9 bg-zinc-950 border border-zinc-800 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/50 rounded-md px-2.5 text-xs text-zinc-100 placeholder-zinc-500 disabled:opacity-50 transition-colors"
          />
        </div>

        {/* Qualificação */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Condição Processual
          </label>
          <select
            disabled={isRecording}
            value={metadata.qualificacao}
            onChange={(e) => onChange({ qualificacao: e.target.value })}
            className="w-full h-9 bg-zinc-950 border border-zinc-800 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/50 rounded-md px-2.5 text-xs text-zinc-100 disabled:opacity-50 transition-colors"
          >
            <option value="Testemunha">Testemunha</option>
            <option value="Declarante">Declarante / Informante</option>
            <option value="Vítima">Vítima</option>
            <option value="Investigado">Investigado / Notificado</option>
            <option value="Réu">Réu / Acusado</option>
            <option value="Perito">Perito / Assistente Técnico</option>
          </select>
        </div>

        {/* Processo / Procedimento */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Nº dos Autos / Procedimento
          </label>
          <input
            type="text"
            disabled={isRecording}
            value={metadata.numeroProcesso}
            onChange={(e) => onChange({ numeroProcesso: e.target.value })}
            placeholder="Ex: 2026.0019284 / MPTO"
            className="w-full h-9 bg-zinc-950 border border-zinc-800 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/50 rounded-md px-2.5 text-xs text-zinc-100 placeholder-zinc-500 disabled:opacity-50 transition-colors"
          />
        </div>

        {/* Órgão / Instituição */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Órgão / Promotoria / Vara
          </label>
          <input
            type="text"
            disabled={isRecording}
            value={metadata.orgaoInstituicao}
            onChange={(e) => onChange({ orgaoInstituicao: e.target.value })}
            placeholder="Ex: Ministério Público do Estado do Tocantins"
            className="w-full h-9 bg-zinc-950 border border-zinc-800 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/50 rounded-md px-2.5 text-xs text-zinc-100 placeholder-zinc-500 disabled:opacity-50 transition-colors"
          />
        </div>

        {/* Documento (CPF / RG) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Documento (CPF / RG)
          </label>
          <input
            type="text"
            disabled={isRecording}
            value={metadata.documento}
            onChange={(e) => onChange({ documento: e.target.value })}
            placeholder="000.000.000-00"
            className="w-full h-9 bg-zinc-950 border border-zinc-800 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/50 rounded-md px-2.5 text-xs text-zinc-100 placeholder-zinc-500 disabled:opacity-50 transition-colors"
          />
        </div>

        {/* Autoridade Responsável */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Autoridade Conducente (Promotor/Juiz)
          </label>
          <input
            type="text"
            disabled={isRecording}
            value={metadata.autoridadeResponsavel}
            onChange={(e) => onChange({ autoridadeResponsavel: e.target.value })}
            placeholder="Nome da autoridade responsável"
            className="w-full h-9 bg-zinc-950 border border-zinc-800 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/50 rounded-md px-2.5 text-xs text-zinc-100 placeholder-zinc-500 disabled:opacity-50 transition-colors"
          />
        </div>
      </div>

      {/* Auto-Renaming Preview */}
      <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400">
        <span className="font-mono text-zinc-400">Arquivo de destino:</span>
        <span className="font-mono text-zinc-300 truncate" title={filenamePreview}>
          {filenamePreview}
        </span>
      </div>
    </div>
  );
};
