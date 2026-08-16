import type { TouchControlPreference, TouchMovementPreference } from './device';
import type { MapId } from '../types';

export const PROFILE_KEY = 'paws-below-profile-v1';

export interface AnimalAppearance {
  palette: string;
  extras: Record<string, string>;
  homeStyle: string;
}

export interface AppearanceProfile {
  version: 1;
  animals: Record<string, AnimalAppearance>;
}

export interface PlayerProfile {
  version: 1;
  bestScore: number;
  collection: string[];
  pirateBadge: boolean;
  muted: boolean;
  fullBrightness: boolean;
  tutorialSeen: boolean;
  touchControls: TouchControlPreference;
  touchMovement: TouchMovementPreference;
  selectedAnimalId: string;
  selectedMapId: MapId;
  seenAnimals: string[];
  seenLevels: string[];
  bestScores: Record<string, number>;
  appearance: AppearanceProfile;
}

const DEFAULT_APPEARANCE: AppearanceProfile = {
  version: 1,
  animals: {
    'white-dog': { palette: 'natural-cream', extras: { collar: 'none' }, homeStyle: 'classic-doghouse' },
    'cream-bunny': { palette: 'natural-cream', extras: { collar: 'none' }, homeStyle: 'classic-pen' }
  }
};

export const DEFAULT_PROFILE: PlayerProfile = {
  version: 1,
  bestScore: 0,
  collection: [],
  pirateBadge: false,
  muted: false,
  fullBrightness: false,
  tutorialSeen: false,
  touchControls: 'auto',
  touchMovement: 'follow',
  selectedAnimalId: 'white-dog',
  selectedMapId: 'underground',
  seenAnimals: [],
  seenLevels: [],
  bestScores: { 'white-dog': 0, 'cream-bunny': 0 },
  appearance: DEFAULT_APPEARANCE
};

function freshDefaultProfile(): PlayerProfile {
  return {
    ...DEFAULT_PROFILE,
    collection: [], seenAnimals: [], seenLevels: [], bestScores: { ...DEFAULT_PROFILE.bestScores },
    appearance: cloneAppearance(DEFAULT_APPEARANCE)
  };
}

function cloneAppearance(appearance: AppearanceProfile): AppearanceProfile {
  return {
    version: 1,
    animals: Object.fromEntries(Object.entries(appearance.animals).map(([id, value]) => [id, {
      ...value, extras: { ...value.extras }
    }]))
  };
}

function safeAppearanceId(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^[a-z0-9-]{1,40}$/.test(value) ? value : fallback;
}

function sanitizeAppearance(value: unknown): AppearanceProfile {
  const candidate = value && typeof value === 'object' ? value as Partial<AppearanceProfile> : {};
  const animals = candidate.version === 1 && candidate.animals && typeof candidate.animals === 'object'
    ? candidate.animals as Record<string, unknown> : {};
  const sanitized = cloneAppearance(DEFAULT_APPEARANCE);
  Object.entries(sanitized.animals).forEach(([animalId, defaults]) => {
    const saved = animals[animalId] && typeof animals[animalId] === 'object'
      ? animals[animalId] as Partial<AnimalAppearance> : {};
    const savedExtras = saved.extras && typeof saved.extras === 'object' ? saved.extras as Record<string, unknown> : {};
    const extras = { ...defaults.extras };
    Object.entries(savedExtras).slice(0, 16).forEach(([slot, choice]) => {
      if (/^[a-z0-9-]{1,40}$/.test(slot) && typeof choice === 'string' && /^[a-z0-9-]{1,40}$/.test(choice)) extras[slot] = choice;
    });
    sanitized.animals[animalId] = {
      palette: safeAppearanceId(saved.palette, defaults.palette),
      extras,
      homeStyle: safeAppearanceId(saved.homeStyle, defaults.homeStyle)
    };
  });
  return sanitized;
}

export function sanitizeProfile(value: unknown): PlayerProfile {
  if (!value || typeof value !== 'object') return freshDefaultProfile();
  const candidate = value as Partial<PlayerProfile>;
  if (candidate.version !== 1) return freshDefaultProfile();
  const bestScore = Number.isFinite(candidate.bestScore) && Number(candidate.bestScore) >= 0 ? Number(candidate.bestScore) : 0;
  return {
    version: 1,
    bestScore,
    collection: Array.isArray(candidate.collection) ? [...new Set(candidate.collection.filter((x): x is string => typeof x === 'string'))] : [],
    pirateBadge: candidate.pirateBadge === true,
    muted: candidate.muted === true,
    fullBrightness: candidate.fullBrightness === true,
    tutorialSeen: candidate.tutorialSeen === true,
    touchControls: candidate.touchControls === 'on' || candidate.touchControls === 'off' ? candidate.touchControls : 'auto',
    touchMovement: candidate.touchMovement === 'joystick' ? 'joystick' : 'follow',
    selectedAnimalId: candidate.selectedAnimalId === 'cream-bunny' ? 'cream-bunny' : 'white-dog',
    selectedMapId: candidate.selectedMapId === 'farm' ? 'farm' : 'underground',
    seenAnimals: Array.isArray(candidate.seenAnimals)
      ? [...new Set(candidate.seenAnimals.filter((id): id is string => id === 'white-dog' || id === 'cream-bunny'))]
      : candidate.tutorialSeen === true ? ['white-dog'] : [],
    seenLevels: Array.isArray(candidate.seenLevels)
      ? [...new Set(candidate.seenLevels.filter((id): id is string => typeof id === 'string'))]
      : [],
    bestScores: sanitizeBestScores(candidate.bestScores, bestScore),
    appearance: sanitizeAppearance(candidate.appearance)
  };
}

function sanitizeBestScores(value: unknown, legacyBest: number): Record<string, number> {
  const scores = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const valid = (id: string, fallback = 0) => Number.isFinite(scores[id]) && Number(scores[id]) >= 0 ? Number(scores[id]) : fallback;
  return { 'white-dog': valid('white-dog', legacyBest), 'cream-bunny': valid('cream-bunny') };
}

export function animalBestScore(profile: PlayerProfile, animalId: string): number {
  return profile.bestScores[animalId] ?? 0;
}

export function resetBestScores(profile: PlayerProfile): PlayerProfile {
  return {
    ...profile,
    bestScore: 0,
    bestScores: Object.fromEntries(Object.keys(profile.bestScores).map(animalId => [animalId, 0]))
  };
}

export function loadProfile(storage: Pick<Storage, 'getItem'> = localStorage): PlayerProfile {
  try {
    const raw = storage.getItem(PROFILE_KEY);
    return raw ? sanitizeProfile(JSON.parse(raw)) : freshDefaultProfile();
  } catch {
    return freshDefaultProfile();
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
