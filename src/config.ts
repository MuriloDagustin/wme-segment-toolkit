import type { RoadTypeId } from 'wme-sdk-typings';
import type { CountryProfile } from './countries';

export type Operator = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'unset';
export type VerifiedFilter = 'any' | 'verified' | 'unverified';

export type NameMatchMode = 'prefix' | 'contains' | 'exact';
export type RoadTypeFilterOp = 'in' | 'not-in';
export type NameSource = 'primary' | 'alternate' | 'any';

export interface NameRule {
    id: string;
    enabled: boolean;
    pattern: string;
    matchMode: NameMatchMode;
    nameSource: NameSource;
    /** When `roadTypes` is empty, road type filter is ignored. */
    roadTypeFilter: RoadTypeFilterOp;
    roadTypes: number[];
    color: string;
}

export interface Rule {
    id: string;
    enabled: boolean;
    roadType: RoadTypeId;
    operator: Operator;
    speedKmh: number;
    color: string;
    /** Default: 'any'. */
    verifiedFilter?: VerifiedFilter;
}

export interface Config {
    rules: Rule[];
    /** Name-pattern + road-type rules (separate highlight layer). */
    nameRules?: NameRule[];
    /** User-selected country code; 'auto' or undefined means auto-detect. */
    selectedCountry?: string;
}

export const OPERATORS: Operator[] = ['==', '!=', '>', '>=', '<', '<=', 'unset'];
export const VERIFIED_FILTERS: VerifiedFilter[] = ['any', 'verified', 'unverified'];
export const NAME_MATCH_MODES: NameMatchMode[] = ['prefix', 'contains', 'exact'];
export const ROAD_TYPE_FILTER_OPS: RoadTypeFilterOp[] = ['in', 'not-in'];
export const NAME_SOURCES: NameSource[] = ['primary', 'alternate', 'any'];

export const STORAGE_KEY = 'wme-speed-limit-validator:config:v2';

export function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

export function newId(): string {
    return `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Build country-aware default rules. Heuristic:
 *   - Primary Street (id 2) at exactly 30 km/h -> red (suspicious for that class).
 *   - Local Street (id 1) above 30 km/h -> orange.
 * Rules are only emitted for road types present in the profile.
 */
export function defaultConfig(profile: CountryProfile): Config {
    const hasStreet = profile.roadTypes.some((r) => r.id === 1);
    const hasPrimary = profile.roadTypes.some((r) => r.id === 2);
    const rules: Rule[] = [];
    if (hasPrimary) {
        rules.push({
            id: 'default-primary',
            enabled: true,
            roadType: 2,
            operator: '==',
            speedKmh: 30,
            color: '#FF0000',
        });
    }
    if (hasStreet) {
        rules.push({
            id: 'default-street',
            enabled: true,
            roadType: 1,
            operator: '>',
            speedKmh: 30,
            color: '#FFA500',
        });
    }
    return { rules };
}

export interface ConfigStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

/** Load config from a Storage-like object. Returns an empty config on any error. */
export function loadConfig(storage: ConfigStorage = localStorage): Config {
    try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return { rules: [] };
        const parsed = JSON.parse(raw) as Config;
        if (!parsed?.rules || !Array.isArray(parsed.rules)) return { rules: [] };
        return parsed;
    } catch {
        return { rules: [] };
    }
}

/** Save config to a Storage-like object. Throws are swallowed. */
export function saveConfig(config: Config, storage: ConfigStorage = localStorage): void {
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.error('[VelocityDiff] saveConfig failed:', e);
    }
}
