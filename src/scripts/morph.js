/**
 * Cross-document view transitions are declared in CSS, but a name has to be
 * unique per document — so the atlas grid cannot mark all forty-five swatches
 * as the morph target up front. Instead the clicked card is tagged a moment
 * before the navigation snapshot is taken, and untagged when the page is
 * restored from history.
 */
const NAME = 'active-tea';
let tagged = null;

const clear = () => {
  if (tagged) tagged.style.viewTransitionName = '';
  tagged = null;
};

const supported = 'startViewTransition' in document;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

if (supported) {
  document.addEventListener(
    'click',
    (event) => {
      if (reduce.matches) return;
      const target = event.target;
      const link = target instanceof Element ? target.closest('a[data-tea-card]') : null;
      clear();
      if (!link) return;
      const swatch = link.querySelector('[data-morph]');
      if (!swatch) return;
      swatch.style.viewTransitionName = NAME;
      tagged = swatch;
    },
    { capture: true },
  );

  window.addEventListener('pageshow', clear);
  window.addEventListener('pagehide', clear);
}
