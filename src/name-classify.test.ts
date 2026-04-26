import { describe, it, expect } from 'vitest';
import { classifyByName, type NameClassifiableSegment } from './name-classify';
import type { NameRule } from './config';

function makeRule(overrides: Partial<NameRule> = {}): NameRule {
    return {
        id: 'r1',
        enabled: true,
        pattern: 'av.',
        matchMode: 'prefix',
        nameSource: 'any',
        roadTypeFilter: 'in',
        roadTypes: [],
        color: '#FF0000',
        ...overrides,
    };
}

function makeSeg(overrides: Partial<NameClassifiableSegment> = {}): NameClassifiableSegment {
    return {
        roadType: 1,
        primaryStreetId: 100,
        alternateStreetIds: [],
        ...overrides,
    };
}

function lookupFrom(map: Record<number, string>) {
    return (id: number) => map[id] ?? null;
}

describe('classifyByName', () => {
    it('returns null when no rules are provided', () => {
        const seg = makeSeg();
        expect(classifyByName(seg, [], lookupFrom({ 100: 'Rua A' }))).toBeNull();
    });

    it('skips disabled rules', () => {
        const rule = makeRule({ enabled: false });
        const seg = makeSeg();
        expect(classifyByName(seg, [rule], lookupFrom({ 100: 'Av. Paulista' }))).toBeNull();
    });

    it('skips rules with empty pattern', () => {
        const rule = makeRule({ pattern: '' });
        const seg = makeSeg();
        expect(classifyByName(seg, [rule], lookupFrom({ 100: 'Av. Paulista' }))).toBeNull();
    });

    it('matches by prefix (case-insensitive)', () => {
        const rule = makeRule({ pattern: 'AV.' });
        const seg = makeSeg();
        expect(classifyByName(seg, [rule], lookupFrom({ 100: 'av. paulista' }))).toEqual({
            color: '#FF0000',
            ruleId: 'r1',
        });
    });

    it('matches by contains', () => {
        const rule = makeRule({ pattern: 'central', matchMode: 'contains' });
        const seg = makeSeg();
        expect(classifyByName(seg, [rule], lookupFrom({ 100: 'Avenida Central Norte' }))).not.toBeNull();
    });

    it('matches by exact', () => {
        const rule = makeRule({ pattern: 'Rua A', matchMode: 'exact' });
        const seg = makeSeg();
        expect(classifyByName(seg, [rule], lookupFrom({ 100: 'Rua A' }))).not.toBeNull();
        expect(classifyByName(seg, [rule], lookupFrom({ 100: 'Rua AB' }))).toBeNull();
    });

    it("respects nameSource='primary'", () => {
        const rule = makeRule({ pattern: 'av.', nameSource: 'primary' });
        const seg = makeSeg({ primaryStreetId: 1, alternateStreetIds: [2] });
        const lookup = lookupFrom({ 1: 'Rua X', 2: 'Av. Y' });
        // alternate has the avenue, primary doesn't -> no match
        expect(classifyByName(seg, [rule], lookup)).toBeNull();
    });

    it("respects nameSource='alternate'", () => {
        const rule = makeRule({ pattern: 'av.', nameSource: 'alternate' });
        const seg = makeSeg({ primaryStreetId: 1, alternateStreetIds: [2] });
        const lookup = lookupFrom({ 1: 'Av. X', 2: 'Rua Y' });
        // primary has the avenue, alternate doesn't -> no match
        expect(classifyByName(seg, [rule], lookup)).toBeNull();
    });

    it("respects nameSource='any' across primary and alternates", () => {
        const rule = makeRule({ pattern: 'av.', nameSource: 'any' });
        const seg = makeSeg({ primaryStreetId: 1, alternateStreetIds: [2] });
        const lookup = lookupFrom({ 1: 'Rua X', 2: 'Av. Y' });
        expect(classifyByName(seg, [rule], lookup)).not.toBeNull();
    });

    it("filters roadTypes with 'in'", () => {
        const rule = makeRule({ roadTypeFilter: 'in', roadTypes: [2, 3] });
        const lookup = lookupFrom({ 100: 'Av. X' });
        expect(classifyByName(makeSeg({ roadType: 1 }), [rule], lookup)).toBeNull();
        expect(classifyByName(makeSeg({ roadType: 2 }), [rule], lookup)).not.toBeNull();
    });

    it("filters roadTypes with 'not-in'", () => {
        const rule = makeRule({ roadTypeFilter: 'not-in', roadTypes: [2, 3] });
        const lookup = lookupFrom({ 100: 'Av. X' });
        expect(classifyByName(makeSeg({ roadType: 1 }), [rule], lookup)).not.toBeNull();
        expect(classifyByName(makeSeg({ roadType: 2 }), [rule], lookup)).toBeNull();
    });

    it('ignores roadTypes when the list is empty', () => {
        const rule = makeRule({ roadTypeFilter: 'in', roadTypes: [] });
        const lookup = lookupFrom({ 100: 'Av. X' });
        expect(classifyByName(makeSeg({ roadType: 99 }), [rule], lookup)).not.toBeNull();
    });

    it('returns the first matching rule', () => {
        const r1 = makeRule({ id: 'first', pattern: 'av.', color: '#AA0000' });
        const r2 = makeRule({ id: 'second', pattern: 'av.', color: '#0000AA' });
        const seg = makeSeg();
        const lookup = lookupFrom({ 100: 'Av. Paulista' });
        expect(classifyByName(seg, [r1, r2], lookup)?.ruleId).toBe('first');
    });

    it('handles missing street names gracefully', () => {
        const rule = makeRule({ pattern: 'av.' });
        const seg = makeSeg({ primaryStreetId: null, alternateStreetIds: [] });
        expect(classifyByName(seg, [rule], () => null)).toBeNull();
    });
});
