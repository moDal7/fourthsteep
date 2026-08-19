function chime() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(784, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(523, ctx.currentTime + 0.35);
  gain.gain.setValueAtTime(0.07, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.9);
}

function format(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function initTimer(root) {
  const jsonEl = root.querySelector('script[type="application/json"]');
  if (!jsonEl) return;
  const infusions = JSON.parse(jsonEl.textContent || '[]');
  if (!infusions.length) return;

  const display = root.querySelector('[data-display]');
  const meta = root.querySelector('[data-meta]');
  const notes = root.querySelector('[data-notes]');
  const startBtn = root.querySelector('[data-start]');
  const pauseBtn = root.querySelector('[data-pause]');
  const nextBtn = root.querySelector('[data-next]');
  const resetBtn = root.querySelector('[data-reset]');

  let index = 0;
  let remaining = infusions[0].seconds;
  let running = false;
  let last = 0;
  let raf = 0;

  const render = () => {
    const step = infusions[index];
    if (display) display.textContent = format(remaining);
    if (meta) {
      meta.textContent = `Infusion ${step.n} of ${infusions.length} · ${step.seconds}s target`;
    }
    if (notes) notes.textContent = step.notes || 'No extra note for this steep.';
    if (startBtn) startBtn.disabled = running;
    if (pauseBtn) pauseBtn.disabled = !running;
  };

  const tick = (now) => {
    if (!running) return;
    const delta = (now - last) / 1000;
    last = now;
    remaining -= delta;
    if (remaining <= 0) {
      remaining = 0;
      running = false;
      chime();
      render();
      if (index < infusions.length - 1) {
        index += 1;
        remaining = infusions[index].seconds;
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
      return;
    }
    render();
    raf = requestAnimationFrame(tick);
  };

  startBtn?.addEventListener('click', () => {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
    render();
  });

  pauseBtn?.addEventListener('click', () => {
    running = false;
    cancelAnimationFrame(raf);
    render();
  });

  nextBtn?.addEventListener('click', () => {
    if (index >= infusions.length - 1) return;
    index += 1;
    remaining = infusions[index].seconds;
    last = performance.now();
    render();
  });

  resetBtn?.addEventListener('click', () => {
    running = false;
    cancelAnimationFrame(raf);
    index = 0;
    remaining = infusions[0].seconds;
    render();
  });

  render();
}

document.querySelectorAll('[data-brew-timer]').forEach(initTimer);
