/**
 * Rover mode — the bedside tablet experience.
 *
 * A device is in rover mode when it is served from the `rover.` subdomain (locked; there is
 * no way out) or when someone on it chose "Switch to Rover mode" (remembered on the device).
 * The preference is a display setting, not domain data, so localStorage is appropriate.
 */

export const ROVER_PATH = '/rover';

const PREFERENCE_KEY = 'haccare-rover-mode';
const SUGGESTION_DISMISSED_KEY = 'haccare-rover-suggestion-dismissed';

const hasWindow = () => typeof window !== 'undefined';

export function isRoverHostname(hostname: string): boolean {
  return hostname.toLowerCase().startsWith('rover.');
}

export function isRoverHost(): boolean {
  return hasWindow() && isRoverHostname(window.location.hostname);
}

export function isRoverPreferred(): boolean {
  return hasWindow() && window.localStorage.getItem(PREFERENCE_KEY) === 'on';
}

export function setRoverPreferred(on: boolean): void {
  if (!hasWindow()) return;
  if (on) window.localStorage.setItem(PREFERENCE_KEY, 'on');
  else window.localStorage.removeItem(PREFERENCE_KEY);
}

export function isRoverMode(): boolean {
  return isRoverHost() || isRoverPreferred();
}

/** Touch-first device with no mouse/trackpad — a tablet or phone rather than a laptop. */
export function isLikelyHandheld(): boolean {
  if (!hasWindow() || typeof window.matchMedia !== 'function') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches &&
    !window.matchMedia('(any-pointer: fine)').matches
  );
}

export function isRoverSuggestionDismissed(): boolean {
  return hasWindow() && window.localStorage.getItem(SUGGESTION_DISMISSED_KEY) === 'true';
}

export function dismissRoverSuggestion(): void {
  if (hasWindow()) window.localStorage.setItem(SUGGESTION_DISMISSED_KEY, 'true');
}

/**
 * Where to send someone after they sign in. Rover devices are shared, so the previous
 * user's simulation is forgotten and everyone starts at the simulation list.
 */
export function getPostLoginPath(simulationOnly?: boolean): string {
  if (isRoverMode()) {
    if (hasWindow()) window.localStorage.removeItem('current_simulation_tenant');
    return ROVER_PATH;
  }
  if (simulationOnly) {
    if (hasWindow()) window.localStorage.removeItem('current_simulation_tenant');
    return '/app/simulation-portal';
  }
  return '/app';
}
