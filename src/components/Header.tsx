import React from 'react';
import { HelpCircle, Settings, SlidersHorizontal } from 'lucide-react';
import { AppSettings } from '../services/settingsService';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  settings?: AppSettings;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenHelp, settings }) => {
  const roleLabel = settings?.authorityRole === 'juiz' ? 'Vara Judicial' : 'Promotoria';

  return (
    <header className="h-14 flex items-center justify-between gap-6 px-4 md:px-6 bg-zinc-950 border-b border-zinc-800/80 text-zinc-100 shrink-0 select-none">
      {/* Zone 1: Brand wordmark & Institutional identity */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-bold tracking-[0.22em] text-zinc-100 uppercase font-mono">
          CLIO
        </span>
        <span className="h-4 w-px bg-zinc-800 hidden sm:inline-block" />
        <span className="text-xs text-zinc-400 font-sans hidden sm:inline truncate max-w-[280px] lg:max-w-none">
          Sistema de Registro Audiovisual de Audiências
        </span>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-4 text-xs text-zinc-400">
        <span className="px-2.5 py-1 rounded bg-zinc-900 text-zinc-200 font-medium border border-zinc-800/90 text-[11px]">
          Estúdio de Gravação
        </span>
        <button
          onClick={onOpenHelp}
          className="text-zinc-400 hover:text-zinc-200 transition-colors text-[11px]"
        >
          Cadeia de Custódia (Art. 158-B CPP)
        </button>
      </nav>

      {/* Zone 3: Actions (Configurações e Diretrizes) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="h-8 flex items-center gap-2 px-3 text-xs text-zinc-300 hover:text-zinc-100 bg-zinc-950 hover:bg-zinc-900 rounded-md transition-colors border border-zinc-800 hover:border-zinc-700 shadow-xs"
          title="Definir padrões institucionais: Promotor ou Juiz, Órgão Padrão e Titular"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
          <span>Configurações</span>
          {settings && (
            <span className="hidden xl:inline text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
              {settings.authorityRole === 'juiz' ? 'Juiz' : 'Promotor'}
            </span>
          )}
        </button>

        {/* Legal Guidelines button */}
        <button
          onClick={onOpenHelp}
          className="h-8 flex items-center gap-2 px-3 text-xs text-zinc-300 hover:text-zinc-100 bg-zinc-950 hover:bg-zinc-900 rounded-md transition-colors border border-zinc-800 hover:border-zinc-700 shadow-xs"
          title="Ajuda e Procedimentos Legais"
        >
          <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
          <span>Diretrizes Legais</span>
        </button>
      </div>
    </header>
  );
};
