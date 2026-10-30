import { catalogDisplayName, type CatalogEntry } from '../../../services/clinical/medicationService';

export const CATALOG_SUPPORT_EMAIL = 'support@haccare.app';

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Catalog entries matching a typed medication name, best first. Every word of the name must appear
 * in the entry's name, brand or strength; tokens containing digits ("5mg") are ignored because
 * people write strengths too many ways to match reliably.
 */
export function findCatalogSuggestions(typed: string, catalog: CatalogEntry[], limit = 5): CatalogEntry[] {
  const query = normalize(typed);
  const words = query.split(' ').filter((w) => w.length >= 2 && !/\d/.test(w));
  if (words.join('').length < 3) return [];

  const firstWord = words[0];
  return catalog
    .flatMap((entry) => {
      const haystack = normalize(`${entry.name} ${entry.brand_name ?? ''} ${entry.strength}`);
      if (!words.every((w) => haystack.includes(w))) return [];
      const name = normalize(entry.name);
      const score = name.startsWith(firstWord) ? 0 : normalize(entry.brand_name ?? '').startsWith(firstWord) ? 1 : 2;
      return [{ entry, score }];
    })
    .sort((a, b) => a.score - b.score || catalogDisplayName(a.entry).localeCompare(catalogDisplayName(b.entry)))
    .slice(0, limit)
    .map((s) => s.entry);
}
