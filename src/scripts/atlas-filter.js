function apply(cards, query, filters) {
  const q = query.trim().toLowerCase();
  let shown = 0;
  for (const card of cards) {
    const hay = card.dataset.search || '';
    const okQuery = !q || hay.includes(q);
    const okCountry = !filters.country || card.dataset.country === filters.country;
    const okCategory = !filters.category || card.dataset.category === filters.category;
    const okRoast = !filters.roast || card.dataset.roast === filters.roast;
    const ox = Number(card.dataset.oxidation);
    const okOx =
      !filters.ox ||
      (filters.ox === 'low' && ox <= 20) ||
      (filters.ox === 'mid' && ox > 20 && ox <= 70) ||
      (filters.ox === 'high' && ox > 70);
    const okRegion = !filters.region || card.dataset.region === filters.region;
    const visible = okQuery && okCountry && okCategory && okRoast && okOx && okRegion;
    card.hidden = !visible;
    if (visible) shown += 1;
  }
  return shown;
}

const form = document.querySelector('[data-atlas-filters]');
const cards = [...document.querySelectorAll('[data-tea-card]')];
const count = document.querySelector('[data-count]');
const empty = document.querySelector('[data-empty]');

if (form && cards.length) {
  const params = new URLSearchParams(window.location.search);
  for (const key of ['q', 'country', 'category', 'roast', 'ox', 'region']) {
    const value = params.get(key);
    const field = form.elements.namedItem(key);
    if (value && field && 'value' in field) field.value = value;
  }

  const run = () => {
    const data = new FormData(form);
    const shown = apply(cards, String(data.get('q') || ''), {
      country: String(data.get('country') || ''),
      category: String(data.get('category') || ''),
      roast: String(data.get('roast') || ''),
      ox: String(data.get('ox') || ''),
      region: String(data.get('region') || ''),
    });
    if (count) count.textContent = `${shown} tea${shown === 1 ? '' : 's'}`;
    if (empty) empty.hidden = shown !== 0;
  };
  form.addEventListener('input', run);
  form.addEventListener('change', run);
  form.addEventListener('reset', () => {
    requestAnimationFrame(run);
  });
  run();
}
