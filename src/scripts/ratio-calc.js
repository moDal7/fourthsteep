function initCalc(root) {
  const volume = root.querySelector('[data-volume]');
  const grams = root.querySelector('[data-grams]');
  const out = root.querySelector('[data-out]');
  const caption = root.querySelector('[data-caption]');
  let ratio = Number(root.dataset.ratio || 20);

  const setRatio = (next, { grams: g, ml } = {}) => {
    ratio = next;
    root.dataset.ratio = String(ratio);
    if (volume && ml) volume.value = String(ml);
    if (grams && g) grams.value = String(g);
    update();
  };

  const update = () => {
    const ml = Number(volume?.value);
    const gIn = Number(grams?.value);
    if (Number.isFinite(ml) && ml > 0 && document.activeElement !== grams) {
      const g = ml / ratio;
      if (grams) grams.value = g.toFixed(1);
      if (out) out.textContent = `${g.toFixed(1)} g leaf for ${ml} ml at 1:${Number(ratio.toFixed(1))}`;
    } else if (Number.isFinite(gIn) && gIn > 0) {
      const mlOut = gIn * ratio;
      if (volume && document.activeElement !== volume) volume.value = String(Math.round(mlOut));
      if (out) out.textContent = `${Math.round(mlOut)} ml water for ${gIn} g at 1:${Number(ratio.toFixed(1))}`;
    }
  };

  volume?.addEventListener('input', update);
  grams?.addEventListener('input', () => {
    const gIn = Number(grams.value);
    if (!Number.isFinite(gIn) || gIn <= 0) return;
    const mlOut = gIn * ratio;
    if (volume) volume.value = String(Math.round(mlOut));
    if (out) out.textContent = `${Math.round(mlOut)} ml water for ${gIn} g at 1:${Number(ratio.toFixed(1))}`;
  });

  root.querySelectorAll('[data-variant]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const g = Number(btn.getAttribute('data-grams'));
      const ml = Number(btn.getAttribute('data-ml'));
      if (!Number.isFinite(g) || !Number.isFinite(ml) || g <= 0) return;
      root.querySelectorAll('[data-variant]').forEach((el) => el.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      if (caption) {
        caption.textContent = `Seeded from ${btn.textContent.trim()} — ${g} g / ${ml} ml.`;
      }
      setRatio(ml / g, { grams: g, ml });
    });
  });

  update();
}

document.querySelectorAll('[data-ratio-calc]').forEach(initCalc);
