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
    country: {
        label: string;
        auto: (detectedAbbr: string) => string;
    };
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
    operator: {
        unset: string;
    };
    verifiedFilter: {
        title: string;
        any: string;
        verified: string;
        unverified: string;
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
    selectStreet: {
        button: string;
        buttonByName: string;
        tooltip: string;
        tooltipByName: string;
        nothingSelected: string;
        expanded: (count: number) => string;
        intro: string;
    };
    speedHelp: {
        country: string;
        debug: string;
        addRule: string;
        resetRules: string;
        roadType: string;
        operator: string;
        speed: string;
        color: string;
        verifiedFilter: string;
        total: string;
    };
    tabs: {
        speed: string;
        selection: string;
        names: string;
        issues: string;
    };
    issues: {
        description: string;
        total: (n: number) => string;
        color: string;
        unnamed: { label: string; help: string };
        veryShort: { label: string; help: string };
        noSpeedLimit: { label: string; help: string };
    };
    nameRule: {
        description: string;
        addRule: string;
        resetRules: string;
        confirmReset: string;
        total: (n: number) => string;
        pattern: string;
        patternPlaceholder: string;
        matchMode: { title: string; prefix: string; contains: string; exact: string };
        nameSource: { title: string; primary: string; alternate: string; any: string };
        roadTypeFilter: { title: string; in: string; notIn: string; pickerHint: string };
        help: {
            pattern: string;
            matchMode: string;
            nameSource: string;
            roadTypeFilter: string;
            chips: string;
            color: string;
        };
    };
}

const EN: Messages = {
    tabLabel: '🚦 Speed Validator',
    tabTitle: 'Speed Limit Validator',
    panelTitle: 'Speed Limit Validator',
    panelDescription:
        'Configure rules per road type, operator, speed (km/h) and color. ' +
        'A segment is highlighted if <i>any</i> active rule matches its forward or reverse speed.',
    debugToggle: 'Debug (paint everything blue)',
    country: {
        label: 'Country',
        auto: (abbr) => `Auto-detect${abbr ? ` (${abbr})` : ''}`,
    },
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
    operator: {
        unset: 'no limit',
    },
    verifiedFilter: {
        title: 'Verification filter',
        any: 'Any',
        verified: 'Verified',
        unverified: 'Unverified',
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
    selectStreet: {
        button: 'Select whole street',
        buttonByName: 'Select by name (crosses roundabouts)',
        tooltip: 'Expand selection to all connected segments sharing the same primary street. Some roundabouts are crossed automatically, but it is not always possible.',
        tooltipByName:
            'Expand selection to all connected segments whose primary or alternate street name matches the seed. Crosses roundabouts but may pick up unrelated streets that share the name.',
        nothingSelected: 'Select a segment first.',
        expanded: (n) => `Selected ${n} segment(s) of the same street.`,
        intro:
            'Select one segment of a street and click a button below to expand the selection to the rest of the street.',
    },
    speedHelp: {
        country: 'Country profile (road types and default speeds). "Auto" uses the country detected on the visible map.',
        debug: 'Paint every visible segment cyan, ignoring rules.',
        addRule: 'Add a new highlight rule.',
        resetRules: 'Replace all rules with country defaults.',
        roadType: 'Road type the rule applies to.',
        operator: 'How to compare segment speed with the rule speed.',
        speed: 'Speed in km/h to compare against.',
        color: 'Highlight color on the map.',
        verifiedFilter: 'Filter by verification status of the speed limit.',
        total: 'Total segments highlighted by all enabled rules.',
    },
    tabs: {
        speed: 'Speed',
        selection: 'Selection',
        names: 'Names',
        issues: 'Issues',
    },
    issues: {
        description:
            'Highlight common map quality issues. Each check is independent and uses its own color.',
        total: (n) => `Total: ${n} segment(s) flagged`,
        color: 'Highlight color',
        unnamed: {
            label: 'Unnamed roads',
            help: 'Streets, primary streets, highways and ramps without a primary street name (or with empty name).',
        },
        veryShort: {
            label: 'Very short segments (< 5m)',
            help: 'Segments shorter than 5 meters, often map errors. Roundabout segments are skipped.',
        },
        noSpeedLimit: {
            label: 'Missing speed limit',
            help: 'Primary streets, highways and ramps with no speed limit set on the active direction(s).',
        },
    },
    nameRule: {
        description:
            'Highlight segments whose street name matches a pattern, optionally restricted by road type. Useful to find misclassified avenues, roads, etc.',
        addRule: '+ Add rule',
        resetRules: 'Clear all',
        confirmReset: 'Remove all name rules?',
        total: (n) => `Total: ${n} segment(s) highlighted by name rules`,
        pattern: 'Pattern',
        patternPlaceholder: 'e.g. Av.',
        matchMode: {
            title: 'Match mode',
            prefix: 'starts with',
            contains: 'contains',
            exact: 'equals',
        },
        nameSource: {
            title: 'Name source',
            primary: 'Primary',
            alternate: 'Alternate',
            any: 'Any',
        },
        roadTypeFilter: {
            title: 'Road types',
            in: 'is one of',
            notIn: 'is NOT one of',
            pickerHint: 'Click to add/remove. Empty = ignore road type.',
        },
        help: {
            pattern: 'Text to search in the segment name. Case-insensitive. Empty = rule off.',
            matchMode: 'How the pattern matches the name (starts with / contains / equals).',
            nameSource: 'Which name to check: primary, alternate, or any.',
            roadTypeFilter: 'Whether the chips below INCLUDE or EXCLUDE road types.',
            chips: 'Click chips to toggle road types. Empty = ignore road type.',
            color: 'Highlight color on the map.',
        },
    },
};

const PT: Messages = {
    tabLabel: '🚦 Validador BR',
    tabTitle: 'Validador de Velocidades',
    panelTitle: 'Validador de Velocidades',
    panelDescription:
        'Configure regras por tipo de via, operador, velocidade (km/h) e cor. ' +
        'Um segmento é destacado se <i>qualquer</i> regra ativa casar com a velocidade fwd ou rev.',
    debugToggle: 'Debug (pintar tudo de azul)',
    country: {
        label: 'País',
        auto: (abbr) => `Auto${abbr ? ` (${abbr})` : ''}`,
    },
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
    operator: {
        unset: 'sem limite',
    },
    verifiedFilter: {
        title: 'Filtro de verificação',
        any: 'Qualquer',
        verified: 'Verificado',
        unverified: 'Não verificado',
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
    selectStreet: {
        button: 'Selecionar rua inteira',
        buttonByName: 'Selecionar por nome (atravessa rotatórias)',
        tooltip: 'Expandir seleção para todos os segmentos conectados que pertencem à mesma rua principal. Algumas rotatórias são atravessadas automaticamente, mas nem sempre é possível.',
        tooltipByName:
            'Expandir seleção para todos os segmentos conectados cujo nome principal ou alternativo casa com o da selecionada. Atravessa rotatórias, mas pode pegar ruas distintas com o mesmo nome.',
        nothingSelected: 'Selecione um segmento antes.',
        expanded: (n) => `Selecionados ${n} segmento(s) da mesma rua.`,
        intro:
            'Selecione um segmento de uma rua e clique em um botão abaixo para expandir a seleção para o resto da rua.',
    },
    speedHelp: {
        country: 'Perfil do país (tipos de via e velocidades padrão). "Auto" usa o país detectado no mapa.',
        debug: 'Pinta todo segmento visível de ciano, ignorando regras.',
        addRule: 'Adicionar uma nova regra de destaque.',
        resetRules: 'Substituir todas as regras pelos padrões do país.',
        roadType: 'Tipo de via ao qual a regra se aplica.',
        operator: 'Como comparar a velocidade do segmento com a da regra.',
        speed: 'Velocidade em km/h para comparar.',
        color: 'Cor de destaque no mapa.',
        verifiedFilter: 'Filtrar pelo status de verificação do limite.',
        total: 'Total de segmentos destacados por todas as regras ativas.',
    },
    tabs: {
        speed: 'Velocidades',
        selection: 'Seleção',
        names: 'Nomes',
        issues: 'Problemas',
    },
    issues: {
        description:
            'Destaca problemas comuns de qualidade do mapa. Cada checagem é independente e usa cor própria.',
        total: (n) => `Total: ${n} segmento(s) marcado(s)`,
        color: 'Cor do destaque',
        unnamed: {
            label: 'Vias sem nome',
            help: 'Ruas, vias principais, rodovias e ramais sem nome de rua principal (ou com nome vazio).',
        },
        veryShort: {
            label: 'Segmentos muito curtos (< 5m)',
            help: 'Segmentos com menos de 5 metros, comumente erros de mapa. Segmentos de rotatória são ignorados.',
        },
        noSpeedLimit: {
            label: 'Sem limite de velocidade',
            help: 'Vias principais, rodovias e ramais sem velocidade definida na(s) direção(ões) ativa(s).',
        },
    },
    nameRule: {
        description:
            'Destaque segmentos cujo nome casa com um padrão, opcionalmente limitado por tipo de via. Útil para achar avenidas, rodovias etc. mal classificadas.',
        addRule: '+ Adicionar regra',
        resetRules: 'Limpar todas',
        confirmReset: 'Remover todas as regras de nome?',
        total: (n) => `Total: ${n} segmento(s) destacado(s) por regras de nome`,
        pattern: 'Padrão',
        patternPlaceholder: 'ex.: Av.',
        matchMode: {
            title: 'Modo de match',
            prefix: 'começa com',
            contains: 'contém',
            exact: 'igual a',
        },
        nameSource: {
            title: 'Fonte do nome',
            primary: 'Principal',
            alternate: 'Alternativo',
            any: 'Qualquer',
        },
        roadTypeFilter: {
            title: 'Tipos de via',
            in: 'é um destes',
            notIn: 'NÃO é um destes',
            pickerHint: 'Clique para adicionar/remover. Vazio = ignora tipo de via.',
        },
        help: {
            pattern: 'Texto a buscar no nome do segmento. Sem distinção de maiúsculas. Vazio = regra desativada.',
            matchMode: 'Como o padrão casa com o nome (começa com / contém / igual a).',
            nameSource: 'Qual nome checar: principal, alternativo ou qualquer.',
            roadTypeFilter: 'Se os chips abaixo INCLUEM ou EXCLUEM tipos de via.',
            chips: 'Clique nos chips para alternar tipos de via. Vazio = ignora tipo.',
            color: 'Cor de destaque no mapa.',
        },
    },
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
