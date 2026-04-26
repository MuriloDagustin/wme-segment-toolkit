import type { NameRule } from './config';

/** Subset of segment fields needed for name classification. */
export interface NameClassifiableSegment {
    roadType: number;
    primaryStreetId: number | null;
    alternateStreetIds?: number[] | null;
}

/** Resolves a streetId to its name (case-preserving). Implementations should cache. */
export type StreetNameLookup = (streetId: number) => string | null;

/**
 * Classify a segment against a list of name rules. Returns the first matching
 * rule's color/id, or `null` if none match.
 */
export function classifyByName(
    segment: NameClassifiableSegment,
    rules: NameRule[],
    lookup: StreetNameLookup,
): { color: string; ruleId: string } | null {
    for (const rule of rules) {
        if (!rule.enabled) continue;
        if (!rule.pattern) continue;
        if (!matchesRoadType(segment.roadType, rule)) continue;
        if (!matchesAnyName(segment, rule, lookup)) continue;
        return { color: rule.color, ruleId: rule.id };
    }
    return null;
}

function matchesRoadType(roadType: number, rule: NameRule): boolean {
    if (!rule.roadTypes || rule.roadTypes.length === 0) return true;
    const inList = rule.roadTypes.includes(roadType);
    return rule.roadTypeFilter === 'in' ? inList : !inList;
}

function matchesAnyName(
    segment: NameClassifiableSegment,
    rule: NameRule,
    lookup: StreetNameLookup,
): boolean {
    const needle = rule.pattern.trim().toLocaleLowerCase();
    if (!needle) return false;

    const candidates: string[] = [];

    if (rule.nameSource === 'primary' || rule.nameSource === 'any') {
        if (segment.primaryStreetId != null) {
            const name = lookup(segment.primaryStreetId);
            if (name) candidates.push(name.toLocaleLowerCase());
        }
    }

    if (rule.nameSource === 'alternate' || rule.nameSource === 'any') {
        for (const altId of segment.alternateStreetIds ?? []) {
            const name = lookup(altId);
            if (name) candidates.push(name.toLocaleLowerCase());
        }
    }

    return candidates.some((name) => matchPattern(name, needle, rule.matchMode));
}

function matchPattern(haystack: string, needle: string, mode: NameRule['matchMode']): boolean {
    switch (mode) {
        case 'prefix':
            return haystack.startsWith(needle);
        case 'contains':
            return haystack.includes(needle);
        case 'exact':
            return haystack === needle;
    }
}
