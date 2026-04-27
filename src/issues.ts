import type { IssueId, IssuesConfig } from './config';

/**
 * Pure logic for issue checks. Each check inspects a segment (and optionally
 * the street name lookup) and decides whether the segment exhibits the issue.
 *
 * A segment may match multiple issues; the first enabled match wins for
 * highlighting purposes. The order of `ISSUE_IDS` in `config.ts` defines
 * priority.
 */

/**
 * Subset of segment properties needed for issue detection. Decoupled from the
 * SDK's `Segment` type to keep the logic testable without a live SDK.
 */
export interface IssueCheckableSegment {
    roadType: number;
    primaryStreetId: number | null;
    length: number;
    junctionId: number | null;
    fwdSpeedLimit: number | null;
    revSpeedLimit: number | null;
    isAtoB: boolean;
    isBtoA: boolean;
    isTwoWay: boolean;
    allowNoDirection: boolean;
}

export type StreetNameLookup = (streetId: number) => string | null;

/**
 * Road types where having a name is expected. Excludes parking lot, walking
 * trail, private road, ferry, etc. (where unnamed is the norm).
 *
 * Identifiers come from `wme-sdk-typings`' `ROAD_TYPE` enum:
 *  1 = Street, 2 = Primary Street, 3 = Freeway, 6 = Major Highway,
 *  7 = Minor Highway, 17 = Ramp.
 */
const NAMED_ROAD_TYPES = new Set<number>([1, 2, 3, 6, 7, 17]);

/**
 * Road types where a speed limit is expected. Stricter than NAMED_ROAD_TYPES:
 * we only flag missing speed limits on Primary Street and above, since Streets
 * (residential) often have no posted limit.
 */
const SPEED_LIMITED_ROAD_TYPES = new Set<number>([2, 3, 6, 7, 17]);

/** Threshold below which a segment is considered suspiciously short, in meters. */
export const VERY_SHORT_LENGTH_M = 5;

export interface IssueClassification {
    issueId: IssueId;
    color: string;
}

/**
 * Run enabled issue checks against a segment and return the first match (or
 * null if no issue is detected).
 */
export function classifyIssue(
    segment: IssueCheckableSegment,
    config: IssuesConfig,
    nameLookup: StreetNameLookup,
): IssueClassification | null {
    if (config.unnamed.enabled && isUnnamed(segment, nameLookup)) {
        return { issueId: 'unnamed', color: config.unnamed.color };
    }
    if (config.veryShort.enabled && isVeryShort(segment)) {
        return { issueId: 'veryShort', color: config.veryShort.color };
    }
    if (config.noSpeedLimit.enabled && isMissingSpeedLimit(segment)) {
        return { issueId: 'noSpeedLimit', color: config.noSpeedLimit.color };
    }
    return null;
}

// ---------------------------------------------------------------------------
// Individual checks (exported for direct testing).
// ---------------------------------------------------------------------------

export function isUnnamed(
    segment: IssueCheckableSegment,
    nameLookup: StreetNameLookup,
): boolean {
    if (!NAMED_ROAD_TYPES.has(segment.roadType)) return false;
    // Roundabout segments often share a single (sometimes unnamed) virtual
    // street, which is fine — flag the surrounding segments instead.
    if (segment.junctionId != null) return false;
    if (segment.primaryStreetId == null) return true;
    const name = nameLookup(segment.primaryStreetId);
    return !name || name.trim() === '';
}

export function isVeryShort(segment: IssueCheckableSegment): boolean {
    // Roundabout segments are typically very short by design — skip them.
    if (segment.junctionId != null) return false;
    return segment.length > 0 && segment.length < VERY_SHORT_LENGTH_M;
}

export function isMissingSpeedLimit(segment: IssueCheckableSegment): boolean {
    if (!SPEED_LIMITED_ROAD_TYPES.has(segment.roadType)) return false;
    if (segment.allowNoDirection) return false;
    // Roundabouts inherit context from connected segments; ignoring them
    // avoids spamming the map with hits on every rotary.
    if (segment.junctionId != null) return false;

    // For one-way segments only check the active direction. For two-way
    // segments both directions must be missing to be flagged (otherwise a
    // partially-mapped limit is enough to clear the issue).
    if (segment.isAtoB && !segment.isBtoA) return segment.fwdSpeedLimit == null;
    if (segment.isBtoA && !segment.isAtoB) return segment.revSpeedLimit == null;
    return segment.fwdSpeedLimit == null && segment.revSpeedLimit == null;
}
