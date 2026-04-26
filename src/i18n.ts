/**
 * Lightweight i18n for the userscript UI.
 * Strings are looked up by key; missing keys fall back to English.
 */

export type LocaleId = 'en' | 'pt';

export interface Messages {
    tabLabel: string;
    tabTitle: string;
    panelTitle: string;
    panelDescription: string;
    debugToggle: string;
    addRule: string;
    resetRules: string;
    confirmReset: string;
    totalHighlighted: (n: number) => string;
    totalDebug: (n: number) => string;
    column: {
        roadType: string;
        operator: string;
        speed: string;
        color: string;
    };
    speedSuffix: string;
    badgeTitle: string;
    deleteRule: string;
    toggleRule: string;
    sdkUnavailable: string;
    sdkTimeout: string;
    scriptReady: string;
    tabRegisterError: string;
    saveError: string;
}

const EN: Messages = {
    tabLabel: '🚦 Speed Validator',
    tabTitle: 'Speed Limit Validator',
    panelTitle: 'Speed Limit Validator',
    panelDescription:
        'Configure rules per road type, operator, speed (km/h) and color. ' +
        'A segment is highlighted if <i>any</i> active rule matches its forward or reverse speed.',
    debugToggle: 'Debug (paint everything blue)',
    addRule: '+ Add rule',
    resetRules: 'Reset to defaults',
    confirmReset: 'Reset configuration to defaults?',
    totalHighlighted: (n) => `Total: ${n} segment(s) highlighted`,
    totalDebug: (n) => `Debug: ${n} segment(s) in view`,
    column: {
        roadType: 'Road type',
        operator: 'Op',
        speed: 'km/h',
        color: 'Color',
    },
    speedSuffix: 'km/h',
    badgeTitle: 'Visible segments matching this rule',
    deleteRule: 'Remove rule',
    toggleRule: 'Enable / disable rule',
    sdkUnavailable: 'WME SDK is not available.',
    sdkTimeout: 'Timeout waiting for window.SDK_INITIALIZED',
    scriptReady: 'SDK ready, activating script.',
    tabRegisterError: 'Failed to register sidebar tab:',
    saveError: 'Failed to save config:',
};

const PT: Messages = {
    tabLabel: '🚦 Validador BR',
    tabTitle: 'Validador de Velocidades',
    panelTitle: 'Validador de Velocidades',
    panelDescription:
        'Configure regras por tipo de via, operador, velocidade (km/h) e cor. ' +
        'Um segmento é destacado se <i>qualquer</i> regra ativa casar com a velocidade fwd ou rev.',
    debugToggle: 'Debug (pintar tudo de azul)',
    addRule: '+ Adicionar regra',
    resetRules: 'Restaurar padrões',
    confirmReset: 'Restaurar configuração padrão?',
    totalHighlighted: (n) => `Total: ${n} segmento(s) destacado(s)`,
    totalDebug: (n) => `Debug: ${n} segmento(s) na vista`,
    column: {
        roadType: 'Tipo de via',
        operator: 'Op',
        speed: 'km/h',
        color: 'Cor',
    },
    speedSuffix: 'km/h',
    badgeTitle: 'Segmentos visíveis que casam esta regra',
    deleteRule: 'Remover regra',
    toggleRule: 'Ativar / desativar regra',
    sdkUnavailable: 'SDK do WME indisponível.',
    sdkTimeout: 'Tempo esgotado aguardando window.SDK_INITIALIZED',
    scriptReady: 'SDK pronto, ativando script.',
    tabRegisterError: 'Falha ao registrar aba do sidebar:',
    saveError: 'Falha ao salvar configuração:',
};

const CATALOG: Record<LocaleId, Messages> = { en: EN, pt: PT };

export function pickLocale(localeCode: string | null | undefined): LocaleId {
    if (!localeCode) return 'en';
    const lower = localeCode.toLowerCase();
    if (lower.startsWith('pt')) return 'pt';
    return 'en';
}

export function getMessages(locale: LocaleId): Messages {
    return CATALOG[locale] ?? EN;
}
