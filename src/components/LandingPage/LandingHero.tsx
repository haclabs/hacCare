import React, { useEffect, useRef, useState } from 'react';
import { BcmaDemo } from './BcmaDemo';

const VIMEO_SRC =
  'https://player.vimeo.com/video/1162063037?badge=0&autopause=0&autoplay=1&title=0&byline=0&portrait=0&color=14776a';

/** Barcode printed on the wristband stage. Decorative. */
const BAND_BARS = [0, 4, 6, 11, 13, 17, 22, 24, 28, 33, 35, 40, 43, 45, 50, 54, 56, 61, 64, 66, 71, 75, 77, 82];

/**
 * Hero: headline on the ground, and the wristband as a giant teal stage
 * bleeding off the right and bottom edges, carrying the live medication pass.
 */
export const LandingHero: React.FC = () => {
  const [videoOpen, setVideoOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (videoOpen && !d.open) d.showModal();
    if (!videoOpen && d.open) d.close();
  }, [videoOpen]);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="site-wrap hero__text">
        <h1 id="hero-title" className="site-display hero__title">
          The EMR nursing <br className="hero__br" />students learn on
        </h1>
        <p className="hero__sentence">
          Students chart, scan wristbands and give medications in a working EMR, right in your simulation lab, with an instructor watching.
        </p>
        <div className="hero__actions">
          <a href="#contact" className="site-btn">Request a demo</a>
          <button type="button" className="site-link hero__video" onClick={() => setVideoOpen(true)}>
            Watch the 2-minute demo
          </button>
        </div>
      </div>

      <div className="hero__stage site-shutter">
        <div className="hero__stage-inner">
          <span className="hero__snap" aria-hidden="true" />
          <svg className="hero__barcode" viewBox="0 0 84 40" aria-hidden="true" preserveAspectRatio="none">
            {BAND_BARS.map((x, i) => (
              <rect key={x} x={x} y="0" width={i % 4 === 0 ? 3 : 1.5} height="40" />
            ))}
          </svg>
          <div className="hero__fragment">
            <BcmaDemo />
          </div>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="hero__dialog"
        aria-label="hacCare platform demo video"
        onClose={() => setVideoOpen(false)}
        onClick={e => { if (e.target === dialogRef.current) setVideoOpen(false); }}
      >
        <div className="hero__dialog-frame">
          {videoOpen && (
            <iframe
              src={VIMEO_SRC}
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
              allowFullScreen
              title="hacCare platform demo"
            />
          )}
        </div>
        <button type="button" className="site-btn site-btn--small hero__dialog-close" onClick={() => setVideoOpen(false)}>
          Close video
        </button>
      </dialog>
    </section>
  );
};
