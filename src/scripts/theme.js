const btn = document.querySelector('[data-theme-toggle]');
const root = document.documentElement;

const isDark = () => {
  const current = root.getAttribute('data-theme');
  if (current === 'dark') return true;
  if (current === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const sync = () => {
  btn?.setAttribute('aria-pressed', String(isDark()));
};

const swap = () => {
  const next = isDark() ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try {
    localStorage.setItem('fourthsteep-theme', next);
  } catch (e) {}
  sync();
};

sync();

btn?.addEventListener('click', () => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && typeof document.startViewTransition === 'function') {
    document.startViewTransition(swap);
  } else {
    swap();
  }
});
