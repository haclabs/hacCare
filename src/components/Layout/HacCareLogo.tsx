import React from 'react';

interface HacCareLogoProps {
  /** CSS font-size for the wordmark, e.g. '20px' or 24. Defaults to '20px'. */
  size?: string | number;
  /** Picks the "hac" color for light or dark backgrounds. Defaults to 'light'. */
  variant?: 'light' | 'dark';
  /** Renders a mint accent bar before the wordmark, stretched to its height. */
  withBar?: boolean;
}

const MINT = '#3fbf9a';
const HAC_COLOR: Record<'light' | 'dark', string> = {
  light: '#4a4a46',
  dark: '#d6d4ce',
};

/** hacCare wordmark rendered as live text (Archivo font) — no SVG/image. */
export const HacCareLogo: React.FC<HacCareLogoProps> = ({ size = '20px', variant = 'light', withBar = false }) => {
  const numericSize = typeof size === 'number' ? size : parseFloat(size);
  const letterSpacing = Number.isFinite(numericSize) && numericSize < 14 ? '-0.005em' : '-0.015em';

  const wordmark = (
    <span
      style={{
        fontFamily: "'Archivo', Helvetica, Arial, sans-serif",
        fontWeight: 700,
        letterSpacing,
        lineHeight: 1,
        fontSize: size,
      }}
    >
      <span style={{ color: HAC_COLOR[variant] }}>hac</span>
      <span style={{ color: MINT }}>Care</span>
    </span>
  );

  if (!withBar) return wordmark;

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: '8px' }}>
      <div style={{ width: '3px', background: MINT }} />
      {wordmark}
    </div>
  );
};
