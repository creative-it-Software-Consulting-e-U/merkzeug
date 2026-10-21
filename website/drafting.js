// Scroll-linked use-case animations, a sibling of the apps.creative-it.com engine
// without pinned stages: each figure plays while it travels through the
// viewport, and the page keeps scrolling normally.
//   [data-r="a,b"] → CSS var --t, eased progress of the figure within [a, b]
//   [data-on="x"]  → .is-on once the figure's progress reaches x
(() => {
  const root = document.querySelector('main.draft');
  if (!root) return;
  document.documentElement.classList.remove('no-js');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (v, a, b) => clamp((v - a) / (b - a));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Comparison rows are generated from COMPARISON.md; stagger them here.
  const rows = [...root.querySelectorAll('.versus tbody tr')];
  rows.forEach((row, i) => { row.dataset.r = `${(i * 0.07).toFixed(2)},${(i * 0.07 + 0.2).toFixed(2)}`; });

  const figs = [...root.querySelectorAll('[data-fig]')].map((fig) => ({
    fig,
    ranged: [fig, ...fig.querySelectorAll('[data-r]')].filter((el) => el.dataset.r).map((el) => {
      const [a, b] = el.dataset.r.split(',').map(Number);
      return { el, a, b, last: -1 };
    }),
    steps: [...fig.querySelectorAll('[data-on]')].map((el) => ({ el, at: Number(el.dataset.on) })),
    p: -1,
  }));

  const sheets = [...root.querySelectorAll('[data-sheet]')];
  const rail = [...document.querySelectorAll('[data-rail]')];
  const bar = document.querySelector('[data-progress]');
  let active = -1;
  let queued = false;

  function update() {
    queued = false;
    const vh = window.innerHeight;
    for (const f of figs) {
      const r = f.fig.getBoundingClientRect();
      // Starts as the figure enters the lower edge, completes when it sits in the upper third.
      const p = still.matches ? 1 : clamp((vh * 0.92 - r.top) / (vh * 0.62));
      if (p === f.p) continue;
      f.p = p;
      for (const rg of f.ranged) {
        const v = easeOut(range(p, rg.a, rg.b));
        if (Math.abs(v - rg.last) < 0.0005) continue;
        rg.last = v;
        rg.el.style.setProperty('--t', v.toFixed(4));
      }
      for (const s of f.steps) s.el.classList.toggle('is-on', p >= s.at);
    }
    let sheet = 0;
    sheets.forEach((s, i) => { if (s.getBoundingClientRect().top <= vh * 0.5) sheet = i; });
    if (sheet !== active) {
      active = sheet;
      rail.forEach((a, i) => {
        a.classList.toggle('is-active', i === sheet);
        a.classList.toggle('is-done', i < sheet);
      });
    }
    const max = document.documentElement.scrollHeight - vh;
    if (bar) bar.style.transform = `scaleX(${clamp(window.scrollY / Math.max(1, max)).toFixed(4)})`;
  }

  root.classList.add('is-live');
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', () => { figs.forEach((f) => { f.p = -1; }); request(); });
  still.addEventListener('change', () => { figs.forEach((f) => { f.p = -1; }); request(); });
  update();
})();

// Lightbox for the real screenshots; links still open the image without JavaScript.
(() => {
  const shots = [...document.querySelectorAll('[data-shot]')];
  if (!shots.length || typeof HTMLDialogElement !== 'function') return;
  const de = document.documentElement.lang === 'de';
  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.innerHTML = `<img alt=""><div class="lightbox-bar"><span></span><span><button type="button" data-prev aria-label="${de ? 'Vorheriges Bild' : 'Previous image'}">←</button> <button type="button" data-next aria-label="${de ? 'Nächstes Bild' : 'Next image'}">→</button> <button type="button" data-close>${de ? 'Schließen' : 'Close'}</button></span></div>`;
  document.body.append(dialog);
  const img = dialog.querySelector('img');
  const caption = dialog.querySelector('.lightbox-bar span');
  let group = [];
  let index = 0;
  const show = (i) => {
    index = (i + group.length) % group.length;
    const link = group[index];
    img.src = link.href;
    img.alt = link.dataset.caption;
    caption.textContent = link.dataset.caption;
    dialog.querySelectorAll('[data-prev],[data-next]').forEach((b) => { b.hidden = group.length < 2; });
  };
  for (const link of shots) link.addEventListener('click', (event) => {
    event.preventDefault();
    group = [...link.closest('.captures').querySelectorAll('[data-shot]')];
    show(group.indexOf(link));
    dialog.showModal();
  });
  dialog.querySelector('[data-prev]').addEventListener('click', () => show(index - 1));
  dialog.querySelector('[data-next]').addEventListener('click', () => show(index + 1));
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(index - 1);
    if (event.key === 'ArrowRight') show(index + 1);
  });
})();
