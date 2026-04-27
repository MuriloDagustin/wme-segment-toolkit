import { defaultConfig, newId, type Config } from '../../config';
import { AVAILABLE_PROFILES } from '../../countries';
import type { App } from '../../app';
import { createSwitch } from '../switch';
import { createRuleRow, type RuleRowHandle } from '../rule-row';
import { createLayerZIndexControl } from '../layer-zindex-control';

/**
 * Build the "Speed Validator" tab: country selector, debug toggle, rules list,
 * total counter and add/reset actions.
 */
export function buildSpeedTab(app: App, container: HTMLElement): void {
    appendDescription(container, app.messages.panelDescription);

    const rulesContainer = document.createElement('div');
    rulesContainer.style.margin = '0 0 8px 0';

    const totalEl = createTotalElement(app);

    appendCountrySelector(container, app, () => {
        renderRules(rulesContainer, totalEl, app);
        app.refresh();
    });
    appendDebugSwitch(container, app);

    container.appendChild(createLayerZIndexControl(app, 'speed'));

    container.appendChild(rulesContainer);
    container.appendChild(totalEl);

    renderRules(rulesContainer, totalEl, app);

    appendActionButtons(container, rulesContainer, totalEl, app);
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function appendDescription(parent: HTMLElement, html: string): void {
    const p = document.createElement('p');
    p.style.fontSize = '11px';
    p.style.color = '#555';
    p.style.margin = '0 0 10px 0';
    p.innerHTML = html;
    parent.appendChild(p);
}

function createTotalElement(app: App): HTMLElement {
    const el = document.createElement('div');
    Object.assign(el.style, {
        fontSize: '11px',
        color: '#333',
        margin: '6px 0 8px 0',
        padding: '4px 8px',
        background: '#f0f0f0',
        borderRadius: '4px',
    } as CSSStyleDeclaration);
    el.textContent = app.messages.totalHighlighted(0);
    el.title = app.messages.speedHelp.total;
    return el;
}


function appendCountrySelector(
    parent: HTMLElement,
    app: App,
    onCountryChanged: () => void,
): void {
    const row = document.createElement('div');
    Object.assign(row.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        margin: '0 0 10px 0',
    } as CSSStyleDeclaration);

    const label = document.createElement('span');
    label.style.fontSize = '12px';
    label.style.fontWeight = '600';
    label.textContent = `${app.messages.country.label}:`;

    const select = document.createElement('select');
    Object.assign(select.style, {
        flex: '1',
        fontSize: '12px',
        padding: '3px 4px',
        border: '1px solid #ccc',
        borderRadius: '4px',
    } as CSSStyleDeclaration);
    select.title = app.messages.speedHelp.country;

    const autoOpt = document.createElement('option');
    autoOpt.value = 'auto';
    autoOpt.textContent = app.messages.country.auto(app.detectedCountryAbbr ?? '');
    select.appendChild(autoOpt);

    for (const profile of AVAILABLE_PROFILES) {
        const opt = document.createElement('option');
        opt.value = profile.abbr;
        opt.textContent = `${profile.name} (${profile.abbr})`;
        select.appendChild(opt);
    }
    select.value = app.config.selectedCountry ?? 'auto';

    select.addEventListener('change', () => {
        app.setCountrySelection(select.value);
        onCountryChanged();
    });

    row.appendChild(label);
    row.appendChild(select);
    parent.appendChild(row);
}

function appendDebugSwitch(parent: HTMLElement, app: App): void {
    const row = document.createElement('div');
    Object.assign(row.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        margin: '0 0 10px 0',
    } as CSSStyleDeclaration);

    const sw = createSwitch(false, (v) => {
        app.debugMode = v;
        app.refresh();
    }, app.messages.speedHelp.debug);

    const label = document.createElement('span');
    label.style.fontSize = '12px';
    label.textContent = app.messages.debugToggle;
    label.title = app.messages.speedHelp.debug;

    row.appendChild(sw.wrapper);
    row.appendChild(label);
    parent.appendChild(row);
}

function appendActionButtons(
    parent: HTMLElement,
    rulesContainer: HTMLElement,
    totalEl: HTMLElement,
    app: App,
): void {
    const buttons = document.createElement('div');
    buttons.style.display = 'flex';
    buttons.style.gap = '6px';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = app.messages.addRule;
    addBtn.title = app.messages.speedHelp.addRule;
    addBtn.classList.add('wme-vbr-button');
    addBtn.addEventListener('click', () => {
        const firstId = app.countryProfile.roadTypes[0]?.id ?? 1;
        const suggestedSpeed =
            app.countryProfile.roadTypes.find((r) => r.id === firstId)
                ?.defaultSpeedKmh ?? 30;
        app.config.rules.push({
            id: newId(),
            enabled: true,
            roadType: firstId,
            operator: '>',
            speedKmh: suggestedSpeed,
            color: '#00AAFF',
        });
        app.persistConfig();
        renderRules(rulesContainer, totalEl, app);
        app.refresh();
    });

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.textContent = app.messages.resetRules;
    resetBtn.title = app.messages.speedHelp.resetRules;
    resetBtn.classList.add('wme-vbr-button');
    resetBtn.addEventListener('click', () => {
        if (!confirm(app.messages.confirmReset)) return;
        app.config = defaultConfig(app.countryProfile) as Config;
        app.persistConfig();
        renderRules(rulesContainer, totalEl, app);
        app.refresh();
    });

    buttons.appendChild(addBtn);
    buttons.appendChild(resetBtn);
    parent.appendChild(buttons);
}

// ---------------------------------------------------------------------------
// Rules list rendering
// ---------------------------------------------------------------------------

function renderRules(container: HTMLElement, totalEl: HTMLElement, app: App): void {
    container.innerHTML = '';
    const handles: { ruleId: string; handle: RuleRowHandle }[] = [];

    const onRuleChanged = () => {
        app.persistConfig();
        app.refresh();
    };

    for (const rule of app.config.rules) {
        const handle = createRuleRow({
            rule,
            profile: app.countryProfile,
            messages: app.messages,
            onChange: onRuleChanged,
            onRemove: () => {
                app.config.rules = app.config.rules.filter((r) => r.id !== rule.id);
                app.persistConfig();
                renderRules(container, totalEl, app);
                app.refresh();
            },
        });
        container.appendChild(handle.el);
        handles.push({ ruleId: rule.id, handle });
    }

    app.onCountsUpdated = () => {
        for (const { ruleId, handle } of handles) {
            handle.setCount(app.matchCounts[ruleId] ?? 0);
        }
        const total = app.debugMode
            ? app.debugCount
            : Object.values(app.matchCounts).reduce((a, b) => a + b, 0);
        totalEl.textContent = app.debugMode
            ? app.messages.totalDebug(total)
            : app.messages.totalHighlighted(total);
    };
    app.onCountsUpdated();
}
