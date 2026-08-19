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
  const live = root.querySelector('[data-live]');
  const pips = [...root.querySelectorAll('[data-pips] li')];
  const startBtn = root.querySelector('[data-start]');
  const pauseBtn = root.querySelector('[data-pause]');
  const nextBtn = root.querySelector('[data-next]');
  const resetBtn = root.querySelector('[data-reset]');

  let index = 0;
  let remaining = infusions[0].seconds;
  let running = false;
  let last = 0;
  let raf = 0;
  let announced = '';

  const render = () => {
    const step = infusions[index];
    const elapsed = step.seconds > 0 ? 1 - remaining / step.seconds : 1;

    // One property drives the ring, the current pip, and the flare radius.
    root.style.setProperty('--progress', String(Math.min(1, Math.max(0, elapsed))));
    root.classList.toggle('is-running', running);

    if (display) display.textContent = format(remaining);
    if (meta) meta.textContent = `Infusion ${step.n} of ${infusions.length} · ${step.seconds}s target`;
    if (notes) notes.textContent = step.notes || 'No extra note for this steep.';

    pips.forEach((pip, i) => {
      pip.classList.toggle('done', i < index);
      pip.classList.toggle('current', i === index);
    });

    if (startBtn) startBtn.disabled = running;
    if (pauseBtn) pauseBtn.disabled = !running;

    // The display itself updates every frame, which is far too chatty for a
    // live region, so only the change of steep is announced.
    const label = `Infusion ${step.n} of ${infusions.length}`;
    if (live && label !== announced) {
      announced = label;
      live.textContent = label;
    }
  };

  const flare = () => {
    root.classList.remove('is-chime');
    // Reading the box forces the class removal to take effect before it is
    // added back, so consecutive steeps each get their own flare.
    void root.offsetWidth;
    root.classList.add('is-chime');
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
      flare();
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

  root.addEventListener('animationend', (event) => {
    if (event.animationName === 'flare') root.classList.remove('is-chime');
  });

  render();
}

document.querySelectorAll('[data-brew-timer]').forEach(initTimer);
