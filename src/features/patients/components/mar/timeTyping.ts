/**
 * Cleans a keystroke in an HH:MM field. Typing two hour digits adds the colon; typing a colon
 * yourself afterwards (or anywhere) never produces a second one, and backspacing over the
 * auto-added colon is not undone by re-adding it.
 */
export function normalizeTimeTyping(raw: string, previous: string): string {
  const cleaned = raw.replace(/[^\d:]/g, '');
  const [hoursRaw = '', ...rest] = cleaned.split(':');
  const hasColon = cleaned.includes(':');
  let hours = hoursRaw.slice(0, 2);
  let minutes = rest.join('').slice(0, 2);

  // "2000" typed without a colon: the digits after the hour belong to the minutes
  if (!hasColon && hoursRaw.length > 2) minutes = hoursRaw.slice(2, 4);

  if (hours && parseInt(hours) > 23) hours = '23';
  if (minutes && parseInt(minutes) > 59) minutes = '59';

  const typingForward = raw.length > previous.length;
  if (hasColon || minutes || (typingForward && hours.length === 2)) return `${hours}:${minutes}`;
  return hours;
}
