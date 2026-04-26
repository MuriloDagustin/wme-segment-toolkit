/**
 * Generic in-panel tab component.
 *
 * Renders a horizontal button strip + a content area that swaps which child
 * `<div>` is visible. Each tab gets its own pre-created content element so
 * sub-builders can store handles to it without worrying about lifecycle.
 */

export interface TabSpec {
    id: string;
    label: string;
    title?: string;
    /** Build the tab content. The container is appended to the panel body. */
    build: (container: HTMLElement) => void;
}

export interface TabsHandle {
    root: HTMLElement;
    activate: (id: string) => void;
}

const ACTIVE_CLASS = 'wme-vbr-tab-active';

export function createTabs(tabs: TabSpec[], initialId?: string): TabsHandle {
    const root = document.createElement('div');
    root.classList.add('wme-vbr-tabs');

    const header = document.createElement('div');
    header.classList.add('wme-vbr-tab-header');
    root.appendChild(header);

    const body = document.createElement('div');
    body.classList.add('wme-vbr-tab-body');
    root.appendChild(body);

    const buttons = new Map<string, HTMLButtonElement>();
    const panes = new Map<string, HTMLElement>();

    for (const spec of tabs) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.classList.add('wme-vbr-tab-btn');
        btn.textContent = spec.label;
        if (spec.title) btn.title = spec.title;
        btn.addEventListener('click', () => activate(spec.id));
        header.appendChild(btn);
        buttons.set(spec.id, btn);

        const pane = document.createElement('div');
        pane.classList.add('wme-vbr-tab-pane');
        body.appendChild(pane);
        panes.set(spec.id, pane);

        spec.build(pane);
    }

    function activate(id: string): void {
        for (const [tabId, btn] of buttons) {
            btn.classList.toggle(ACTIVE_CLASS, tabId === id);
        }
        for (const [tabId, pane] of panes) {
            pane.classList.toggle('hidden', tabId !== id);
        }
    }

    activate(initialId ?? tabs[0]?.id ?? '');

    return { root, activate };
}
