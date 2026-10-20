import React, { useMemo } from 'react';
import { Info, AlertTriangle } from 'lucide-react';
import { parseKBMarkup, parseKBInline, type KBListItem } from './kbMarkup';

const Inline: React.FC<{ text: string }> = ({ text }) => (
  <>
    {parseKBInline(text).map((part, i) =>
      part.kind === 'bold' ? (
        <strong key={i} className="font-semibold text-gray-900">{part.text}</strong>
      ) : part.kind === 'code' ? (
        <code key={i} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 font-mono text-[0.85em]">{part.text}</code>
      ) : (
        <React.Fragment key={i}>{part.text}</React.Fragment>
      )
    )}
  </>
);

const SubItems: React.FC<{ items: string[] }> = ({ items }) =>
  items.length ? (
    <ul className="mt-1.5 space-y-1 list-[circle] pl-5 marker:text-gray-400">
      {items.map((child, i) => (
        <li key={i}><Inline text={child} /></li>
      ))}
    </ul>
  ) : null;

const Steps: React.FC<{ items: KBListItem[] }> = ({ items }) => (
  <ol className="space-y-2.5">
    {items.map((item, i) => (
      <li key={i} className="flex gap-3">
        <span className="flex-shrink-0 mt-0.5 h-6 w-6 rounded-full bg-haccare-teal text-white text-xs font-semibold flex items-center justify-center">
          {i + 1}
        </span>
        <div className="flex-1 pt-0.5">
          <Inline text={item.text} />
          <SubItems items={item.children} />
        </div>
      </li>
    ))}
  </ol>
);

/** Renders a KB article's markup (see kbMarkup.ts) as styled React elements. */
export const KBArticleContent: React.FC<{ content: string }> = ({ content }) => {
  const blocks = useMemo(() => parseKBMarkup(content), [content]);

  return (
    <div className="space-y-4 text-[15px] leading-7 text-gray-700">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return (
              <h3 key={i} className="pt-3 text-base font-semibold text-gray-900 border-b border-gray-100 pb-1.5">
                <Inline text={block.text} />
              </h3>
            );
          case 'paragraph':
            return <p key={i}><Inline text={block.text} /></p>;
          case 'bullets':
            return (
              <ul key={i} className="space-y-1.5 list-disc pl-5 marker:text-haccare-teal">
                {block.items.map((item, j) => (
                  <li key={j} className="pl-1">
                    <Inline text={item.text} />
                    <SubItems items={item.children} />
                  </li>
                ))}
              </ul>
            );
          case 'steps':
            return <Steps key={i} items={block.items} />;
          case 'callout': {
            const important = block.tone === 'important';
            const Icon = important ? AlertTriangle : Info;
            return (
              <div
                key={i}
                className={`flex gap-3 rounded-lg border px-4 py-3 text-sm leading-6 ${
                  important ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${important ? 'text-amber-600' : 'text-blue-600'}`} />
                <p><Inline text={block.text} /></p>
              </div>
            );
          }
          case 'table':
            return (
              <div key={i} className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      {block.header.map((cell, j) => (
                        <th key={j} className="px-3 py-2 font-semibold"><Inline text={cell} /></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {block.rows.map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) => (
                          <td key={k} className="px-3 py-2 align-top"><Inline text={cell} /></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
};

export default KBArticleContent;
