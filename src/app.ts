import type { WmeSDK } from 'wme-sdk-typings';
import {
    defaultConfig,
    loadConfig,
    saveConfig,
    type Config,
} from './config';
import { getCountryProfile, type CountryProfile } from './countries';
import type { Messages } from './i18n';
import {
    refreshHighlights,
    setupHighlightLayer,
    type RefreshResult,
} from './highlights';
import { detectContext } from './sdk-bootstrap';
import { buildPanel } from './ui/panel';
import { injectStyles } from './ui/styles';

const SCRIPT_NAME = 'WME Speed Limit Validator';

/**
 * Encapsulates all mutable application state plus the lifecycle
 * (initial render, event subscriptions, config persistence).
 *
 * UI helpers receive the App instance (or specific bits) via parameters
 * rather than reading module globals, which makes the data flow explicit
 * and the UI pieces testable in isolation.
 */
export class App {
    readonly sdk: WmeSDK;
    config: Config;
    countryProfile: CountryProfile;
    detectedCountryAbbr: string | null;
    messages: Messages;
    debugMode = false;

    /** Current per-rule match counts (last refresh). */
    matchCounts: Record<string, number> = {};
    debugCount = 0;

    /** Set by the panel so refreshHighlights can notify the UI. */
    onCountsUpdated: (() => void) | null = null;

    constructor(sdk: WmeSDK) {
        this.sdk = sdk;
        this.config = loadConfig();

        const ctx = detectContext(sdk, this.config);
        this.detectedCountryAbbr = ctx.detectedAbbr;
        this.countryProfile = ctx.profile;
        this.messages = ctx.messages;

        // Seed defaults the first time the user opens the script.
        if (this.config.rules.length === 0) {
            this.config = defaultConfig(this.countryProfile);
            this.persistConfig();
        }
    }

    persistConfig(): void {
        try {
            saveConfig(this.config);
        } catch (e) {
            console.error(`[${SCRIPT_NAME}] ${this.messages.saveError}`, e);
        }
    }

    /** Switch the active country profile (e.g. when user picks one in the UI). */
    setCountrySelection(value: string): void {
        this.config.selectedCountry = value === 'auto' ? undefined : value;
        const effectiveAbbr =
            value === 'auto' ? this.detectedCountryAbbr : value;
        this.countryProfile = getCountryProfile(effectiveAbbr);
        this.persistConfig();
    }

    refresh(): RefreshResult {
        const result = refreshHighlights(this.sdk, this.config, this.debugMode);
        this.matchCounts = result.matchCounts;
        this.debugCount = result.debugCount;
        this.onCountsUpdated?.();
        return result;
    }

    /** Wire up the layer, build the side-panel and subscribe to SDK events. */
    start(): void {
        console.log(`[${SCRIPT_NAME}] ${this.messages.scriptReady}`);

        setupHighlightLayer(this.sdk);

        injectStyles();
        buildPanel(this).catch((e) =>
            console.error(`[${SCRIPT_NAME}] ${this.messages.tabRegisterError}`, e),
        );

        const refreshHandler = (): void => {
            this.refresh();
        };
        const events = this.sdk.Events;
        events.on({ eventName: 'wme-map-move-end', eventHandler: refreshHandler });
        events.on({ eventName: 'wme-map-zoom-changed', eventHandler: refreshHandler });
        events.on({ eventName: 'wme-map-data-loaded', eventHandler: refreshHandler });
        events.on({
            eventName: 'wme-data-model-objects-changed',
            eventHandler: refreshHandler,
        });

        this.refresh();
    }
}
