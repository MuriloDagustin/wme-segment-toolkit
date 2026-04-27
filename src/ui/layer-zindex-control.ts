import type { App } from '../app';
import { applyLayerZIndex, getLayerZIndexConfig, setLayerZIndexConfig } from '../layer-zindex';
import type { HighlightLayerKey } from '../config';

/**
 * Build a small "draw order" (z-index) control. The number input updates the
 * layer z-index live via the SDK; higher values paint on top of lower ones.
 */
export function createLayerZIndexControl(
    app: App,
    layerKey: HighlightLayerKey,
): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'wme-vbr-zindex';

    const labels = app.messages.layerZIndex;
    wrapper.title = labels.help;

    const label = document.createElement('span');
    label.className = 'wme-vbr-zindex-label';
    label.textContent = labels.label;

    const input = document.createElement('input');
    input.type = 'number';
    input.step = '10';
    input.className = 'wme-vbr-zindex-input';
    input.value = String(getLayerZIndexConfig(app.config)[layerKey]);
    input.title = labels.help;

    input.addEventListener('change', () => {
        const parsed = Number(input.value);
        if (!Number.isFinite(parsed)) {
            input.value = String(getLayerZIndexConfig(app.config)[layerKey]);
            return;
        }
        const next = Math.round(parsed);
        input.value = String(next);
        setLayerZIndexConfig(app.config, layerKey, next);
        app.persistConfig();
        applyLayerZIndex(app.sdk, app.config, layerKey);
    });

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return wrapper;
}
