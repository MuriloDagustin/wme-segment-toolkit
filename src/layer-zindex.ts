import type { WmeSDK } from 'wme-sdk-typings';
import {
    DEFAULT_LAYER_Z_INDEX,
    HIGHLIGHT_LAYER_KEYS,
    type Config,
    type HighlightLayerKey,
    type LayerZIndexConfig,
} from './config';
import { LAYER_NAME } from './highlights';
import { NAME_LAYER_NAME } from './name-highlights';
import { ISSUES_LAYER_NAME } from './issues-highlights';

const LAYER_NAMES: Record<HighlightLayerKey, string> = {
    speed: LAYER_NAME,
    names: NAME_LAYER_NAME,
    issues: ISSUES_LAYER_NAME,
};

export function getLayerZIndexConfig(config: Config): LayerZIndexConfig {
    return { ...DEFAULT_LAYER_Z_INDEX, ...(config.layerZIndex ?? {}) };
}

/** Persist a single layer's z-index on the config object (caller saves). */
export function setLayerZIndexConfig(
    config: Config,
    key: HighlightLayerKey,
    zIndex: number,
): void {
    const next = getLayerZIndexConfig(config);
    next[key] = zIndex;
    config.layerZIndex = next;
}

/** Push the configured z-index for one layer to the SDK. */
export function applyLayerZIndex(
    sdk: WmeSDK,
    config: Config,
    key: HighlightLayerKey,
): void {
    const zIndex = getLayerZIndexConfig(config)[key];
    try {
        sdk.Map.setLayerZIndex({ layerName: LAYER_NAMES[key], zIndex });
    } catch (e) {
        console.error('[WME Segment Toolkit] setLayerZIndex failed for', key, e);
    }
}

/** Apply all configured z-indexes (e.g. on startup). */
export function applyAllLayerZIndexes(sdk: WmeSDK, config: Config): void {
    for (const key of HIGHLIGHT_LAYER_KEYS) applyLayerZIndex(sdk, config, key);
}
