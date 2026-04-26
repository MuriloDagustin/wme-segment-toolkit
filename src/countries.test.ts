import { describe, it, expect } from 'vitest';
import {
    getCountryProfile,
    AVAILABLE_PROFILES,
} from './countries';

describe('getCountryProfile', () => {
    it('returns BR profile for "BR"', () => {
        const p = getCountryProfile('BR');
        expect(p.abbr).toBe('BR');
        expect(p.name).toBe('Brazil');
    });

    it('is case-insensitive', () => {
        expect(getCountryProfile('br').abbr).toBe('BR');
    });

    it('falls back to DEFAULT for unknown abbreviations', () => {
        expect(getCountryProfile('ZZ').abbr).toBe('DEFAULT');
    });

    it('falls back to DEFAULT for null/undefined', () => {
        expect(getCountryProfile(null).abbr).toBe('DEFAULT');
        expect(getCountryProfile(undefined).abbr).toBe('DEFAULT');
    });
});

describe('AVAILABLE_PROFILES', () => {
    it('exposes BR and DEFAULT', () => {
        const abbrs = AVAILABLE_PROFILES.map((p) => p.abbr);
        expect(abbrs).toContain('BR');
        expect(abbrs).toContain('DEFAULT');
    });

    it('every profile has at least one road type entry', () => {
        for (const p of AVAILABLE_PROFILES) {
            expect(p.roadTypes.length).toBeGreaterThan(0);
        }
    });

    it('road type ids are unique within each profile', () => {
        for (const p of AVAILABLE_PROFILES) {
            const ids = p.roadTypes.map((r) => r.id);
            expect(new Set(ids).size).toBe(ids.length);
        }
    });
});
