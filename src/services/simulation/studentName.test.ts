import { describe, expect, it } from 'vitest';
import { StudentNameVariants, studentNameKey } from './studentName';

describe('studentNameKey', () => {
  it('ignores case, spacing, punctuation and accents', () => {
    const key = studentNameKey('J. Smith');
    for (const variant of ['J.Smith', 'j smith ', 'J  Smith', 'J Smith.', 'J-Smith', 'jsmith']) {
      expect(studentNameKey(variant)).toBe(key);
    }
    expect(studentNameKey('José')).toBe(studentNameKey('jose'));
  });

  it('keeps numbers and different names apart', () => {
    expect(studentNameKey('Student 1')).not.toBe(studentNameKey('Student 2'));
    expect(studentNameKey('Sam Lee')).not.toBe(studentNameKey('Pam Lee'));
  });

  it('does not lump names without letters or digits together', () => {
    expect(studentNameKey('?')).not.toBe(studentNameKey('!'));
  });
});

describe('StudentNameVariants', () => {
  it('displays the most used spelling', () => {
    const names = new StudentNameVariants();
    const key = names.add('sam lee');
    names.add('Sam Lee');
    names.add('Sam Lee');
    expect(names.displayName(key)).toBe('Sam Lee');
  });

  it('breaks ties toward capitals and a space', () => {
    const names = new StudentNameVariants();
    const key = names.add('samlee');
    names.add('Sam  Lee ');
    expect(names.displayName(key)).toBe('Sam Lee');
  });
});
