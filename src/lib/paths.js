/** Join an in-app path to the Astro / GitHub Pages base (e.g. `/fourthsteep/`). */
export function withBase(path = '/') {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  if (!path || path === '/') return `${base}/`;
  return `${base}/${String(path).replace(/^\/+/, '')}`;
}
