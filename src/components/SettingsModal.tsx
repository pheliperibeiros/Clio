import React, { useState } from 'react';
import { X, Check, Building2, Scale, User, Shield, RotateCcw } from 'lucide-react';
import { AppSettings, AuthorityRole, DEFAULT_SETTINGS, saveSettings } from '../services/settingsService';

interface SettingsModalProps {
  currentSettings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentSettings,
  onSave,
  onClose,
}) => {
  const [role, setRole] = useState<AuthorityRole>(currentSettings.authorityRole);
  const [authorityTitle, setAuthorityTitle] = useState(currentSettings.authorityTitle);
  const [authorityName, setAuthorityName] = useState(currentSettings.authorityName);
  const [defaultOrgao, setDefaultOrgao] = useState(currentSettings.defaultOrgao);
  const [defaultOfficer, setDefaultOfficer] = useState(currentSettings.defaultOfficer);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Preset switchers
  const handleSelectRole = (newRole: AuthorityRole) => {
    setRole(newRole);
    if (newRole === 'promotor') {
      setAuthorityTitle('Promotor de Justiça');
      if (!defaultOrgao || defaultOrgao.includes('Tribunal')) {
        setDefaultOrgao('Ministério Público do Estado do Tocantins');
      }
    } else if (newRole === 'juiz') {
      setAuthorityTitle('Juiz de Direito');
      if (!defaultOrgao || defaultOrgao.includes('Ministério')) {
        setDefaultOrgao('Tribunal de Justiça do Estado do Tocantins');
      }
    }
  };

  const handleApplyPresetOrgao = (orgao: string) => {
    setDefaultOrgao(orgao);
  };

  const handleResetToDefault = () => {
    setRole(DEFAULT_SETTINGS.authorityRole);
    setAuthorityTitle(DEFAULT_SETTINGS.authorityTitle);
    setAuthorityName(DEFAULT_SETTINGS.authorityName);
    setDefaultOrgao(DEFAULT_SETTINGS.defaultOrgao);
    setDefaultOfficer(DEFAULT_SETTINGS.defaultOfficer);
  };

  const handleSave = () => {
    const updated: AppSettings = {
      authorityRole: role,
      authorityTitle: authorityTitle.trim() || (role === 'juiz' ? 'Juiz de Direito' : 'Promotor de Justiça'),
      authorityName: authorityName.trim(),
      defaultOrgao: defaultOrgao.trim() || 'Ministério Público do Estado do Tocantins',
      defaultOfficer: defaultOfficer.trim(),
      defaultProcedimentoTipo: currentSettings.defaultProcedimentoTipo || 'Autos',
    };

    saveSettings(updated);
    onSave(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-950 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <Scale className="w-4 h-4 text-zinc-300" />
            <div>
              <h2 className="text-sm font-bold text-zinc-100 tracking-wide uppercase font-mono">
                Padrões Institucionais & Perfil
              </h2>
              <p className="text-xs text-zinc-400">
                Configure os valores que serão carregados por padrão em todas as novas oitivas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-zinc-300 leading-relaxed font-sans">
          {/* Section 1: Authority Profile Selection (Promotor vs Juiz) */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 block">
              1. Perfil da Autoridade Conducente *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option: Promotor de Justiça */}
              <button
                type="button"
                onClick={() => handleSelectRole('promotor')}
                className={`flex flex-col gap-1 p-3.5 rounded-lg border text-left transition-all ${
                  role === 'promotor'
                    ? 'bg-zinc-950 border-zinc-300 text-zinc-100 shadow-sm ring-1 ring-zinc-400/40'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-zinc-200" />
                    <span className="font-semibold text-xs text-zinc-100">Promotor(a) de Justiça</span>
                  </div>
                  {role === 'promotor' && <Check className="w-3.5 h-3.5 text-zinc-200" />}
                </div>
                <span className="text-[11px] text-zinc-400 leading-tight">
                  Ministério Público (Inquéritos Civis, PIC, Procedimentos Preparatórios)
                </span>
              </button>

              {/* Option: Juiz de Direito */}
              <button
                type="button"
                onClick={() => handleSelectRole('juiz')}
                className={`flex flex-col gap-1 p-3.5 rounded-lg border text-left transition-all ${
                  role === 'juiz'
                    ? 'bg-zinc-950 border-zinc-300 text-zinc-100 shadow-sm ring-1 ring-zinc-400/40'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-zinc-200" />
                    <span className="font-semibold text-xs text-zinc-100">Juiz(a) de Direito</span>
                  </div>
                  {role === 'juiz' && <Check className="w-3.5 h-3.5 text-zinc-200" />}
                </div>
                <span className="text-[11px] text-zinc-400 leading-tight">
                  Poder Judiciário (Audiências de Instrução e Julgamento, Varas)
                </span>
              </button>
            </div>
          </div>

          {/* Section 2: Custom Cargo & Authority Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Título Oficial da Autoridade
              </label>
              <input
                type="text"
                value={authorityTitle}
                onChange={(e) => setAuthorityTitle(e.target.value)}
                placeholder="Ex: Promotor de Justiça"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/50 rounded-md px-3 py-2 text-xs text-zinc-100 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Nome da Autoridade Titular (Opcional)
              </label>
              <input
                type="text"
                value={authorityName}
                onChange={(e) => setAuthorityName(e.target.value)}
                placeholder="Ex: Dr(a). Nome e Sobrenome"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/50 rounded-md px-3 py-2 text-xs text-zinc-100 transition-colors"
              />
            </div>
          </div>

          {/* Section 3: Órgão / Instituição Padrão */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Órgão / Instituição Padrão *
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Gravado no carimbo de vídeo e extrato</span>
            </div>
            <input
              type="text"
              value={defaultOrgao}
              onChange={(e) => setDefaultOrgao(e.target.value)}
              placeholder="Ex: Ministério Público do Estado do Tocantins"
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/50 rounded-md px-3 py-2 text-xs text-zinc-100 transition-colors"
            />

            {/* Quick chips for official bodies */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-zinc-500 mr-1">Sugestões rápidas:</span>
              <button
                type="button"
                onClick={() => handleApplyPresetOrgao('Ministério Público do Estado do Tocantins')}
                className="px-2 py-0.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 transition-colors"
              >
                MPTO (Ministério Público)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetOrgao('Tribunal de Justiça do Estado do Tocantins')}
                className="px-2 py-0.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 transition-colors"
              >
                TJTO (Tribunal de Justiça)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetOrgao('Defensoria Pública do Estado do Tocantins')}
                className="px-2 py-0.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 transition-colors"
              >
                DPE-TO
              </button>
            </div>
          </div>

          {/* Section 4: Responsável Técnico / Operador */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Responsável Padrão pela Gravação (Operador da Sessão)
            </label>
            <input
              type="text"
              value={defaultOfficer}
              onChange={(e) => setDefaultOfficer(e.target.value)}
              placeholder="Ex: Oficial de Promotoria / Secretário(a) de Audiência"
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/50 rounded-md px-3 py-2 text-xs text-zinc-100 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Redefinir para o padrão de fábrica (MPTO)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão MPTO</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-semibold transition-colors shadow-sm"
            >
              <Check className="w-3.5 h-3.5 text-zinc-950" />
              <span>{savedSuccess ? 'Salvo!' : 'Salvar e Aplicar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
