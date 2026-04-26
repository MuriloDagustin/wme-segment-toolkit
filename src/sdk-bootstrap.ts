import type { WmeSDK } from 'wme-sdk-typings';
import { getCountryProfile, type CountryProfile } from './countries';
import { getMessages, pickLocale, type Messages } from './i18n';
import type { Config } from './config';

export interface DetectedContext {
    detectedAbbr: string | null;
    profile: CountryProfile;
    messages: Messages;
}

/**
 * Read user country (top country in viewport) and locale from the SDK,
 * then resolve the country profile honoring the user's explicit
 * `config.selectedCountry` override.
 */
export function detectContext(activeSdk: WmeSDK, config: Config): DetectedContext {
    let countryAbbr: string | null = null;
    try {
        countryAbbr = activeSdk.DataModel.Countries.getTopCountry()?.abbr ?? null;
    } catch {
        // SDK may not be ready, ignore
    }

    let localeCode: string | null = null;
    try {
        localeCode = activeSdk.Settings.getLocale()?.localeCode ?? null;
    } catch {
        // ignored
    }

    const selected = config.selectedCountry;
    const effectiveAbbr =
        selected && selected !== 'auto' ? selected : countryAbbr;

    return {
        detectedAbbr: countryAbbr,
        profile: getCountryProfile(effectiveAbbr),
        messages: getMessages(pickLocale(localeCode)),
    };
}

/**
 * The WME script runs at `document-end`, but `window.SDK_INITIALIZED` /
 * `window.getWmeSdk` are injected slightly later by the editor. Poll until
 * both are present, or reject after `timeoutMs`.
 */
export function waitForSdkInjection(timeoutMs = 60000): Promise<void> {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            const w = window as unknown as {
                SDK_INITIALIZED?: Promise<unknown>;
                getWmeSdk?: unknown;
            };
            if (w.SDK_INITIALIZED && w.getWmeSdk) {
                resolve();
                return;
            }
            if (Date.now() - start > timeoutMs) {
                reject(new Error('Timeout waiting for window.SDK_INITIALIZED'));
                return;
            }
            setTimeout(check, 200);
        };
        check();
    });
}
