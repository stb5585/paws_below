export type TouchControlPreference = 'auto' | 'on' | 'off';
export type TouchMovementPreference = 'follow' | 'joystick';

export interface TouchEnvironment {
  maxTouchPoints: number;
  hasTouchEvent: boolean;
  hasCoarsePointer: boolean;
}

export function browserTouchEnvironment(): TouchEnvironment {
  return {
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    hasTouchEvent: 'ontouchstart' in window,
    hasCoarsePointer: window.matchMedia('(any-pointer: coarse)').matches
  };
}

export function shouldShowTouchControls(
  preference: TouchControlPreference,
  environment: TouchEnvironment = browserTouchEnvironment()
): boolean {
  if (preference === 'on') return true;
  if (preference === 'off') return false;
  return environment.maxTouchPoints > 0 || environment.hasTouchEvent || environment.hasCoarsePointer;
}
