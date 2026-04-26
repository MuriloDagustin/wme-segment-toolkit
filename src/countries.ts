import type { RoadTypeId } from 'wme-sdk-typings';

/**
 * Per-country catalog of road types: localized labels + suggested speed limit.
 * The numeric IDs come from the SDK's ROAD_TYPE constant.
 */
export interface RoadTypeEntry {
    id: RoadTypeId;
    /** Localized display name (rendered in the UI). */
    label: string;
    /** Default/expected speed limit in km/h (informational). */
    defaultSpeedKmh?: number;
}

export interface CountryProfile {
    /** Two-letter country abbreviation (matches Country.abbr from the SDK). */
    abbr: string;
    /** Human-readable country name (English). */
    name: string;
    roadTypes: RoadTypeEntry[];
}

/** Brazilian road classification (CTB / Waze BR community conventions). */
const BR_PROFILE: CountryProfile = {
    abbr: 'BR',
    name: 'Brazil',
    roadTypes: [
        { id: 1, label: 'Via Local', defaultSpeedKmh: 30 },
        { id: 2, label: 'Via Coletora', defaultSpeedKmh: 40 },
        { id: 7, label: 'Via Arterial', defaultSpeedKmh: 60 },
        { id: 6, label: 'Via Arterial Principal', defaultSpeedKmh: 60 },
        { id: 3, label: 'Via de Trânsito Rápido', defaultSpeedKmh: 80 },
        { id: 4, label: 'Rampa' },
        { id: 17, label: 'Estrada Privada' },
        { id: 20, label: 'Estacionamento' },
        { id: 22, label: 'Beco / Travessa' },
        { id: 8, label: 'Trilha' },
        { id: 9, label: 'Caminho a Pé' },
        { id: 10, label: 'Calçadão' },
        { id: 16, label: 'Escadaria' },
        { id: 5, label: 'Trilha para Caminhada' },
        { id: 15, label: 'Balsa' },
        { id: 18, label: 'Ferrovia' },
        { id: 19, label: 'Pista de Aeroporto' },
    ],
};

/** Generic / fallback profile using the SDK's English names. */
const DEFAULT_PROFILE: CountryProfile = {
    abbr: 'DEFAULT',
    name: 'Default',
    roadTypes: [
        { id: 1, label: 'Street' },
        { id: 2, label: 'Primary Street' },
        { id: 3, label: 'Freeway' },
        { id: 4, label: 'Ramp' },
        { id: 5, label: 'Walking Trail' },
        { id: 6, label: 'Major Highway' },
        { id: 7, label: 'Minor Highway' },
        { id: 8, label: 'Off-road / Not Maintained' },
        { id: 9, label: 'Walkway' },
        { id: 10, label: 'Pedestrian Boardwalk' },
        { id: 15, label: 'Ferry' },
        { id: 16, label: 'Stairway' },
        { id: 17, label: 'Private Road' },
        { id: 18, label: 'Railroad' },
        { id: 19, label: 'Runway / Taxiway' },
        { id: 20, label: 'Parking Lot Road' },
        { id: 22, label: 'Alley' },
    ],
};

const PROFILES: Record<string, CountryProfile> = {
    BR: BR_PROFILE,
    DEFAULT: DEFAULT_PROFILE,
};

/** Ordered list of all selectable country profiles (excluding the implicit fallback). */
export const AVAILABLE_PROFILES: CountryProfile[] = [BR_PROFILE, DEFAULT_PROFILE];

export function getCountryProfile(abbr: string | null | undefined): CountryProfile {
    if (!abbr) return DEFAULT_PROFILE;
    return PROFILES[abbr.toUpperCase()] ?? DEFAULT_PROFILE;
}
