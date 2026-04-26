import { describe, it, expect, beforeEach } from 'vitest';
import {
    clone,
    newId,
    defaultConfig,
    loadConfig,
    saveConfig,
    STORAGE_KEY,
    type ConfigStorage,
    type Config,
} from './config';
import type { CountryProfile } from './countries';

const profileWithBoth: CountryProfile = {
    abbr: 'XX',
    name: 'Test',
    roadTypes: [
        { id: 1, label: 'Street' },
        { id: 2, label: 'Primary' },
    ],
};

const profileStreetOnly: CountryProfile = {
    abbr: 'YY',
    name: 'Test',
    roadTypes: [{ id: 1, label: 'Street' }],
};

const profileNeither: CountryProfile = {
    abbr: 'ZZ',
    name: 'Test',
    roadTypes: [{ id: 3, label: 'Freeway' }],
};

class MemoryStorage implements ConfigStorage {
    private store = new Map<string, string>();
    getItem(key: string): string | null {
        return this.store.get(key) ?? null;
    }
    setItem(key: string, value: string): void {
        this.store.set(key, value);
    }
    has(key: string): boolean {
        return this.store.has(key);
    }
}

describe('clone', () => {
    it('produces a deep copy', () => {
        const a = { rules: [{ id: '1', nested: { x: 1 } }] };
        const b = clone(a) as typeof a;
        b.rules[0].nested.x = 999;
        expect(a.rules[0].nested.x).toBe(1);
    });
});

describe('newId', () => {
    it('produces unique-looking ids', () => {
        const ids = new Set(Array.from({ length: 50 }, () => newId()));
        expect(ids.size).toBe(50);
    });

    it('starts with the "r-" prefix', () => {
        expect(newId()).toMatch(/^r-\d+-[a-z0-9]+$/);
    });
});

describe('defaultConfig', () => {
    it('emits two rules when both road types are present', () => {
        const cfg = defaultConfig(profileWithBoth);
        expect(cfg.rules).toHaveLength(2);
        expect(cfg.rules.map((r) => r.id)).toEqual([
            'default-primary',
            'default-street',
        ]);
    });

    it('emits only the street rule when primary is missing', () => {
        const cfg = defaultConfig(profileStreetOnly);
        expect(cfg.rules).toHaveLength(1);
        expect(cfg.rules[0].id).toBe('default-street');
    });

    it('emits no rules when neither road type is present', () => {
        const cfg = defaultConfig(profileNeither);
        expect(cfg.rules).toEqual([]);
    });

    it('default rules are enabled', () => {
        for (const rule of defaultConfig(profileWithBoth).rules) {
            expect(rule.enabled).toBe(true);
        }
    });
});

describe('loadConfig / saveConfig roundtrip', () => {
    let storage: MemoryStorage;

    beforeEach(() => {
        storage = new MemoryStorage();
    });

    it('returns empty rules when storage is empty', () => {
        expect(loadConfig(storage)).toEqual({ rules: [] });
    });

    it('returns empty rules when storage holds invalid JSON', () => {
        storage.setItem(STORAGE_KEY, '{not json');
        expect(loadConfig(storage)).toEqual({ rules: [] });
    });

    it('returns empty rules when stored object lacks rules array', () => {
        storage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
        expect(loadConfig(storage)).toEqual({ rules: [] });
    });

    it('saves and loads a config unchanged', () => {
        const cfg: Config = {
            rules: defaultConfig(profileWithBoth).rules,
            selectedCountry: 'BR',
        };
        saveConfig(cfg, storage);
        const loaded = loadConfig(storage);
        expect(loaded).toEqual(cfg);
    });

    it('writes under the documented storage key', () => {
        saveConfig({ rules: [] }, storage);
        expect(storage.has(STORAGE_KEY)).toBe(true);
    });
});
