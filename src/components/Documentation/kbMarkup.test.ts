import { describe, it, expect } from 'vitest';
import { parseKBMarkup, parseKBInline, stripKBMarkup } from './kbMarkup';
import { KB_CATEGORIES } from './kbData';

describe('parseKBMarkup', () => {
  it('parses headings, paragraphs, lists, callouts and tables', () => {
    const blocks = parseKBMarkup(
      [
        'Intro line one',
        'continues here.',
        '',
        '## Steps',
        '1. First',
        '2. Second',
        '  - detail',
        '- Bullet',
        '> A tip',
        '> over two lines',
        '>! Careful',
        '| Glucose | Dose |',
        '|---|---|',
        '| 8.1 – 10.0 | 2 units |',
      ].join('\n')
    );

    expect(blocks).toEqual([
      { type: 'paragraph', text: 'Intro line one continues here.' },
      { type: 'heading', text: 'Steps' },
      { type: 'steps', items: [{ text: 'First', children: [] }, { text: 'Second', children: ['detail'] }] },
      { type: 'bullets', items: [{ text: 'Bullet', children: [] }] },
      { type: 'callout', tone: 'note', text: 'A tip over two lines' },
      { type: 'callout', tone: 'important', text: 'Careful' },
      { type: 'table', header: ['Glucose', 'Dose'], rows: [['8.1 – 10.0', '2 units']] },
    ]);
  });
});

describe('parseKBInline', () => {
  it('splits bold and code spans', () => {
    expect(parseKBInline('Click **Save** to print `PT12345`.')).toEqual([
      { kind: 'text', text: 'Click ' },
      { kind: 'bold', text: 'Save' },
      { kind: 'text', text: ' to print ' },
      { kind: 'code', text: 'PT12345' },
      { kind: 'text', text: '.' },
    ]);
  });
});

describe('stripKBMarkup', () => {
  it('removes markup so search matches plain words', () => {
    expect(stripKBMarkup('## Title\n- **Bold** item')).toContain('Bold  item');
  });
});

describe('KB_CATEGORIES', () => {
  it('has unique category ids and unique article ids', () => {
    const categoryIds = KB_CATEGORIES.map((c) => c.id);
    expect(new Set(categoryIds).size).toBe(categoryIds.length);
    const articleIds = KB_CATEGORIES.flatMap((c) => c.articles.map((a) => a.id));
    expect(new Set(articleIds).size).toBe(articleIds.length);
  });

  it('has no empty articles or stray unparsed markup', () => {
    for (const article of KB_CATEGORIES.flatMap((c) => c.articles)) {
      const blocks = parseKBMarkup(article.content);
      expect(blocks.length, article.id).toBeGreaterThan(0);
      for (const block of blocks) {
        if (block.type === 'paragraph') expect(block.text, article.id).not.toMatch(/^(#|•)/);
      }
    }
  });
});
