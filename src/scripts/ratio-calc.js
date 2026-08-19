function initCalc(root) {
  const ratio = Number(root.dataset.ratio || 20);
  const volume = root.querySelector('[data-volume]');
  const grams = root.querySelector('[data-grams]');
  const out = root.querySelector('[data-out]');

  const update = () => {
    const ml = Number(volume?.value);
    const gIn = Number(grams?.value);
    if (Number.isFinite(ml) && ml > 0) {
      const g = ml / ratio;
      if (grams && document.activeElement !== grams) grams.value = g.toFixed(1);
      if (out) out.textContent = `${g.toFixed(1)} g leaf for ${ml} ml at 1:${ratio}`;
    } else if (Number.isFinite(gIn) && gIn > 0) {
      const mlOut = gIn * ratio;
      if (volume && document.activeElement !== volume) volume.value = String(Math.round(mlOut));
      if (out) out.textContent = `${Math.round(mlOut)} ml water for ${gIn} g at 1:${ratio}`;
    }
  };

  volume?.addEventListener('input', update);
  grams?.addEventListener('input', () => {
    const gIn = Number(grams.value);
    if (!Number.isFinite(gIn) || gIn <= 0) return;
    const mlOut = gIn * ratio;
    if (volume) volume.value = String(Math.round(mlOut));
    if (out) out.textContent = `${Math.round(mlOut)} ml water for ${gIn} g at 1:${ratio}`;
  });
  update();
}

document.querySelectorAll('[data-ratio-calc]').forEach(initCalc);
