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
import {
    refreshNameHighlights,
    setupNameHighlightLayer,
} from './name-highlights';
import {
    refreshIssuesHighlights,
    setupIssuesLayer,
} from './issues-highlights';
import { applyAllLayerZIndexes } from './layer-zindex';
import type { IssueId } from './config';
import { detectContext } from './sdk-bootstrap';
import { jumpToNearestSegment } from './jump-to-segment';
import { buildPanel } from './ui/panel';
import { injectStyles } from './ui/styles';

const SCRIPT_NAME = 'WME Segment Toolkit';

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
    /** Segment IDs that matched each speed rule (last refresh). */
    matchSegmentIds: Record<string, number[]> = {};
    debugCount = 0;

    /** Per-rule match counts for name rules (last refresh). */
    nameMatchCounts: Record<string, number> = {};
    /** Segment IDs that matched each name rule (last refresh). */
    nameMatchSegmentIds: Record<string, number[]> = {};
    nameTotal = 0;

    /** Per-issue match counts (last refresh). */
    issuesMatchCounts: Record<IssueId, number> = {
        unnamed: 0,
        veryShort: 0,
        noSpeedLimit: 0,
    };
    /** Segment IDs that matched each issue (last refresh). */
    issuesMatchSegmentIds: Record<IssueId, number[]> = {
        unnamed: [],
        veryShort: [],
        noSpeedLimit: [],
    };
    issuesTotal = 0;

    /** Set by the panel so refreshHighlights can notify the UI. */
    onCountsUpdated: (() => void) | null = null;

    /** Set by the names tab so refreshNameHighlights can notify the UI. */
    onNameCountsUpdated: (() => void) | null = null;

    /** Set by the issues tab so refreshIssuesHighlights can notify the UI. */
    onIssuesCountsUpdated: (() => void) | null = null;

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
        this.matchSegmentIds = result.segmentIdsByRule;
        this.debugCount = result.debugCount;
        this.onCountsUpdated?.();

        const nameResult = refreshNameHighlights(this.sdk, this.config);
        this.nameMatchCounts = nameResult.matchCounts;
        this.nameMatchSegmentIds = nameResult.segmentIdsByRule;
        this.nameTotal = nameResult.totalFeatures;
        this.onNameCountsUpdated?.();

        const issuesResult = refreshIssuesHighlights(this.sdk, this.config);
        this.issuesMatchCounts = issuesResult.matchCounts;
        this.issuesMatchSegmentIds = issuesResult.segmentIdsByIssue;
        this.issuesTotal = issuesResult.totalFeatures;
        this.onIssuesCountsUpdated?.();

        return result;
    }

    /**
     * Pan/select the segment closest to the viewport center from the given
     * list. Used by rule badges to jump to a representative match.
     */
    jumpToNearestSegment(segmentIds: readonly number[]): boolean {
        return jumpToNearestSegment(this.sdk, segmentIds);
    }

    /** Wire up the layer, build the side-panel and subscribe to SDK events. */
    start(): void {
        console.log(`[${SCRIPT_NAME}] ${this.messages.scriptReady}`);

        setupHighlightLayer(this.sdk);
        setupNameHighlightLayer(this.sdk);
        setupIssuesLayer(this.sdk);
        applyAllLayerZIndexes(this.sdk, this.config);

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
