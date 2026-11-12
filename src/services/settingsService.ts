export type AuthorityRole = 'promotor' | 'juiz' | 'outro';

export interface AppSettings {
  authorityRole: AuthorityRole;
  authorityTitle: string; // "Promotor de Justiça", "Juiz de Direito", etc.
  authorityName: string; // Nome da autoridade titular
  defaultOrgao: string; // Órgão padrão (ex: Ministério Público do Estado do Tocantins)
  defaultOfficer: string; // Responsável pela gravação
  defaultProcedimentoTipo: string; // Tipo padrão (ex: Autos / Processo)
}

const SETTINGS_KEY = 'clio_app_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  authorityRole: 'promotor',
  authorityTitle: 'Promotor de Justiça',
  authorityName: '',
  defaultOrgao: 'Ministério Público do Estado do Tocantins',
  defaultOfficer: '',
  defaultProcedimentoTipo: 'Autos',
};

/**
 * Loads persisted settings from localStorage or returns default MPTO settings
 */
export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch (err) {
    console.warn('Erro ao carregar configurações salvas:', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Persists settings to localStorage
 */
export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Erro ao salvar configurações no localStorage:', err);
  }
}
