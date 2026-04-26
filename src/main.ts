import type { WmeSDK, Segment, SdkFeature, RoadTypeId } from 'wme-sdk-typings';
import { getCountryProfile, type CountryProfile, type RoadTypeEntry } from './countries';
import { getMessages, pickLocale, type Messages } from './i18n';
import styles from './styles.css?inline';

const SCRIPT_ID = 'wme-validador-vel-br';
const SCRIPT_NAME = 'WME Speed Limit Validator';
const LAYER_NAME = 'wme-speed-limit-validator';
const STORAGE_KEY = 'wme-speed-limit-validator:config:v2';

type Operator = '==' | '!=' | '>' | '>=' | '<' | '<=';

interface Rule {
    id: string;
    enabled: boolean;
    roadType: RoadTypeId;
    operator: Operator;
    speedKmh: number;
    color: string;
}

interface Config {
    rules: Rule[];
}

const OPERATORS: Operator[] = ['==', '!=', '>', '>=', '<', '<='];

let sdk: WmeSDK | null = null;
let debugMode = false;
let config: Config = loadConfig();
let countryProfile: CountryProfile;
let messages: Messages;

let matchCounts: Record<string, number> = {};
let debugCount = 0;
let onCountsUpdated: (() => void) | null = null;

// ===========================================================================
// Helpers
// ===========================================================================

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function newId(): string {
    return `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function compare(a: number, op: Operator, b: number): boolean {
    switch (op) {
        case '==': return a === b;
        case '!=': return a !== b;
        case '>': return a > b;
        case '>=': return a >= b;
        case '<': return a < b;
        case '<=': return a <= b;
    }
}

function defaultConfig(profile: CountryProfile): Config {
    // Brazil: Primary Street (Coletora) at 30 km/h is suspicious -> red.
    //         Local (Street) above 30 km/h is suspicious -> orange.
    // Other countries: Primary Street at 30 -> red, Street above 30 -> orange (generic heuristic).
    const hasStreet = profile.roadTypes.some((r) => r.id === 1);
    const hasPrimary = profile.roadTypes.some((r) => r.id === 2);
    const rules: Rule[] = [];
    if (hasPrimary) {
        rules.push({
            id: 'default-primary',
            enabled: true,
            roadType: 2,
            operator: '==',
            speedKmh: 30,
            color: '#FF0000',
        });
    }
    if (hasStreet) {
        rules.push({
            id: 'default-street',
            enabled: true,
            roadType: 1,
            operator: '>',
            speedKmh: 30,
            color: '#FFA500',
        });
    }
    return { rules };
}

function loadConfig(): Config {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { rules: [] };
        const parsed = JSON.parse(raw) as Config;
        if (!parsed?.rules || !Array.isArray(parsed.rules)) return { rules: [] };
        return parsed;
    } catch {
        return { rules: [] };
    }
}

function saveConfig(): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.error(`[${SCRIPT_NAME}] ${messages.saveError}`, e);
    }
}

function findRoadTypeLabel(id: RoadTypeId): string {
    const entry = countryProfile.roadTypes.find((r) => r.id === id);
    return entry ? entry.label : `#${id}`;
}

// ===========================================================================
// Classification & rendering
// ===========================================================================

function classify(seg: Segment): { color: string; ruleId: string | null } | null {
    if (debugMode) return { color: '#00BFFF', ruleId: null };

    const fwd = seg.fwdSpeedLimit ?? 0;
    const rev = seg.revSpeedLimit ?? 0;

    for (const rule of config.rules) {
        if (!rule.enabled) continue;
        if (seg.roadType !== rule.roadType) continue;
        if (
            compare(fwd, rule.operator, rule.speedKmh) ||
            compare(rev, rule.operator, rule.speedKmh)
        ) {
            return { color: rule.color, ruleId: rule.id };
        }
    }
    return null;
}

function refreshHighlights(): void {
    if (!sdk) return;
    sdk.Map.removeAllFeaturesFromLayer({ layerName: LAYER_NAME });

    matchCounts = {};
    debugCount = 0;

    const features: SdkFeature[] = [];
    for (const seg of sdk.DataModel.Segments.getAll()) {
        const result = classify(seg);
        if (!result || !seg.geometry) continue;

        if (debugMode) {
            debugCount++;
        } else if (result.ruleId) {
            matchCounts[result.ruleId] = (matchCounts[result.ruleId] ?? 0) + 1;
        }

        features.push({
            type: 'Feature',
            id: seg.id,
            geometry: seg.geometry,
            properties: { id: seg.id, color: result.color },
        });
    }

    if (features.length > 0) {
        sdk.Map.addFeaturesToLayer({ features, layerName: LAYER_NAME });
    }

    onCountsUpdated?.();
}

// ===========================================================================
// UI
// ===========================================================================

function injectStyles(): void {
    const ID = 'wme-speed-validator-styles';
    if (document.getElementById(ID)) return;

    const style = document.createElement('style');
    style.id = ID;
    style.textContent = styles;
    document.head.appendChild(style);
}

function createSwitch(checked: boolean, onChange: (v: boolean) => void, title?: string): {
    wrapper: HTMLElement;
    input: HTMLInputElement;
} {
    const wrapper = document.createElement('label');
    wrapper.className = 'wme-vbr-switch';
    if (title) wrapper.title = title;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));
    const slider = document.createElement('span');
    slider.className = 'slider';
    wrapper.appendChild(input);
    wrapper.appendChild(slider);
    return { wrapper, input };
}

function createRoadTypeSelect(selected: RoadTypeId, onChange: (id: RoadTypeId) => void): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'wme-vbr-roadtype';
    for (const entry of countryProfile.roadTypes) {
        const opt = document.createElement('option');
        opt.value = String(entry.id);
        opt.textContent = entry.label;
        if (entry.id === selected) opt.selected = true;
        select.appendChild(opt);
    }
    select.addEventListener('change', () => onChange(Number(select.value) as RoadTypeId));
    return select;
}

interface RuleRowHandle {
    el: HTMLElement;
    setCount: (n: number) => void;
}

function createRuleRow(rule: Rule, onChange: () => void, onRemove: () => void): RuleRowHandle {
    const row = document.createElement('div');
    row.className = 'wme-vbr-row';

    // Top row: switch + badge + road type + delete
    const top = document.createElement('div');
    top.className = 'wme-vbr-row-top';

    const sw = createSwitch(rule.enabled, (v) => {
        rule.enabled = v;
        updateBadgeVisibility();
        onChange();
    }, messages.toggleRule);

    const badge = document.createElement('span');
    badge.className = 'wme-vbr-badge hidden';
    badge.textContent = '0';
    badge.title = messages.badgeTitle;

    const roadSelect = createRoadTypeSelect(rule.roadType, (id) => {
        rule.roadType = id;
        onChange();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'wme-vbr-del';
    deleteBtn.textContent = '×';
    deleteBtn.title = messages.deleteRule;
    deleteBtn.addEventListener('click', onRemove);

    top.appendChild(sw.wrapper);
    top.appendChild(badge);
    top.appendChild(roadSelect);
    top.appendChild(deleteBtn);

    // Bottom row: operator + speed + color
    const bottom = document.createElement('div');
    bottom.className = 'wme-vbr-row-bottom';

    const opSelect = document.createElement('select');
    opSelect.className = 'wme-vbr-op';
    for (const op of OPERATORS) {
        const opt = document.createElement('option');
        opt.value = op;
        opt.textContent = op;
        if (op === rule.operator) opt.selected = true;
        opSelect.appendChild(opt);
    }
    opSelect.addEventListener('change', () => {
        rule.operator = opSelect.value as Operator;
        onChange();
    });

    const speedInput = document.createElement('input');
    speedInput.type = 'number';
    speedInput.className = 'wme-vbr-vel';
    speedInput.min = '0';
    speedInput.max = '200';
    speedInput.value = String(rule.speedKmh);
    speedInput.title = messages.column.speed;
    speedInput.addEventListener('change', () => {
        const v = parseInt(speedInput.value, 10);
        rule.speedKmh = isNaN(v) ? 0 : v;
        onChange();
    });

    const speedSuffix = document.createElement('span');
    speedSuffix.className = 'wme-vbr-vel-suffix';
    speedSuffix.textContent = messages.speedSuffix;

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'wme-vbr-color';
    colorInput.value = rule.color;
    colorInput.title = messages.column.color;
    colorInput.addEventListener('change', () => {
        rule.color = colorInput.value;
        updateBadgeVisibility();
        onChange();
    });

    bottom.appendChild(opSelect);
    bottom.appendChild(speedInput);
    bottom.appendChild(speedSuffix);
    bottom.appendChild(colorInput);

    row.appendChild(top);
    row.appendChild(bottom);

    let lastCount = 0;

    function updateBadgeVisibility(): void {
        const visible = rule.enabled && lastCount > 0;
        badge.classList.toggle('hidden', !visible);
        badge.style.background = rule.color;
    }

    return {
        el: row,
        setCount: (n: number) => {
            lastCount = n;
            badge.textContent = String(n);
            updateBadgeVisibility();
        },
    };
}

function renderRules(container: HTMLElement, totalEl: HTMLElement): void {
    container.innerHTML = '';

    const handlers: { ruleId: string; setCount: (n: number) => void }[] = [];

    const onRuleChanged = () => {
        saveConfig();
        refreshHighlights();
    };

    for (const rule of config.rules) {
        const handle = createRuleRow(rule, onRuleChanged, () => {
            config.rules = config.rules.filter((r) => r.id !== rule.id);
            saveConfig();
            renderRules(container, totalEl);
            refreshHighlights();
        });
        container.appendChild(handle.el);
        handlers.push({ ruleId: rule.id, setCount: handle.setCount });
    }

    onCountsUpdated = () => {
        for (const h of handlers) h.setCount(matchCounts[h.ruleId] ?? 0);
        const total = debugMode
            ? debugCount
            : Object.values(matchCounts).reduce((a, b) => a + b, 0);
        totalEl.textContent = debugMode
            ? messages.totalDebug(total)
            : messages.totalHighlighted(total);
    };
    onCountsUpdated();
}

function styleButton(btn: HTMLButtonElement): void {
    btn.classList.add('wme-vbr-button');
}

async function buildPanel(): Promise<void> {
    if (!sdk) return;

    injectStyles();

    const { tabLabel, tabPane } = await sdk.Sidebar.registerScriptTab();
    tabLabel.innerText = messages.tabLabel;
    tabLabel.title = messages.tabTitle;

    tabPane.style.padding = '3px';
    tabPane.style.boxSizing = 'border-box';

    const title = document.createElement('h4');
    title.innerText = messages.panelTitle;
    title.style.margin = '0 0 8px 0';
    tabPane.appendChild(title);

    const description = document.createElement('p');
    description.style.fontSize = '11px';
    description.style.color = '#555';
    description.style.margin = '0 0 10px 0';
    description.innerHTML = messages.panelDescription;
    tabPane.appendChild(description);

    // Debug switch
    const debugRow = document.createElement('div');
    Object.assign(debugRow.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        margin: '0 0 10px 0',
    } as CSSStyleDeclaration);

    const debugSw = createSwitch(false, (v) => {
        debugMode = v;
        refreshHighlights();
    });
    const debugLabel = document.createElement('span');
    debugLabel.style.fontSize = '12px';
    debugLabel.textContent = messages.debugToggle;

    debugRow.appendChild(debugSw.wrapper);
    debugRow.appendChild(debugLabel);
    tabPane.appendChild(debugRow);

    // Rules container
    const rulesContainer = document.createElement('div');
    rulesContainer.style.margin = '0 0 8px 0';
    tabPane.appendChild(rulesContainer);

    // Total display
    const totalEl = document.createElement('div');
    Object.assign(totalEl.style, {
        fontSize: '11px',
        color: '#333',
        margin: '6px 0 8px 0',
        padding: '4px 8px',
        background: '#f0f0f0',
        borderRadius: '4px',
    } as CSSStyleDeclaration);
    totalEl.textContent = messages.totalHighlighted(0);
    tabPane.appendChild(totalEl);

    renderRules(rulesContainer, totalEl);

    // Action buttons
    const buttons = document.createElement('div');
    buttons.style.display = 'flex';
    buttons.style.gap = '6px';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = messages.addRule;
    styleButton(addBtn);
    addBtn.addEventListener('click', () => {
        const firstId = countryProfile.roadTypes[0]?.id ?? 1;
        const suggestedSpeed =
            countryProfile.roadTypes.find((r) => r.id === firstId)?.defaultSpeedKmh ?? 30;
        config.rules.push({
            id: newId(),
            enabled: true,
            roadType: firstId,
            operator: '>',
            speedKmh: suggestedSpeed,
            color: '#00AAFF',
        });
        saveConfig();
        renderRules(rulesContainer, totalEl);
        refreshHighlights();
    });

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.textContent = messages.resetRules;
    styleButton(resetBtn);
    resetBtn.addEventListener('click', () => {
        if (!confirm(messages.confirmReset)) return;
        config = defaultConfig(countryProfile);
        saveConfig();
        renderRules(rulesContainer, totalEl);
        refreshHighlights();
    });

    buttons.appendChild(addBtn);
    buttons.appendChild(resetBtn);
    tabPane.appendChild(buttons);
}

// ===========================================================================
// Bootstrap
// ===========================================================================

function detectContext(activeSdk: WmeSDK): { profile: CountryProfile; messages: Messages } {
    let countryAbbr: string | null = null;
    try {
        countryAbbr = activeSdk.DataModel.Countries.getTopCountry()?.abbr ?? null;
    } catch {
        // ignored
    }

    let localeCode: string | null = null;
    try {
        localeCode = activeSdk.Settings.getLocale()?.localeCode ?? null;
    } catch {
        // ignored
    }

    return {
        profile: getCountryProfile(countryAbbr),
        messages: getMessages(pickLocale(localeCode)),
    };
}

function startScript(): void {
    if (!sdk) return;
    console.log(`[${SCRIPT_NAME}] ${messages.scriptReady}`);

    sdk.Map.addLayer({
        layerName: LAYER_NAME,
        styleContext: {
            getStrokeColor: ({ feature }) =>
                (feature?.properties?.color as string | undefined) ?? '#00BFFF',
        },
        styleRules: [
            {
                style: {
                    strokeColor: '${getStrokeColor}',
                    strokeWidth: 6,
                    strokeOpacity: 0.65,
                    strokeLinecap: 'round',
                },
            },
        ],
    });

    buildPanel().catch((e) =>
        console.error(`[${SCRIPT_NAME}] ${messages.tabRegisterError}`, e),
    );

    sdk.Events.on({ eventName: 'wme-map-move-end', eventHandler: refreshHighlights });
    sdk.Events.on({ eventName: 'wme-map-zoom-changed', eventHandler: refreshHighlights });
    sdk.Events.on({ eventName: 'wme-map-data-loaded', eventHandler: refreshHighlights });
    sdk.Events.on({ eventName: 'wme-data-model-objects-changed', eventHandler: refreshHighlights });

    refreshHighlights();
}

function waitForSdkInjection(timeoutMs = 60000): Promise<void> {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            const w = window as unknown as {
                SDK_INITIALIZED?: Promise<unknown>;
                getWmeSdk?: unknown;
            };
            if (w.SDK_INITIALIZED && w.getWmeSdk) {
                resolve();
                return;
            }
            if (Date.now() - start > timeoutMs) {
                reject(new Error('Timeout waiting for window.SDK_INITIALIZED'));
                return;
            }
            setTimeout(check, 200);
        };
        check();
    });
}

async function bootstrap(): Promise<void> {
    await waitForSdkInjection();
    await window.SDK_INITIALIZED;
    const wmeSdk = window.getWmeSdk!({ scriptId: SCRIPT_ID, scriptName: SCRIPT_NAME });
    sdk = wmeSdk;
    await wmeSdk.Events.once({ eventName: 'wme-ready' });

    const ctx = detectContext(wmeSdk);
    countryProfile = ctx.profile;
    messages = ctx.messages;

    // If user has no rules saved yet, seed with country-aware defaults.
    if (config.rules.length === 0) {
        config = defaultConfig(countryProfile);
        saveConfig();
    }

    startScript();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        bootstrap().catch((e) => console.error(`[${SCRIPT_NAME}] error:`, e));
    });
} else {
    bootstrap().catch((e) => console.error(`[${SCRIPT_NAME}] error:`, e));
}

// Avoid "unused import" complaints if RoadTypeEntry becomes only structurally used.
export type { RoadTypeEntry };
