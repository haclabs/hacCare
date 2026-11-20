import React from 'react';
import { QR_CODES, type QrName } from './qrData';

/** Draws one of the pre-generated QR codes as a single SVG path. */
export const QrCode: React.FC<{ name: QrName; className?: string; title?: string }> = ({ name, className, title }) => {
  const rows = QR_CODES[name];
  const size = rows.length;
  let d = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < size; x++) {
      if (row[x] !== '1') continue;
      let run = 1;
      while (x + run < size && row[x + run] === '1') run++;
      d += `M${x} ${y}h${run}v1h-${run}z`;
      x += run - 1;
    }
  });
  return (
    <svg
      className={className}
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect x="-2" y="-2" width={size + 4} height={size + 4} fill="#fff" />
      <path d={d} fill="currentColor" />
    </svg>
  );
};
