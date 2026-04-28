import type { WmeSDK } from 'wme-sdk-typings';

/**
 * Jump the map to the segment in `segmentIds` whose midpoint is closest to
 * the current viewport center. Selects the segment and re-centers the map on
 * its geometry. No-op (returns false) when the list is empty or no segment
 * has a usable geometry.
 */
export function jumpToNearestSegment(
    sdk: WmeSDK,
    segmentIds: readonly number[],
): boolean {
    if (segmentIds.length === 0) return false;

    const center = sdk.Map.getMapCenter();

    let bestId: number | null = null;
    let bestGeometry: GeoJSON.LineString | null = null;
    let bestDistSq = Infinity;

    for (const id of segmentIds) {
        let seg;
        try {
            seg = sdk.DataModel.Segments.getById({ segmentId: id });
        } catch {
            continue;
        }
        const geom = seg?.geometry;
        if (!geom || !Array.isArray(geom.coordinates) || geom.coordinates.length === 0) {
            continue;
        }

        const mid = geom.coordinates[Math.floor(geom.coordinates.length / 2)];
        if (!mid || mid.length < 2) continue;

        const dx = mid[0] - center.lon;
        const dy = mid[1] - center.lat;
        const d = dx * dx + dy * dy;
        if (d < bestDistSq) {
            bestDistSq = d;
            bestId = id;
            bestGeometry = geom;
        }
    }

    if (bestId == null || !bestGeometry) return false;

    sdk.Map.centerMapOnGeometry({ geometry: bestGeometry });
    try {
        sdk.Editing.setSelection({
            selection: { objectType: 'segment', ids: [bestId] },
        });
    } catch {
        // Selection may fail if SDK is not ready; centering is enough.
    }
    return true;
}
