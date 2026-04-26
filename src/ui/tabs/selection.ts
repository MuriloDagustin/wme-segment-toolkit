import type { App } from '../../app';
import { selectWholeStreet, type MatchMode } from '../../select-street';

/**
 * Build the "Selection" tab: tools that operate on the current map selection
 * (currently: select whole street in two modes).
 */
export function buildSelectionTab(app: App, container: HTMLElement): void {
    const intro = document.createElement('p');
    intro.style.fontSize = '11px';
    intro.style.color = '#555';
    intro.style.margin = '0 0 10px 0';
    intro.textContent = app.messages.selectStreet.intro;
    container.appendChild(intro);

    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    } as CSSStyleDeclaration);

    wrapper.appendChild(buildSelectStreetButton(app, 'primary-id'));
    wrapper.appendChild(buildSelectStreetButton(app, 'name'));
    container.appendChild(wrapper);
}

function buildSelectStreetButton(app: App, mode: MatchMode): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.classList.add('wme-vbr-button');
    btn.style.width = '100%';
    btn.textContent =
        mode === 'primary-id'
            ? app.messages.selectStreet.button
            : app.messages.selectStreet.buttonByName;
    btn.title =
        mode === 'primary-id'
            ? app.messages.selectStreet.tooltip
            : app.messages.selectStreet.tooltipByName;

    btn.addEventListener('click', () => {
        const result = selectWholeStreet(app.sdk, mode);
        if (!result.expanded) {
            alert(app.messages.selectStreet.nothingSelected);
            return;
        }
        console.log(
            `[WME Segment Toolkit] ${app.messages.selectStreet.expanded(result.count)} (mode=${mode})`,
        );
    });
    return btn;
}
