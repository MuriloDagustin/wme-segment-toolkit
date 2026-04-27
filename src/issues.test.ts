import { describe, expect, it } from 'vitest';
import {
    classifyIssue,
    isMissingSpeedLimit,
    isUnnamed,
    isVeryShort,
    type IssueCheckableSegment,
    VERY_SHORT_LENGTH_M,
} from './issues';
import { DEFAULT_ISSUES_CONFIG, type IssuesConfig } from './config';

const noNameLookup = () => null;
const namedLookup = (id: number) => (id === 1 ? 'Some Street' : null);

function seg(overrides: Partial<IssueCheckableSegment> = {}): IssueCheckableSegment {
    return {
        roadType: 1,
        primaryStreetId: 1,
        length: 100,
        junctionId: null,
        fwdSpeedLimit: 50,
        revSpeedLimit: 50,
        isAtoB: false,
        isBtoA: false,
        isTwoWay: true,
        allowNoDirection: false,
        ...overrides,
    };
}

function enabled(...ids: Array<keyof IssuesConfig>): IssuesConfig {
    const cfg: IssuesConfig = JSON.parse(JSON.stringify(DEFAULT_ISSUES_CONFIG));
    for (const id of ids) cfg[id].enabled = true;
    return cfg;
}

describe('isUnnamed', () => {
    it('flags Street with no primaryStreetId', () => {
        expect(isUnnamed(seg({ primaryStreetId: null }), noNameLookup)).toBe(true);
    });

    it('flags Street with empty street name', () => {
        expect(isUnnamed(seg({ primaryStreetId: 99 }), () => '')).toBe(true);
    });

    it('does not flag when name exists', () => {
        expect(isUnnamed(seg({ primaryStreetId: 1 }), namedLookup)).toBe(false);
    });

    it('does not flag parking lot road type (20)', () => {
        expect(isUnnamed(seg({ roadType: 20, primaryStreetId: null }), noNameLookup)).toBe(
            false,
        );
    });

    it('flags Primary Street (2) without name', () => {
        expect(isUnnamed(seg({ roadType: 2, primaryStreetId: null }), noNameLookup)).toBe(
            true,
        );
    });

    it('flags Ramp (17) without name', () => {
        expect(isUnnamed(seg({ roadType: 17, primaryStreetId: null }), noNameLookup)).toBe(
            true,
        );
    });
});

describe('isVeryShort', () => {
    it('flags segments shorter than threshold', () => {
        expect(isVeryShort(seg({ length: VERY_SHORT_LENGTH_M - 1 }))).toBe(true);
    });

    it('does not flag segments at threshold', () => {
        expect(isVeryShort(seg({ length: VERY_SHORT_LENGTH_M }))).toBe(false);
    });

    it('does not flag long segments', () => {
        expect(isVeryShort(seg({ length: 50 }))).toBe(false);
    });

    it('does not flag roundabout segments even if short', () => {
        expect(isVeryShort(seg({ length: 2, junctionId: 7 }))).toBe(false);
    });

    it('does not flag zero-length segments (degenerate)', () => {
        expect(isVeryShort(seg({ length: 0 }))).toBe(false);
    });
});

describe('isMissingSpeedLimit', () => {
    it('flags two-way Primary Street with no limits in either direction', () => {
        expect(
            isMissingSpeedLimit(
                seg({
                    roadType: 2,
                    isTwoWay: true,
                    fwdSpeedLimit: null,
                    revSpeedLimit: null,
                }),
            ),
        ).toBe(true);
    });

    it('does not flag two-way Primary Street with limit in fwd only', () => {
        expect(
            isMissingSpeedLimit(
                seg({
                    roadType: 2,
                    isTwoWay: true,
                    fwdSpeedLimit: 60,
                    revSpeedLimit: null,
                }),
            ),
        ).toBe(false);
    });

    it('flags one-way A-to-B with null fwd limit', () => {
        expect(
            isMissingSpeedLimit(
                seg({
                    roadType: 6,
                    isAtoB: true,
                    isBtoA: false,
                    isTwoWay: false,
                    fwdSpeedLimit: null,
                    revSpeedLimit: null,
                }),
            ),
        ).toBe(true);
    });

    it('does not flag one-way A-to-B with set fwd limit even if rev null', () => {
        expect(
            isMissingSpeedLimit(
                seg({
                    roadType: 6,
                    isAtoB: true,
                    isBtoA: false,
                    isTwoWay: false,
                    fwdSpeedLimit: 80,
                    revSpeedLimit: null,
                }),
            ),
        ).toBe(false);
    });

    it('does not flag Street (residential) road type', () => {
        expect(
            isMissingSpeedLimit(
                seg({ roadType: 1, fwdSpeedLimit: null, revSpeedLimit: null }),
            ),
        ).toBe(false);
    });

    it('does not flag segments with allowNoDirection (parking lot)', () => {
        expect(
            isMissingSpeedLimit(
                seg({
                    roadType: 2,
                    allowNoDirection: true,
                    fwdSpeedLimit: null,
                    revSpeedLimit: null,
                }),
            ),
        ).toBe(false);
    });
});

describe('classifyIssue', () => {
    it('returns null when all checks are disabled', () => {
        expect(
            classifyIssue(
                seg({ primaryStreetId: null }),
                DEFAULT_ISSUES_CONFIG,
                noNameLookup,
            ),
        ).toBeNull();
    });

    it('returns the matching issue id and color', () => {
        const result = classifyIssue(
            seg({ primaryStreetId: null }),
            enabled('unnamed'),
            noNameLookup,
        );
        expect(result?.issueId).toBe('unnamed');
        expect(result?.color).toBe(DEFAULT_ISSUES_CONFIG.unnamed.color);
    });

    it('returns the first match when multiple issues apply (unnamed > veryShort)', () => {
        const result = classifyIssue(
            seg({ primaryStreetId: null, length: 2 }),
            enabled('unnamed', 'veryShort'),
            noNameLookup,
        );
        expect(result?.issueId).toBe('unnamed');
    });

    it('skips disabled checks even if segment matches them', () => {
        const result = classifyIssue(
            seg({ primaryStreetId: null, length: 2 }),
            enabled('veryShort'),
            noNameLookup,
        );
        expect(result?.issueId).toBe('veryShort');
    });

    it('returns null when no enabled check matches', () => {
        expect(
            classifyIssue(seg(), enabled('unnamed', 'veryShort'), namedLookup),
        ).toBeNull();
    });
});
