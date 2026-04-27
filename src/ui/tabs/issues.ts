import type { App } from '../../app';
import {
    DEFAULT_ISSUES_CONFIG,
    ISSUE_IDS,
    type IssueId,
    type IssuesConfig,
} from '../../config';
import { createSwitch } from '../switch';

/**
 * Build the "Issues" tab: one toggleable check per common map-quality issue.
 * Each check has an independent enabled state and color, persisted to config.
 * Highlights are painted on a separate (dotted) layer.
 */
export function buildIssuesTab(app: App, container: HTMLElement): void {
    appendDescription(container, app.messages.issues.description);

    const issuesConfig = ensureIssuesConfig(app);
    const totalEl = createTotalElement(app);

    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '6px';

    for (const id of ISSUE_IDS) {
        list.appendChild(createIssueRow(app, id, issuesConfig, totalEl));
    }

    container.appendChild(list);
    container.appendChild(totalEl);

    app.onIssuesCountsUpdated = () => {
        totalEl.textContent = app.messages.issues.total(app.issuesTotal);
    };
}

// ---------------------------------------------------------------------------

function ensureIssuesConfig(app: App): IssuesConfig {
    if (!app.config.issues) {
        app.config.issues = JSON.parse(JSON.stringify(DEFAULT_ISSUES_CONFIG));
        app.persistConfig();
    }
    return app.config.issues!;
}

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
        margin: '8px 0 0 0',
        padding: '4px 8px',
        background: '#f0f0f0',
        borderRadius: '4px',
    } as CSSStyleDeclaration);
    el.textContent = app.messages.issues.total(0);
    return el;
}

function createIssueRow(
    app: App,
    id: IssueId,
    issuesConfig: IssuesConfig,
    totalEl: HTMLElement,
): HTMLElement {
    const row = document.createElement('div');
    row.className = 'wme-vbr-row';

    const top = document.createElement('div');
    top.className = 'wme-vbr-row-top';

    const labels = app.messages.issues[id];
    const state = issuesConfig[id];

    const sw = createSwitch(state.enabled, (next) => {
        state.enabled = next;
        app.persistConfig();
        app.refresh();
    }, labels.help);

    const badge = document.createElement('span');
    badge.className = 'wme-vbr-badge';
    badge.style.background = state.color;
    badge.title = app.messages.badgeTitle;
    badge.textContent = '0';

    const label = document.createElement('span');
    label.style.flex = '1';
    label.style.fontSize = '12px';
    label.style.color = '#222';
    label.textContent = labels.label;
    label.title = labels.help;

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'wme-vbr-color';
    colorInput.value = state.color;
    colorInput.title = app.messages.issues.color;
    colorInput.addEventListener('input', () => {
        state.color = colorInput.value;
        badge.style.background = colorInput.value;
        app.persistConfig();
        app.refresh();
    });

    top.appendChild(sw.wrapper);
    top.appendChild(badge);
    top.appendChild(label);
    top.appendChild(colorInput);
    row.appendChild(top);

    // Hook up live count in the badge.
    const updateBadge = () => {
        const count = app.issuesMatchCounts[id] ?? 0;
        badge.textContent = String(count);
        badge.classList.toggle('hidden', count === 0);
    };
    updateBadge();
    const previousHook = app.onIssuesCountsUpdated;
    app.onIssuesCountsUpdated = () => {
        previousHook?.();
        updateBadge();
        totalEl.textContent = app.messages.issues.total(app.issuesTotal);
    };

    return row;
}
