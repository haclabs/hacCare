/**
 * Students share a simulation login and type their name on every form, so the
 * debrief groups work by name. These helpers make "J. Smith", "J.Smith",
 * "j smith " and "José"/"Jose" count as one student. Digits still matter, so
 * "Student 1" and "Student 2" stay separate. Typos are not merged.
 */

const tidy = (name: string): string => name.trim().replace(/\s+/g, ' ');

/** Grouping key: lowercase letters and digits only, accents removed. */
export function studentNameKey(name: string): string {
  const key = name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  return key || tidy(name).toLowerCase();
}

/**
 * Collects the spellings seen for each student and picks the one to display:
 * the most used, and on a tie the one with capitals and a space.
 */
export class StudentNameVariants {
  private variants = new Map<string, Map<string, number>>();

  add(name: string, weight = 1): string {
    const key = studentNameKey(name);
    const counts = this.variants.get(key) ?? new Map<string, number>();
    const spelling = tidy(name);
    counts.set(spelling, (counts.get(spelling) ?? 0) + weight);
    this.variants.set(key, counts);
    return key;
  }

  displayName(key: string): string {
    const score = (s: string) => (/\p{Lu}/u.test(s) ? 2 : 0) + (s.includes(' ') ? 1 : 0);
    return [...(this.variants.get(key) ?? new Map<string, number>()).entries()]
      .sort(([a, ca], [b, cb]) => cb - ca || score(b) - score(a) || a.localeCompare(b))[0]?.[0] ?? key;
  }
}
