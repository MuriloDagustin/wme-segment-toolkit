import { describe, it, expect } from 'vitest';
import { pickLocale, getMessages } from './i18n';

describe('pickLocale', () => {
    it('returns "pt" for any pt-* locale', () => {
        expect(pickLocale('pt')).toBe('pt');
        expect(pickLocale('pt-BR')).toBe('pt');
        expect(pickLocale('PT-br')).toBe('pt');
    });

    it('returns "en" for English variants', () => {
        expect(pickLocale('en')).toBe('en');
        expect(pickLocale('en-US')).toBe('en');
        expect(pickLocale('EN-gb')).toBe('en');
    });

    it('falls back to "en" for unknown / empty input', () => {
        expect(pickLocale(null)).toBe('en');
        expect(pickLocale(undefined)).toBe('en');
        expect(pickLocale('')).toBe('en');
        expect(pickLocale('zh-CN')).toBe('en');
        expect(pickLocale('xx-YY')).toBe('en');
    });
});

describe('getMessages', () => {
    it('returns English catalog for "en"', () => {
        const m = getMessages('en');
        expect(m.tabTitle.toLowerCase()).toContain('speed');
        expect(m.country.label).toBe('Country');
    });

    it('returns Portuguese catalog for "pt"', () => {
        const m = getMessages('pt');
        expect(m.country.label).toBe('País');
        expect(m.operator.unset).toBe('sem limite');
    });

    it('formats parameterized messages', () => {
        const m = getMessages('en');
        expect(m.totalHighlighted(5)).toContain('5');
        expect(m.country.auto('BR')).toContain('BR');
    });
});
