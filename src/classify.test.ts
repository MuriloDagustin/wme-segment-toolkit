import { describe, it, expect } from 'vitest';
import { compare, classify, DEBUG_COLOR, type ClassifiableSegment } from './classify';
import type { Rule } from './config';

function makeRule(overrides: Partial<Rule> = {}): Rule {
    return {
        id: 'r1',
        enabled: true,
        roadType: 1,
        operator: '>',
        speedKmh: 30,
        color: '#FF0000',
        ...overrides,
    };
}

function makeSeg(overrides: Partial<ClassifiableSegment> = {}): ClassifiableSegment {
    return {
        roadType: 1,
        fwdSpeedLimit: null,
        revSpeedLimit: null,
        isAtoB: true,
        isBtoA: true,
        isFwdSpeedLimitVerified: false,
        isRevSpeedLimitVerified: false,
        ...overrides,
    };
}

describe('compare', () => {
    it.each([
        [10, '==', 10, true],
        [10, '==', 11, false],
        [10, '!=', 11, true],
        [10, '!=', 10, false],
        [10, '>', 5, true],
        [10, '>', 10, false],
        [10, '>=', 10, true],
        [10, '<', 11, true],
        [10, '<=', 10, true],
    ] as const)('compare(%s, "%s", %s) -> %s', (a, op, b, expected) => {
        expect(compare(a, op, b)).toBe(expected);
    });

    it("'unset' is never satisfied via compare()", () => {
        expect(compare(0, 'unset', 0)).toBe(false);
        expect(compare(99, 'unset', 99)).toBe(false);
    });
});

describe('classify - debug mode', () => {
    it('paints every segment regardless of rules', () => {
        const seg = makeSeg();
        const result = classify(seg, [], true);
        expect(result).toEqual({ color: DEBUG_COLOR, ruleId: null });
    });
});

describe('classify - no rules', () => {
    it('returns null when there are no rules', () => {
        expect(classify(makeSeg(), [])).toBeNull();
    });

    it('skips disabled rules', () => {
        const rule = makeRule({ enabled: false, operator: '==', speedKmh: 50 });
        const seg = makeSeg({ fwdSpeedLimit: 50 });
        expect(classify(seg, [rule])).toBeNull();
    });

    it('skips rules whose road type does not match', () => {
        const rule = makeRule({ roadType: 2, operator: '==', speedKmh: 50 });
        const seg = makeSeg({ roadType: 1, fwdSpeedLimit: 50 });
        expect(classify(seg, [rule])).toBeNull();
    });
});

describe('classify - direction handling (regression)', () => {
    // Original bug: revSpeedLimit=null was coerced to 0, causing one-way streets
    // to falsely match rules whose comparison happened to be true at 0.
    it('one-way A->B with fwd=30 does NOT match "Street != 30"', () => {
        const rule = makeRule({ operator: '!=', speedKmh: 30 });
        const seg = makeSeg({
            fwdSpeedLimit: 30,
            revSpeedLimit: null,
            isAtoB: true,
            isBtoA: false, // one-way A->B
        });
        expect(classify(seg, [rule])).toBeNull();
    });

    it('one-way A->B with fwd=null does NOT match "Street < 50"', () => {
        const rule = makeRule({ operator: '<', speedKmh: 50 });
        const seg = makeSeg({
            fwdSpeedLimit: null,
            revSpeedLimit: null,
            isAtoB: true,
            isBtoA: false,
        });
        expect(classify(seg, [rule])).toBeNull();
    });

    it('two-way street with fwd=30 matches "Street == 30"', () => {
        const rule = makeRule({ operator: '==', speedKmh: 30 });
        const seg = makeSeg({ fwdSpeedLimit: 30, revSpeedLimit: 30 });
        expect(classify(seg, [rule])).toEqual({ color: '#FF0000', ruleId: 'r1' });
    });

    it('matches when only the reverse direction satisfies', () => {
        const rule = makeRule({ operator: '>', speedKmh: 40 });
        const seg = makeSeg({
            fwdSpeedLimit: 30,
            revSpeedLimit: 60,
            isAtoB: true,
            isBtoA: true,
        });
        expect(classify(seg, [rule])).not.toBeNull();
    });

    it('"Street > 30" does NOT match a street with fwd=30 and rev=30', () => {
        const rule = makeRule({ operator: '>', speedKmh: 30 });
        const seg = makeSeg({ fwdSpeedLimit: 30, revSpeedLimit: 30 });
        expect(classify(seg, [rule])).toBeNull();
    });
});

describe('classify - unset operator', () => {
    it('matches a two-way segment missing fwd speed', () => {
        const rule = makeRule({ operator: 'unset' });
        const seg = makeSeg({ fwdSpeedLimit: null, revSpeedLimit: 50 });
        expect(classify(seg, [rule])).toEqual({ color: '#FF0000', ruleId: 'r1' });
    });

    it('matches a two-way segment missing rev speed', () => {
        const rule = makeRule({ operator: 'unset' });
        const seg = makeSeg({ fwdSpeedLimit: 50, revSpeedLimit: null });
        expect(classify(seg, [rule])).not.toBeNull();
    });

    it('does NOT match a one-way segment whose inactive direction is null', () => {
        const rule = makeRule({ operator: 'unset' });
        const seg = makeSeg({
            fwdSpeedLimit: 50,
            revSpeedLimit: null,
            isAtoB: true,
            isBtoA: false, // one-way A->B; rev is naturally null
        });
        expect(classify(seg, [rule])).toBeNull();
    });

    it('matches a one-way segment whose ACTIVE direction is null', () => {
        const rule = makeRule({ operator: 'unset' });
        const seg = makeSeg({
            fwdSpeedLimit: null,
            revSpeedLimit: null,
            isAtoB: true,
            isBtoA: false,
        });
        expect(classify(seg, [rule])).not.toBeNull();
    });

    it('ignores verifiedFilter (verification has no meaning when unset)', () => {
        const rule = makeRule({ operator: 'unset', verifiedFilter: 'verified' });
        const seg = makeSeg({ fwdSpeedLimit: null, revSpeedLimit: null });
        // Both directions are "unverified=false" by default, but unset must still match.
        expect(classify(seg, [rule])).not.toBeNull();
    });
});

describe('classify - verifiedFilter', () => {
    it('"verified" only matches verified directions', () => {
        const rule = makeRule({
            operator: '>',
            speedKmh: 30,
            verifiedFilter: 'verified',
        });
        const verifiedSeg = makeSeg({
            fwdSpeedLimit: 60,
            revSpeedLimit: 60,
            isFwdSpeedLimitVerified: true,
            isRevSpeedLimitVerified: true,
        });
        const unverifiedSeg = makeSeg({
            fwdSpeedLimit: 60,
            revSpeedLimit: 60,
            isFwdSpeedLimitVerified: false,
            isRevSpeedLimitVerified: false,
        });
        expect(classify(verifiedSeg, [rule])).not.toBeNull();
        expect(classify(unverifiedSeg, [rule])).toBeNull();
    });

    it('"unverified" only matches unverified directions', () => {
        const rule = makeRule({
            operator: '>',
            speedKmh: 30,
            verifiedFilter: 'unverified',
        });
        const verifiedSeg = makeSeg({
            fwdSpeedLimit: 60,
            revSpeedLimit: 60,
            isFwdSpeedLimitVerified: true,
            isRevSpeedLimitVerified: true,
        });
        const unverifiedSeg = makeSeg({
            fwdSpeedLimit: 60,
            revSpeedLimit: 60,
            isFwdSpeedLimitVerified: false,
            isRevSpeedLimitVerified: false,
        });
        expect(classify(verifiedSeg, [rule])).toBeNull();
        expect(classify(unverifiedSeg, [rule])).not.toBeNull();
    });

    it('"any" (default) matches both verified and unverified', () => {
        const rule = makeRule({ operator: '>', speedKmh: 30 });
        expect(
            classify(makeSeg({ fwdSpeedLimit: 60, isFwdSpeedLimitVerified: true }), [
                rule,
            ]),
        ).not.toBeNull();
        expect(
            classify(makeSeg({ fwdSpeedLimit: 60, isFwdSpeedLimitVerified: false }), [
                rule,
            ]),
        ).not.toBeNull();
    });
});

describe('classify - rule precedence', () => {
    it('returns the FIRST matching rule', () => {
        const rules: Rule[] = [
            makeRule({ id: 'first', operator: '>', speedKmh: 10, color: '#AAA' }),
            makeRule({ id: 'second', operator: '>', speedKmh: 20, color: '#BBB' }),
        ];
        const seg = makeSeg({ fwdSpeedLimit: 50 });
        expect(classify(seg, rules)?.ruleId).toBe('first');
    });
});
