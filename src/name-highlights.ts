import type { WmeSDK, SdkFeature, Street } from 'wme-sdk-typings';
import { classifyByName } from './name-classify';
import type { Config } from './config';

export const NAME_LAYER_NAME = 'wme-segment-toolkit-name-highlight';

/**
 * Register the name-highlight layer once. Drawn slightly thinner than the
 * speed-validator layer, in dashed stroke, so overlapping highlights remain
 * distinguishable.
 */
export function setupNameHighlightLayer(sdk: WmeSDK): void {
    sdk.Map.addLayer({
        layerName: NAME_LAYER_NAME,
        zIndexing: true,
        styleContext: {
            getStrokeColor: ({ feature }) =>
                (feature?.properties?.color as string | undefined) ?? '#FF00FF',
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

export interface NameRefreshResult {
    matchCounts: Record<string, number>;
    segmentIdsByRule: Record<string, number[]>;
    totalFeatures: number;
}

/**
 * Recompute name highlights for every visible segment and update the layer.
 * Skipped entirely (and the layer cleared) when no name rules are configured.
 */
export function refreshNameHighlights(sdk: WmeSDK, config: Config): NameRefreshResult {
    sdk.Map.removeAllFeaturesFromLayer({ layerName: NAME_LAYER_NAME });

    const rules = (config.nameRules ?? []).filter((r) => r.enabled && r.pattern.trim());
    if (rules.length === 0) {
        return { matchCounts: {}, segmentIdsByRule: {}, totalFeatures: 0 };
    }

    const streetCache = new Map<number, Street | null>();
    const lookup = (streetId: number): string | null => {
        if (streetCache.has(streetId)) return streetCache.get(streetId)?.name ?? null;
        let street: Street | null = null;
        try {
            street = sdk.DataModel.Streets.getById({ streetId });
        } catch {
            street = null;
        }
        streetCache.set(streetId, street);
        return street?.name ?? null;
    };

    const matchCounts: Record<string, number> = {};
    const segmentIdsByRule: Record<string, number[]> = {};
    const features: SdkFeature[] = [];

    for (const seg of sdk.DataModel.Segments.getAll()) {
        const result = classifyByName(seg, rules, lookup);
        if (!result || !seg.geometry) continue;

        matchCounts[result.ruleId] = (matchCounts[result.ruleId] ?? 0) + 1;
        (segmentIdsByRule[result.ruleId] ??= []).push(seg.id);
        features.push({
            type: 'Feature',
            id: seg.id,
            geometry: seg.geometry,
            properties: { id: seg.id, color: result.color },
        });
    }

    if (features.length > 0) {
        sdk.Map.addFeaturesToLayer({ features, layerName: NAME_LAYER_NAME });
    }

    return { matchCounts, segmentIdsByRule, totalFeatures: features.length };
}
