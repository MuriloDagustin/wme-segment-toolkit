import type { App } from '../../app';
import type { CountryProfile } from '../../countries';
import {
    computeSelectionStats,
    formatLength,
    type SelectionStats,
    type StatsSegment,
} from '../../selection-stats';

/**
 * Build the "Stats" tab. Listens to selection changes and recomputes
 * aggregate statistics over the currently selected segments. Pure
 * computation lives in `selection-stats.ts`; this module only handles DOM
 * and SDK glue.
 */
export function buildStatsTab(app: App, container: HTMLElement): void {
    const intro = document.createElement('p');
    intro.style.fontSize = '11px';
    intro.style.color = '#555';
    intro.style.margin = '0 0 10px 0';
    intro.textContent = app.messages.stats.description;
    container.appendChild(intro);

    const body = document.createElement('div');
    body.classList.add('wme-vbr-stats');
    container.appendChild(body);

    const render = (): void => {
        body.innerHTML = '';
        const segments = collectSelectedSegments(app);

        if (segments.length === 0) {
            const empty = document.createElement('div');
            empty.classList.add('wme-vbr-stats-empty');
            empty.textContent = app.messages.stats.empty;
            body.appendChild(empty);
            return;
        }

        const stats = computeSelectionStats(segments);
        renderStats(body, stats, app);
    };

    render();

    app.sdk.Events.on({
        eventName: 'wme-selection-changed',
        eventHandler: render,
    });
    // Re-render when data updates while the same selection is active (e.g.
    // after a save round-trip changing speed limits).
    app.sdk.Events.on({
        eventName: 'wme-data-model-objects-changed',
        eventHandler: render,
    });
}

// ---------------------------------------------------------------------------

function collectSelectedSegments(app: App): StatsSegment[] {
    const selection = app.sdk.Editing.getSelection();
    if (!selection || selection.objectType !== 'segment') return [];

    const out: StatsSegment[] = [];
    for (const id of selection.ids as number[]) {
        try {
            const seg = app.sdk.DataModel.Segments.getById({ segmentId: id });
            if (seg) out.push(seg);
        } catch {
            // Segment may have been deleted between events; just skip it.
        }
    }
    return out;
}

function renderStats(parent: HTMLElement, stats: SelectionStats, app: App): void {
    const m = app.messages.stats;

    appendRow(parent, m.segments, String(stats.segmentCount));
    appendRow(parent, m.length, formatLength(stats.totalLengthM));
    appendRow(parent, m.nodes, String(stats.nodeCount));
    appendRow(parent, m.streets, String(stats.streetCount));

    appendRow(
        parent,
        m.speedRange,
        stats.minSpeedKmh == null
            ? m.noSpeedData
            : stats.minSpeedKmh === stats.maxSpeedKmh
                ? `${stats.minSpeedKmh} km/h`
                : `${stats.minSpeedKmh} – ${stats.maxSpeedKmh} km/h`,
    );
    appendRow(
        parent,
        m.speedAvg,
        stats.avgSpeedKmh == null ? '—' : `${Math.round(stats.avgSpeedKmh)} km/h`,
    );

    appendBreakdown(parent, m.roadTypes, stats, app.countryProfile);
    appendFlags(parent, stats, app);
}

function appendRow(parent: HTMLElement, label: string, value: string): void {
    const row = document.createElement('div');
    row.classList.add('wme-vbr-stats-row');

    const lbl = document.createElement('span');
    lbl.classList.add('wme-vbr-stats-label');
    lbl.textContent = label;

    const val = document.createElement('span');
    val.classList.add('wme-vbr-stats-value');
    val.textContent = value;

    row.appendChild(lbl);
    row.appendChild(val);
    parent.appendChild(row);
}

function appendBreakdown(
    parent: HTMLElement,
    title: string,
    stats: SelectionStats,
    profile: CountryProfile,
): void {
    if (stats.byRoadType.size === 0) return;

    const heading = document.createElement('div');
    heading.classList.add('wme-vbr-stats-heading');
    heading.textContent = title;
    parent.appendChild(heading);

    // Sort by length descending so the most significant types come first.
    const entries = Array.from(stats.byRoadType.entries()).sort(
        (a, b) => b[1].lengthM - a[1].lengthM,
    );

    const labelById = new Map<number, string>();
    for (const rt of profile.roadTypes) labelById.set(rt.id, rt.label);

    for (const [roadTypeId, entry] of entries) {
        const label = labelById.get(roadTypeId) ?? `#${roadTypeId}`;
        appendRow(
            parent,
            label,
            `${entry.count} · ${formatLength(entry.lengthM)}`,
        );
    }
}

function appendFlags(parent: HTMLElement, stats: SelectionStats, app: App): void {
    const m = app.messages.stats;
    const allFlags: Array<[string, number]> = [
        [m.oneWay, stats.oneWayCount],
        [m.roundabout, stats.inRoundaboutCount],
        [m.tunnel, stats.tunnelCount],
        [m.unpaved, stats.unpavedCount],
        [m.closures, stats.closuresCount],
        [m.restrictions, stats.restrictionsCount],
        [m.houseNumbers, stats.withHouseNumbersCount],
    ];
    const flags = allFlags.filter(([, n]) => n > 0);

    if (flags.length === 0) return;

    const heading = document.createElement('div');
    heading.classList.add('wme-vbr-stats-heading');
    heading.textContent = m.flags;
    parent.appendChild(heading);

    for (const [label, n] of flags) {
        appendRow(parent, label, String(n));
    }
}
