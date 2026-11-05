/**
 * Echo mode — the bedside tablet experience.
 *
 * A device is in echo mode when it is served from the `echo.` subdomain (locked; there is
 * no way out) or when someone on it chose "Switch to Echo mode" (remembered on the device).
 * The preference is a display setting, not domain data, so localStorage is appropriate.
 */

export const ECHO_PATH = '/echo';

const PREFERENCE_KEY = 'haccare-echo-mode';
const SUGGESTION_DISMISSED_KEY = 'haccare-echo-suggestion-dismissed';

const hasWindow = () => typeof window !== 'undefined';

export function isEchoHostname(hostname: string): boolean {
  return hostname.toLowerCase().startsWith('echo.');
}

export function isEchoHost(): boolean {
  return hasWindow() && isEchoHostname(window.location.hostname);
}

export function isEchoPreferred(): boolean {
  return hasWindow() && window.localStorage.getItem(PREFERENCE_KEY) === 'on';
}

export function setEchoPreferred(on: boolean): void {
  if (!hasWindow()) return;
  if (on) window.localStorage.setItem(PREFERENCE_KEY, 'on');
  else window.localStorage.removeItem(PREFERENCE_KEY);
}

export function isEchoMode(): boolean {
  return isEchoHost() || isEchoPreferred();
}

/** Touch-first device with no mouse/trackpad — a tablet or phone rather than a laptop. */
export function isLikelyHandheld(): boolean {
  if (!hasWindow() || typeof window.matchMedia !== 'function') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches &&
    !window.matchMedia('(any-pointer: fine)').matches
  );
}

export function isEchoSuggestionDismissed(): boolean {
  return hasWindow() && window.localStorage.getItem(SUGGESTION_DISMISSED_KEY) === 'true';
}

export function dismissEchoSuggestion(): void {
  if (hasWindow()) window.localStorage.setItem(SUGGESTION_DISMISSED_KEY, 'true');
}

/**
 * Where to send someone after they sign in. Echo devices are shared, so the previous
 * user's simulation is forgotten and everyone starts at the simulation list.
 */
export function getPostLoginPath(simulationOnly?: boolean): string {
  if (isEchoMode()) {
    if (hasWindow()) window.localStorage.removeItem('current_simulation_tenant');
    return ECHO_PATH;
  }
  if (simulationOnly) {
    if (hasWindow()) window.localStorage.removeItem('current_simulation_tenant');
    return '/app/simulation-portal';
  }
  return '/app';
}
