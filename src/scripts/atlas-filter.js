const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

// Cards on their way out are pulled out of flow and left where they were, so
// the survivors can start closing the gap in the same frame that the leavers
// start fading. Cleanup is kept here so a card that comes straight back can
// cancel its own exit mid-flight.
const exiting = new Map();

function cancelExit(card) {
  const pending = exiting.get(card);
  if (!pending) return;
  pending.animation.cancel();
  pending.restore();
  exiting.delete(card);
}

function matches(card, query, filters) {
  const q = query.trim().toLowerCase();
  if (q && !(card.dataset.search || '').includes(q)) return false;
  if (filters.country && card.dataset.country !== filters.country) return false;
  if (filters.category && card.dataset.category !== filters.category) return false;
  if (filters.roast && card.dataset.roast !== filters.roast) return false;
  if (filters.region && !(card.dataset.region || '').split(',').includes(filters.region)) return false;
  if (filters.ox) {
    const ox = Number(card.dataset.oxidation);
    if (filters.ox === 'low' && ox > 20) return false;
    if (filters.ox === 'mid' && (ox <= 20 || ox > 70)) return false;
    if (filters.ox === 'high' && ox <= 70) return false;
  }
  return true;
}

function applyInstantly(cards, keep) {
  for (const card of cards) {
    cancelExit(card);
    card.hidden = !keep.has(card);
  }
}

function applyWithMotion(grid, cards, keep) {
  const before = new Map();
  for (const card of cards) {
    if (!card.hidden && !exiting.has(card)) before.set(card, card.getBoundingClientRect());
  }

  const gridBox = grid.getBoundingClientRect();
  const entering = [];

  for (const card of cards) {
    const wanted = keep.has(card);
    if (wanted) {
      cancelExit(card);
      if (card.hidden) {
        card.hidden = false;
        entering.push(card);
      }
      continue;
    }
    if (card.hidden || exiting.has(card)) continue;

    const box = before.get(card);
    before.delete(card);
    const restore = () => {
      card.style.position = '';
      card.style.left = '';
      card.style.top = '';
      card.style.width = '';
      card.style.height = '';
      card.style.pointerEvents = '';
      card.style.zIndex = '';
    };
    card.style.position = 'absolute';
    card.style.left = `${box.left - gridBox.left}px`;
    card.style.top = `${box.top - gridBox.top}px`;
    card.style.width = `${box.width}px`;
    card.style.height = `${box.height}px`;
    card.style.pointerEvents = 'none';
    card.style.zIndex = '0';

    const animation = card.animate(
      [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(0.94)' },
      ],
      { duration: 220, easing: EASE, fill: 'forwards' },
    );
    exiting.set(card, { animation, restore });
    animation.finished
      .then(() => {
        if (exiting.get(card)?.animation !== animation) return;
        exiting.delete(card);
        restore();
        card.hidden = true;
      })
      .catch(() => {});
  }

  // Survivors slide from where they were to where the new layout put them.
  for (const [card, box] of before) {
    const next = card.getBoundingClientRect();
    const dx = box.left - next.left;
    const dy = box.top - next.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    card.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
      duration: 420,
      easing: EASE,
    });
  }

  for (const card of entering) {
    card.animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], {
      duration: 320,
      easing: EASE,
    });
  }
}

const form = document.querySelector('[data-atlas-filters]');
const grid = document.querySelector('[data-atlas-grid]');
const cards = [...document.querySelectorAll('[data-tea-card]')];
const count = document.querySelector('[data-count]');
const empty = document.querySelector('[data-empty]');

if (form && grid && cards.length) {
  const params = new URLSearchParams(window.location.search);
  for (const key of ['q', 'country', 'category', 'roast', 'ox', 'region']) {
    const value = params.get(key);
    const field = form.elements.namedItem(key);
    if (value && field && 'value' in field) field.value = value;
  }

  let first = true;

  const run = () => {
    const data = new FormData(form);
    const filters = {
      country: String(data.get('country') || ''),
      category: String(data.get('category') || ''),
      roast: String(data.get('roast') || ''),
      ox: String(data.get('ox') || ''),
      region: String(data.get('region') || ''),
    };
    const query = String(data.get('q') || '');
    const keep = new Set(cards.filter((card) => matches(card, query, filters)));

    if (first || reduce.matches) {
      applyInstantly(cards, keep);
      first = false;
    } else {
      applyWithMotion(grid, cards, keep);
    }

    if (count) count.textContent = `${keep.size} tea${keep.size === 1 ? '' : 's'}`;
    if (empty) empty.hidden = keep.size !== 0;
  };

  form.addEventListener('input', run);
  form.addEventListener('change', run);
  form.addEventListener('reset', () => requestAnimationFrame(run));
  run();
}
