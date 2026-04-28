import type { RoadTypeId } from 'wme-sdk-typings';

/**
 * Minimal Segment shape needed to compute selection statistics. Kept narrow
 * so unit tests can pass plain objects without faking the whole SDK.
 */
export interface StatsSegment {
    id: number;
    length: number;
    fromNodeId: number | null;
    toNodeId: number | null;
    primaryStreetId: number | null;
    roadType: RoadTypeId;
    fwdSpeedLimit: number | null;
    revSpeedLimit: number | null;
    isAtoB: boolean;
    isBtoA: boolean;
    isTwoWay: boolean;
    junctionId: number | null;
    flagAttributes: {
        tunnel: boolean;
        unpaved: boolean;
    };
    hasClosures: boolean;
    hasRestrictions: boolean;
    hasHouseNumbers: boolean;
}

export interface RoadTypeBreakdownEntry {
    count: number;
    lengthM: number;
}

export interface SelectionStats {
    segmentCount: number;
    totalLengthM: number;
    nodeCount: number;
    streetCount: number;
    /** Active-direction speed limit min/max/length-weighted average (km/h). */
    minSpeedKmh: number | null;
    maxSpeedKmh: number | null;
    avgSpeedKmh: number | null;
    byRoadType: Map<RoadTypeId, RoadTypeBreakdownEntry>;
    /** Counts that are useful at a glance. */
    oneWayCount: number;
    inRoundaboutCount: number;
    tunnelCount: number;
    unpavedCount: number;
    closuresCount: number;
    restrictionsCount: number;
    withHouseNumbersCount: number;
}

/**
 * Compute aggregate statistics for the given segments. Pure function — no
 * SDK access — so the UI layer can call it on selection changes and tests
 * can pass plain objects.
 *
 * Speed stats consider only active directions (fwd when `isAtoB`, rev when
 * `isBtoA`). Two-way segments contribute both directions; the average is
 * weighted by segment length so a long 80 km/h highway dominates a short
 * 30 km/h side road.
 */
export function computeSelectionStats(
    segments: readonly StatsSegment[],
): SelectionStats {
    const nodes = new Set<number>();
    const streets = new Set<number>();
    const byRoadType = new Map<RoadTypeId, RoadTypeBreakdownEntry>();

    let totalLengthM = 0;
    let oneWayCount = 0;
    let inRoundaboutCount = 0;
    let tunnelCount = 0;
    let unpavedCount = 0;
    let closuresCount = 0;
    let restrictionsCount = 0;
    let withHouseNumbersCount = 0;

    let minSpeed: number | null = null;
    let maxSpeed: number | null = null;
    let speedSumWeighted = 0;
    let speedWeight = 0;

    for (const seg of segments) {
        totalLengthM += seg.length;

        if (seg.fromNodeId != null) nodes.add(seg.fromNodeId);
        if (seg.toNodeId != null) nodes.add(seg.toNodeId);
        if (seg.primaryStreetId != null) streets.add(seg.primaryStreetId);

        const entry = byRoadType.get(seg.roadType) ?? { count: 0, lengthM: 0 };
        entry.count += 1;
        entry.lengthM += seg.length;
        byRoadType.set(seg.roadType, entry);

        if (!seg.isTwoWay) oneWayCount += 1;
        if (seg.junctionId != null) inRoundaboutCount += 1;
        if (seg.flagAttributes.tunnel) tunnelCount += 1;
        if (seg.flagAttributes.unpaved) unpavedCount += 1;
        if (seg.hasClosures) closuresCount += 1;
        if (seg.hasRestrictions) restrictionsCount += 1;
        if (seg.hasHouseNumbers) withHouseNumbersCount += 1;

        // Active-direction speed contributions.
        if (seg.isAtoB && seg.fwdSpeedLimit != null) {
            minSpeed = minSpeed == null ? seg.fwdSpeedLimit : Math.min(minSpeed, seg.fwdSpeedLimit);
            maxSpeed = maxSpeed == null ? seg.fwdSpeedLimit : Math.max(maxSpeed, seg.fwdSpeedLimit);
            speedSumWeighted += seg.fwdSpeedLimit * seg.length;
            speedWeight += seg.length;
        }
        if (seg.isBtoA && seg.revSpeedLimit != null) {
            minSpeed = minSpeed == null ? seg.revSpeedLimit : Math.min(minSpeed, seg.revSpeedLimit);
            maxSpeed = maxSpeed == null ? seg.revSpeedLimit : Math.max(maxSpeed, seg.revSpeedLimit);
            speedSumWeighted += seg.revSpeedLimit * seg.length;
            speedWeight += seg.length;
        }
    }

    return {
        segmentCount: segments.length,
        totalLengthM,
        nodeCount: nodes.size,
        streetCount: streets.size,
        minSpeedKmh: minSpeed,
        maxSpeedKmh: maxSpeed,
        avgSpeedKmh: speedWeight > 0 ? speedSumWeighted / speedWeight : null,
        byRoadType,
        oneWayCount,
        inRoundaboutCount,
        tunnelCount,
        unpavedCount,
        closuresCount,
        restrictionsCount,
        withHouseNumbersCount,
    };
}

/** Format a length in meters as `123 m` or `1.42 km`. */
export function formatLength(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
}
