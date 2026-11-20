import React from 'react';

/**
 * Staggered pair: the two real lab photographs in wristband-shaped frames,
 * set in open ground. The page's one deliberate rest.
 */
export const LabGallery: React.FC = () => (
  <section id="labs" className="site-section gallery" aria-labelledby="gallery-title">
    <h2 id="gallery-title" className="site-sr">In real simulation labs</h2>
    <div className="site-wrap gallery__grid">
      <figure className="gallery__a">
        <div className="gallery__frame gallery__frame--tall site-wipe">
          <img
            src="/images/nurse-scanning.webp"
            alt="Student nurse scanning a medication label at a simulated patient bedside"
            width={600}
            height={450}
            loading="lazy"
            className="site-drift"
          />
        </div>
        <figcaption className="site-small">The dual scan, at the bedside. Lethbridge Polytechnic simulation lab.</figcaption>
      </figure>

      <div className="gallery__copy" data-reveal>
        <p className="site-lead">
          Students at Lethbridge Polytechnic use hacCare on real equipment: printed wristbands, barcode scanners and an instructor running the scenario.
        </p>
        <dl className="gallery__stats">
          <div>
            <dt>Active programs</dt>
            <dd>5</dd>
          </div>
          <div>
            <dt>Simulations run</dt>
            <dd>1,000+</dd>
          </div>
        </dl>
      </div>

      <figure className="gallery__b">
        <div className="gallery__frame gallery__frame--wide site-wipe">
          <img
            src="/images/barcode-scanning.webp"
            alt="Student nurse scanning a patient’s wristband before giving a medication"
            width={600}
            height={450}
            loading="lazy"
          />
        </div>
        <figcaption className="site-small">Wristband first, then the medication.</figcaption>
      </figure>
    </div>
  </section>
);
