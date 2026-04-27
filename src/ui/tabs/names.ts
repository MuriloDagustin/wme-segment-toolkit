import { newId, type NameRule } from '../../config';
import type { App } from '../../app';
import { createNameRuleRow, type NameRuleRowHandle } from '../name-rule-row';
import { createLayerZIndexControl } from '../layer-zindex-control';

/**
 * Build the "Names" tab: rules that highlight segments by street-name pattern
 * combined with an optional road-type filter. Painted on a separate layer
 * (dashed) so it overlays the speed-validator highlights without conflict.
 */
export function buildNamesTab(app: App, container: HTMLElement): void {
    appendDescription(container, app.messages.nameRule.description);

    const rulesContainer = document.createElement('div');
    rulesContainer.style.margin = '0 0 8px 0';

    const totalEl = createTotalElement(app);

    container.appendChild(createLayerZIndexControl(app, 'names'));
    container.appendChild(rulesContainer);
    container.appendChild(totalEl);

    renderRules(rulesContainer, totalEl, app);
    appendActionButtons(container, rulesContainer, totalEl, app);
}

// ---------------------------------------------------------------------------

function appendDescription(parent: HTMLElement, text: string): void {
    const p = document.createElement('p');
    p.style.fontSize = '11px';
    p.style.color = '#555';
    p.style.margin = '0 0 10px 0';
    p.textContent = text;
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
    el.textContent = app.messages.nameRule.total(0);
    return el;
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
    addBtn.textContent = app.messages.nameRule.addRule;
    addBtn.title = app.messages.nameRule.description;
    addBtn.classList.add('wme-vbr-button');
    addBtn.addEventListener('click', () => {
        const rule: NameRule = {
            id: newId(),
            enabled: true,
            pattern: '',
            matchMode: 'prefix',
            nameSource: 'any',
            roadTypeFilter: 'in',
            roadTypes: [],
            color: '#9C27B0',
        };
        if (!app.config.nameRules) app.config.nameRules = [];
        app.config.nameRules.push(rule);
        app.persistConfig();
        renderRules(rulesContainer, totalEl, app);
        app.refresh();
    });

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.textContent = app.messages.nameRule.resetRules;
    resetBtn.title = app.messages.nameRule.confirmReset;
    resetBtn.classList.add('wme-vbr-button');
    resetBtn.addEventListener('click', () => {
        if (!confirm(app.messages.nameRule.confirmReset)) return;
        app.config.nameRules = [];
        app.persistConfig();
        renderRules(rulesContainer, totalEl, app);
        app.refresh();
    });

    buttons.appendChild(addBtn);
    buttons.appendChild(resetBtn);
    parent.appendChild(buttons);
}

function renderRules(container: HTMLElement, totalEl: HTMLElement, app: App): void {
    container.innerHTML = '';
    const handles: { ruleId: string; handle: NameRuleRowHandle }[] = [];

    const rules = app.config.nameRules ?? [];
    const onRuleChanged = () => {
        app.persistConfig();
        app.refresh();
    };

    for (const rule of rules) {
        const handle = createNameRuleRow({
            rule,
            profile: app.countryProfile,
            messages: app.messages,
            onChange: onRuleChanged,
            onRemove: () => {
                app.config.nameRules = (app.config.nameRules ?? []).filter(
                    (r) => r.id !== rule.id,
                );
                app.persistConfig();
                renderRules(container, totalEl, app);
                app.refresh();
            },
        });
        container.appendChild(handle.el);
        handles.push({ ruleId: rule.id, handle });
    }

    app.onNameCountsUpdated = () => {
        for (const { ruleId, handle } of handles) {
            handle.setCount(app.nameMatchCounts[ruleId] ?? 0);
        }
        totalEl.textContent = app.messages.nameRule.total(app.nameTotal);
    };
    app.onNameCountsUpdated();
}
