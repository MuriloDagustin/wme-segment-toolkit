import type { WmeSDK, SdkFeature, Street } from 'wme-sdk-typings';
import { classifyIssue } from './issues';
import type { Config, IssueId } from './config';
import { DEFAULT_ISSUES_CONFIG } from './config';

export const ISSUES_LAYER_NAME = 'wme-segment-toolkit-issues';

/**
 * Register the issues highlight layer. Drawn solid (same shape as the other
 * highlight layers) — overlap is resolved via the user-controlled z-index.
 */
export function setupIssuesLayer(sdk: WmeSDK): void {
    sdk.Map.addLayer({
        layerName: ISSUES_LAYER_NAME,
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

export interface IssuesRefreshResult {
    matchCounts: Record<IssueId, number>;
    segmentIdsByIssue: Record<IssueId, number[]>;
    totalFeatures: number;
}

/**
 * Recompute issue highlights for every visible segment. Skips entirely (and
 * clears the layer) when no issue check is enabled.
 */
export function refreshIssuesHighlights(
    sdk: WmeSDK,
    config: Config,
): IssuesRefreshResult {
    sdk.Map.removeAllFeaturesFromLayer({ layerName: ISSUES_LAYER_NAME });

    const issuesConfig = config.issues ?? DEFAULT_ISSUES_CONFIG;
    const anyEnabled =
        issuesConfig.unnamed.enabled ||
        issuesConfig.veryShort.enabled ||
        issuesConfig.noSpeedLimit.enabled;

    const matchCounts: Record<IssueId, number> = {
        unnamed: 0,
        veryShort: 0,
        noSpeedLimit: 0,
    };
    const segmentIdsByIssue: Record<IssueId, number[]> = {
        unnamed: [],
        veryShort: [],
        noSpeedLimit: [],
    };

    if (!anyEnabled) {
        return { matchCounts, segmentIdsByIssue, totalFeatures: 0 };
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

    const features: SdkFeature[] = [];

    for (const seg of sdk.DataModel.Segments.getAll()) {
        const result = classifyIssue(seg, issuesConfig, lookup);
        if (!result || !seg.geometry) continue;

        matchCounts[result.issueId]++;
        segmentIdsByIssue[result.issueId].push(seg.id);
        features.push({
            type: 'Feature',
            id: seg.id,
            geometry: seg.geometry,
            properties: { id: seg.id, color: result.color },
        });
    }

    if (features.length > 0) {
        sdk.Map.addFeaturesToLayer({ features, layerName: ISSUES_LAYER_NAME });
    }

    return { matchCounts, segmentIdsByIssue, totalFeatures: features.length };
}
