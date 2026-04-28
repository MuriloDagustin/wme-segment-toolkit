import { describe, it, expect } from 'vitest';
import {
    computeSelectionStats,
    formatLength,
    type StatsSegment,
} from './selection-stats';

function seg(over: Partial<StatsSegment> = {}): StatsSegment {
    return {
        id: 1,
        length: 100,
        fromNodeId: 1,
        toNodeId: 2,
        primaryStreetId: 10,
        roadType: 1,
        fwdSpeedLimit: null,
        revSpeedLimit: null,
        isAtoB: true,
        isBtoA: true,
        isTwoWay: true,
        junctionId: null,
        flagAttributes: { tunnel: false, unpaved: false },
        hasClosures: false,
        hasRestrictions: false,
        hasHouseNumbers: false,
        ...over,
    };
}

describe('computeSelectionStats', () => {
    it('returns zeroed stats for an empty selection', () => {
        const s = computeSelectionStats([]);
        expect(s.segmentCount).toBe(0);
        expect(s.totalLengthM).toBe(0);
        expect(s.nodeCount).toBe(0);
        expect(s.streetCount).toBe(0);
        expect(s.minSpeedKmh).toBeNull();
        expect(s.avgSpeedKmh).toBeNull();
        expect(s.byRoadType.size).toBe(0);
    });

    it('counts distinct nodes and streets, not raw occurrences', () => {
        const s = computeSelectionStats([
            seg({ id: 1, fromNodeId: 1, toNodeId: 2, primaryStreetId: 10 }),
            seg({ id: 2, fromNodeId: 2, toNodeId: 3, primaryStreetId: 10 }),
            seg({ id: 3, fromNodeId: 3, toNodeId: 4, primaryStreetId: 11 }),
        ]);
        expect(s.segmentCount).toBe(3);
        expect(s.nodeCount).toBe(4);
        expect(s.streetCount).toBe(2);
    });

    it('sums total length across segments', () => {
        const s = computeSelectionStats([
            seg({ length: 100 }),
            seg({ length: 250 }),
        ]);
        expect(s.totalLengthM).toBe(350);
    });

    it('groups by road type with counts and length', () => {
        const s = computeSelectionStats([
            seg({ roadType: 1, length: 100 }),
            seg({ roadType: 1, length: 200 }),
            seg({ roadType: 2, length: 50 }),
        ]);
        expect(s.byRoadType.get(1 as never)).toEqual({ count: 2, lengthM: 300 });
        expect(s.byRoadType.get(2 as never)).toEqual({ count: 1, lengthM: 50 });
    });

    it('computes length-weighted average speed using active directions only', () => {
        // 100 m fwd-only @ 50 km/h, 300 m rev-only @ 80 km/h
        // weighted avg = (50*100 + 80*300) / (100 + 300) = 29000 / 400 = 72.5
        const s = computeSelectionStats([
            seg({
                length: 100,
                isAtoB: true,
                isBtoA: false,
                isTwoWay: false,
                fwdSpeedLimit: 50,
            }),
            seg({
                length: 300,
                isAtoB: false,
                isBtoA: true,
                isTwoWay: false,
                revSpeedLimit: 80,
            }),
        ]);
        expect(s.minSpeedKmh).toBe(50);
        expect(s.maxSpeedKmh).toBe(80);
        expect(s.avgSpeedKmh).toBeCloseTo(72.5, 5);
    });

    it('counts both directions for two-way segments in the average', () => {
        // length 100, twoWay, fwd=40 rev=60 -> sum 100*40+100*60=10000, weight 200, avg 50
        const s = computeSelectionStats([
            seg({
                length: 100,
                isAtoB: true,
                isBtoA: true,
                isTwoWay: true,
                fwdSpeedLimit: 40,
                revSpeedLimit: 60,
            }),
        ]);
        expect(s.avgSpeedKmh).toBe(50);
    });

    it('returns null speed stats when no active direction has a limit', () => {
        const s = computeSelectionStats([
            seg({ fwdSpeedLimit: null, revSpeedLimit: null }),
        ]);
        expect(s.minSpeedKmh).toBeNull();
        expect(s.maxSpeedKmh).toBeNull();
        expect(s.avgSpeedKmh).toBeNull();
    });

    it('counts flags only when set', () => {
        const s = computeSelectionStats([
            seg({ isTwoWay: false }),
            seg({ junctionId: 5 }),
            seg({ flagAttributes: { tunnel: true, unpaved: false } }),
            seg({ hasClosures: true, hasRestrictions: true }),
            seg({ hasHouseNumbers: true }),
        ]);
        expect(s.oneWayCount).toBe(1);
        expect(s.inRoundaboutCount).toBe(1);
        expect(s.tunnelCount).toBe(1);
        expect(s.unpavedCount).toBe(0);
        expect(s.closuresCount).toBe(1);
        expect(s.restrictionsCount).toBe(1);
        expect(s.withHouseNumbersCount).toBe(1);
    });
});

describe('formatLength', () => {
    it('uses meters under 1 km', () => {
        expect(formatLength(0)).toBe('0 m');
        expect(formatLength(123.4)).toBe('123 m');
        expect(formatLength(999)).toBe('999 m');
    });

    it('uses km with two decimals at or above 1 km', () => {
        expect(formatLength(1000)).toBe('1.00 km');
        expect(formatLength(1234)).toBe('1.23 km');
        expect(formatLength(54321)).toBe('54.32 km');
    });
});
