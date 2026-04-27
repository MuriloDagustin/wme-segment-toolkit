import type { WmeSDK, SdkFeature } from 'wme-sdk-typings';
import { classify, DEBUG_COLOR } from './classify';
import type { Config } from './config';

export const LAYER_NAME = 'wme-speed-limit-validator';

/**
 * Register the highlight layer once. Color comes from feature.properties.color
 * via the styleContext template.
 */
export function setupHighlightLayer(sdk: WmeSDK): void {
    sdk.Map.addLayer({
        layerName: LAYER_NAME,
        zIndexing: true,
        styleContext: {
            getStrokeColor: ({ feature }) =>
                (feature?.properties?.color as string | undefined) ?? DEBUG_COLOR,
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
}

export interface RefreshResult {
    matchCounts: Record<string, number>;
    debugCount: number;
    totalFeatures: number;
}

/**
 * Recompute highlights for all visible segments and update the map layer.
 * Returns aggregate counters so the UI can refresh badges/totals.
 */
export function refreshHighlights(
    sdk: WmeSDK,
    config: Config,
    debugMode: boolean,
): RefreshResult {
    sdk.Map.removeAllFeaturesFromLayer({ layerName: LAYER_NAME });

    const matchCounts: Record<string, number> = {};
    let debugCount = 0;
    const features: SdkFeature[] = [];

    for (const seg of sdk.DataModel.Segments.getAll()) {
        const result = classify(seg, config.rules, debugMode);
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

    return { matchCounts, debugCount, totalFeatures: features.length };
}
