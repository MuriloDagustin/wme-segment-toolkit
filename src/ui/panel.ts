import type { App } from '../app';
import { createTabs } from './tabs';
import { buildSpeedTab } from './tabs/speed';
import { buildSelectionTab } from './tabs/selection';

/** Build the script's side-panel inside the SDK-provided tab. */
export async function buildPanel(app: App): Promise<void> {
    const { tabLabel, tabPane } = await app.sdk.Sidebar.registerScriptTab();
    tabLabel.innerText = app.messages.tabLabel;
    tabLabel.title = app.messages.tabTitle;

    tabPane.style.padding = '3px';
    tabPane.style.boxSizing = 'border-box';

    appendTitle(tabPane, app.messages.panelTitle);

    const tabs = createTabs([
        {
            id: 'speed',
            label: app.messages.tabs.speed,
            build: (container) => buildSpeedTab(app, container),
        },
        {
            id: 'selection',
            label: app.messages.tabs.selection,
            build: (container) => buildSelectionTab(app, container),
        },
    ]);
    tabPane.appendChild(tabs.root);
}

function appendTitle(parent: HTMLElement, text: string): void {
    const h = document.createElement('h4');
    h.innerText = text;
    h.style.margin = '0 0 8px 0';
    parent.appendChild(h);
}
