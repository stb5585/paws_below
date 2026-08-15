import type { TouchControlPreference } from './device';

export const PROFILE_KEY = 'paws-below-profile-v1';

export interface PlayerProfile {
  version: 1;
  bestScore: number;
  collection: string[];
  pirateBadge: boolean;
  muted: boolean;
  fullBrightness: boolean;
  tutorialSeen: boolean;
  touchControls: TouchControlPreference;
}

export const DEFAULT_PROFILE: PlayerProfile = {
  version: 1,
  bestScore: 0,
  collection: [],
  pirateBadge: false,
  muted: false,
  fullBrightness: false,
  tutorialSeen: false,
  touchControls: 'auto'
};

export function sanitizeProfile(value: unknown): PlayerProfile {
  if (!value || typeof value !== 'object') return { ...DEFAULT_PROFILE };
  const candidate = value as Partial<PlayerProfile>;
  if (candidate.version !== 1) return { ...DEFAULT_PROFILE };
  return {
    version: 1,
    bestScore: Number.isFinite(candidate.bestScore) && Number(candidate.bestScore) >= 0 ? Number(candidate.bestScore) : 0,
    collection: Array.isArray(candidate.collection) ? [...new Set(candidate.collection.filter((x): x is string => typeof x === 'string'))] : [],
    pirateBadge: candidate.pirateBadge === true,
    muted: candidate.muted === true,
    fullBrightness: candidate.fullBrightness === true,
    tutorialSeen: candidate.tutorialSeen === true,
    touchControls: candidate.touchControls === 'on' || candidate.touchControls === 'off' ? candidate.touchControls : 'auto'
  };
}

export function loadProfile(storage: Pick<Storage, 'getItem'> = localStorage): PlayerProfile {
  try {
    const raw = storage.getItem(PROFILE_KEY);
    return raw ? sanitizeProfile(JSON.parse(raw)) : { ...DEFAULT_PROFILE };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: PlayerProfile, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try { storage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfile(profile))); } catch { /* privacy mode */ }
}

export function addDiscoveries(profile: PlayerProfile, treasureIds: string[], pirateFound: boolean): PlayerProfile {
  return {
    ...profile,
    collection: [...new Set([...profile.collection, ...treasureIds])],
    pirateBadge: profile.pirateBadge || pirateFound
  };
}
