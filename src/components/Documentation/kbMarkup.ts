/**
 * Minimal markup for Knowledge Base articles. Parsed to blocks and rendered as React elements
 * (never HTML), so article text cannot inject markup.
 *
 *   ## Heading
 *   - bullet            (indent two spaces for a sub-bullet)
 *   1. numbered step
 *   > tip / note        (one or more lines → blue callout)
 *   >! important        (amber callout)
 *   | a | b |           (table; first row is the header, |---| rows are ignored)
 *   **bold**  `code`    (inline, anywhere)
 * Anything else is a paragraph; a blank line ends it.
 */

export interface KBListItem {
  text: string;
  children: string[];
}

export type KBBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: KBListItem[] }
  | { type: 'steps'; items: KBListItem[] }
  | { type: 'callout'; tone: 'note' | 'important'; text: string }
  | { type: 'table'; header: string[]; rows: string[][] };

export type KBInline = { kind: 'text' | 'bold' | 'code'; text: string };

const BULLET = /^- (.*)$/;
const SUB_BULLET = /^ {2,}- (.*)$/;
const STEP = /^\d+\. (.*)$/;
const TABLE_ROW = /^\|.*\|$/;
const TABLE_DIVIDER = /^\|[\s:|-]+\|$/;

const splitRow = (line: string) => line.slice(1, -1).split('|').map((cell) => cell.trim());

export function parseKBMarkup(source: string): KBBlock[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: KBBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'heading', text: trimmed.slice(3).trim() });
      i++;
      continue;
    }

    if (trimmed.startsWith('>')) {
      const important = trimmed.startsWith('>!');
      const parts: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>') && lines[i].trim().startsWith('>!') === important) {
        parts.push(lines[i].trim().replace(/^>!?\s?/, ''));
        i++;
      }
      blocks.push({ type: 'callout', tone: important ? 'important' : 'note', text: parts.join(' ') });
      continue;
    }

    if (TABLE_ROW.test(trimmed)) {
      const rows: string[][] = [];
      while (i < lines.length && TABLE_ROW.test(lines[i].trim())) {
        if (!TABLE_DIVIDER.test(lines[i].trim())) rows.push(splitRow(lines[i].trim()));
        i++;
      }
      const [header = [], ...body] = rows;
      blocks.push({ type: 'table', header, rows: body });
      continue;
    }

    const listPattern = BULLET.test(line) ? BULLET : STEP.test(line) ? STEP : null;
    if (listPattern) {
      const items: KBListItem[] = [];
      while (i < lines.length) {
        const top = lines[i].match(listPattern);
        const sub = lines[i].match(SUB_BULLET);
        if (top) items.push({ text: top[1].trim(), children: [] });
        else if (sub && items.length) items[items.length - 1].children.push(sub[1].trim());
        else break;
        i++;
      }
      blocks.push({ type: listPattern === BULLET ? 'bullets' : 'steps', items });
      continue;
    }

    const parts: string[] = [];
    while (i < lines.length) {
      const next = lines[i];
      const t = next.trim();
      if (!t || t.startsWith('## ') || t.startsWith('>') || TABLE_ROW.test(t) || BULLET.test(next) || STEP.test(next)) break;
      parts.push(t);
      i++;
    }
    blocks.push({ type: 'paragraph', text: parts.join(' ') });
  }

  return blocks;
}

export function parseKBInline(text: string): KBInline[] {
  const out: KBInline[] = [];
  const pattern = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) out.push({ kind: 'text', text: text.slice(last, start) });
    out.push(match[1] !== undefined ? { kind: 'bold', text: match[1] } : { kind: 'code', text: match[2] });
    last = start + match[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

/** Article text with markup removed, for search matching. */
export function stripKBMarkup(source: string): string {
  return source.replace(/^\s*(##|>!?|-|\d+\.)\s?/gm, '').replace(/\*\*|`|\|/g, ' ');
}
