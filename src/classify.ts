import type { Segment } from 'wme-sdk-typings';
import type { Operator, Rule, VerifiedFilter } from './config';

/** Color used when debug mode paints every visible segment. */
export const DEBUG_COLOR = '#00BFFF';

export interface ClassifyResult {
    color: string;
    ruleId: string | null;
}

/**
 * The subset of {@link Segment} actually consumed by classification logic.
 * Declared explicitly so tests can build minimal fixtures without faking the entire SDK type.
 */
export type ClassifiableSegment = Pick<
    Segment,
    | 'roadType'
    | 'fwdSpeedLimit'
    | 'revSpeedLimit'
    | 'isAtoB'
    | 'isBtoA'
    | 'isFwdSpeedLimitVerified'
    | 'isRevSpeedLimitVerified'
>;

export function compare(a: number, op: Operator, b: number): boolean {
    switch (op) {
        case '==': return a === b;
        case '!=': return a !== b;
        case '>': return a > b;
        case '>=': return a >= b;
        case '<': return a < b;
        case '<=': return a <= b;
        // 'unset' is handled by classify() itself; never passed to compare().
        case 'unset': return false;
    }
}

function passesVerifiedFilter(
    filter: VerifiedFilter | undefined,
    isVerified: boolean,
): boolean {
    if (!filter || filter === 'any') return true;
    return filter === 'verified' ? isVerified : !isVerified;
}

/**
 * Classify a segment against an ordered list of rules.
 *
 * @returns the first matching rule's color/id, or `null` when nothing matches.
 *   When `debugMode` is true, every segment is forced to {@link DEBUG_COLOR}.
 *
 * Direction handling:
 *   - A direction is only evaluated if the segment is active in that direction
 *     (`isAtoB` for fwd, `isBtoA` for rev). One-way streets therefore never
 *     produce false positives from their inactive side.
 *   - For numeric operators, the matching direction must also have a defined
 *     speed limit AND pass the rule's `verifiedFilter`.
 *   - The `unset` operator matches when an *active* direction has no speed
 *     limit set, and ignores the verified filter.
 */
export function classify(
    seg: ClassifiableSegment,
    rules: Rule[],
    debugMode = false,
): ClassifyResult | null {
    if (debugMode) return { color: DEBUG_COLOR, ruleId: null };

    const fwd = seg.fwdSpeedLimit;
    const rev = seg.revSpeedLimit;
    const fwdActive = seg.isAtoB === true;
    const revActive = seg.isBtoA === true;
    const fwdVerified = seg.isFwdSpeedLimitVerified === true;
    const revVerified = seg.isRevSpeedLimitVerified === true;

    for (const rule of rules) {
        if (!rule.enabled) continue;
        if (seg.roadType !== rule.roadType) continue;

        if (rule.operator === 'unset') {
            const fwdMissing = fwdActive && (fwd === null || fwd === undefined);
            const revMissing = revActive && (rev === null || rev === undefined);
            if (fwdMissing || revMissing) {
                return { color: rule.color, ruleId: rule.id };
            }
            continue;
        }

        const fwdMatches =
            fwdActive &&
            typeof fwd === 'number' &&
            compare(fwd, rule.operator, rule.speedKmh) &&
            passesVerifiedFilter(rule.verifiedFilter, fwdVerified);

        const revMatches =
            revActive &&
            typeof rev === 'number' &&
            compare(rev, rule.operator, rule.speedKmh) &&
            passesVerifiedFilter(rule.verifiedFilter, revVerified);

        if (fwdMatches || revMatches) {
            return { color: rule.color, ruleId: rule.id };
        }
    }

    return null;
}
