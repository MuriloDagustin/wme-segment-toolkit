import type { WmeSDK, Street } from 'wme-sdk-typings';

export type MatchMode = 'primary-id' | 'name';

interface BfsContext {
    sdk: WmeSDK;
    streetCache: Map<number, Street | null>;
    targetName: string | null;
    targetPrimaryStreetId: number | null;
    mode: MatchMode;
}

/**
 * BFS over connected segments through their shared nodes.
 *
 * Matching rules:
 * - 'primary-id': neighbor.primaryStreetId === seed.primaryStreetId.
 *   Strict, never crosses streets with different ids — but stops at
 *   roundabouts and other linking constructs that have their own street.
 * - 'name': neighbor's primary street name OR any of its alternate street
 *   names equals the seed's primary street name (case-insensitive, trimmed).
 *   Crosses roundabouts and reconnects continuations on the other side, at
 *   the cost of also picking up unrelated streets that share the same name.
 */
export function findConnectedStreetSegmentIds(
    sdk: WmeSDK,
    seedSegmentId: number,
    mode: MatchMode = 'primary-id',
): number[] {
    const seed = safeGetSegment(sdk, seedSegmentId);
    if (!seed) return [];

    const streetCache = new Map<number, Street | null>();
    const ctx: BfsContext = {
        sdk,
        streetCache,
        targetName:
            mode === 'name'
                ? normalizeName(getStreetName(sdk, seed.primaryStreetId, streetCache))
                : null,
        targetPrimaryStreetId: seed.primaryStreetId,
        mode,
    };

    if (mode === 'primary-id' && ctx.targetPrimaryStreetId == null) return [seed.id];
    if (mode === 'name' && !ctx.targetName) return [seed.id];

    // Final result (segments matching the street). Roundabout segments traversed
    // along the way are NOT collected here — they are tracked in `visited` only
    // to avoid infinite loops while letting BFS jump to the other side.
    const matched = new Set<number>([seed.id]);
    const visited = new Set<number>([seed.id]);
    const queue: number[] = [seed.id];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const current = safeGetSegment(sdk, currentId);
        if (!current) continue;

        for (const nodeId of [current.fromNodeId, current.toNodeId]) {
            if (nodeId == null) continue;

            const node = safeGetNode(sdk, nodeId);
            if (!node) continue;

            for (const neighborId of node.connectedSegmentIds ?? []) {
                if (visited.has(neighborId)) continue;
                const neighbor = safeGetSegment(sdk, neighborId);
                if (!neighbor) continue;

                const isRoundabout = neighbor.junctionId != null;
                const isMatch = neighborMatches(ctx, neighbor);

                // Skip neighbors that neither match the street nor act as
                // transparent connectors (roundabouts).
                if (!isMatch && !isRoundabout) continue;

                visited.add(neighborId);
                queue.push(neighborId);
                if (isMatch) matched.add(neighborId);
            }
        }
    }

    return Array.from(matched);
}

/**
 * Expand the current segment selection to every connected segment matching
 * the chosen `mode`. Returns `{ expanded: false }` when there is no usable
 * segment selection.
 */
export function selectWholeStreet(
    sdk: WmeSDK,
    mode: MatchMode = 'primary-id',
): { expanded: boolean; count: number } {
    const selection = sdk.Editing.getSelection();
    if (!selection || selection.objectType !== 'segment' || selection.ids.length === 0) {
        return { expanded: false, count: 0 };
    }

    const allIds = new Set<number>();
    for (const id of selection.ids as number[]) {
        for (const found of findConnectedStreetSegmentIds(sdk, id, mode)) {
            allIds.add(found);
        }
    }

    if (allIds.size === 0) return { expanded: false, count: 0 };

    sdk.Editing.setSelection({
        selection: { objectType: 'segment', ids: Array.from(allIds) },
    });
    return { expanded: true, count: allIds.size };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function neighborMatches(
    ctx: BfsContext,
    neighbor: NonNullable<ReturnType<typeof safeGetSegment>>,
): boolean {
    if (ctx.mode === 'primary-id') {
        return neighbor.primaryStreetId === ctx.targetPrimaryStreetId;
    }

    const primaryName = normalizeName(
        getStreetName(ctx.sdk, neighbor.primaryStreetId, ctx.streetCache),
    );
    if (primaryName && primaryName === ctx.targetName) return true;

    for (const altId of neighbor.alternateStreetIds ?? []) {
        const altName = normalizeName(getStreetName(ctx.sdk, altId, ctx.streetCache));
        if (altName && altName === ctx.targetName) return true;
    }
    return false;
}

function getStreetName(
    sdk: WmeSDK,
    streetId: number | null,
    cache: Map<number, Street | null>,
): string | null {
    if (streetId == null) return null;
    if (cache.has(streetId)) return cache.get(streetId)?.name ?? null;
    let street: Street | null = null;
    try {
        street = sdk.DataModel.Streets.getById({ streetId });
    } catch {
        street = null;
    }
    cache.set(streetId, street);
    return street?.name ?? null;
}

function normalizeName(name: string | null | undefined): string | null {
    if (!name) return null;
    const trimmed = name.trim();
    return trimmed === '' ? null : trimmed.toLocaleLowerCase();
}

function safeGetSegment(sdk: WmeSDK, id: number) {
    try {
        return sdk.DataModel.Segments.getById({ segmentId: id });
    } catch {
        return null;
    }
}

function safeGetNode(sdk: WmeSDK, id: number) {
    try {
        return sdk.DataModel.Nodes.getById({ nodeId: id });
    } catch {
        return null;
    }
}
