import { useEffect, useRef } from 'react';

/**
 * Adds the `js` class to a .site root and reveals [data-reveal],
 * .site-shutter and .site-wipe elements once as they scroll into view.
 * Pass a key (e.g. the page path) to re-run when the content changes.
 * Content is only hidden after this runs, so the prerendered HTML (and a
 * page with scripts blocked) always shows everything.
 */
export function useSiteMotion<T extends HTMLElement>(key?: string) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const targets = [...root.querySelectorAll<HTMLElement>('[data-reveal], .site-shutter, .site-wipe')];

    // A fully clipped element (the start of a clip-path reveal) never counts
    // as intersecting in Chrome, so clip reveals are watched through their
    // parent and the class is applied to the element itself.
    const watched = new Map<Element, HTMLElement>();
    for (const t of targets) {
      const parent = t.parentElement;
      watched.set(parent && t.matches('.site-shutter, .site-wipe') ? parent : t, t);
    }

    root.classList.add('js');
    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            watched.get(entry.target)?.classList.add('is-in');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    watched.forEach((_, el) => io.observe(el));
    return () => io.disconnect();
  }, [key]);

  return ref;
}
