/**
 * Gallery: balanced justified layout + category filter + lightbox.
 *
 * The Archive grid is laid out as justified rows: every image keeps its true aspect ratio (no cropping or
 * distortion), all images in a row share one height, and the rows fill the container width exactly. The set
 * of visible items is partitioned into rows with a linear-partition (so no ragged last row), and the whole
 * layout is recomputed on every filter change and on resize. Without JavaScript the same markup falls back
 * to a CSS flex-wrap justified layout and the images are still visible.
 *
 * Any element with [data-lb] opens the lightbox; navigation stays inside its [data-lb-group].
 */
export function initGallery() {
  const items = [...document.querySelectorAll('.g-item')];
  const chips = [...document.querySelectorAll('.g-chip')];
  const status = document.getElementById('g-status');
  const grid = document.getElementById('g-grid');
  const empty = document.querySelector('[data-empty="archive"]');
  const label = (key) => chips.find((c) => c.dataset.filter === key)?.firstChild.textContent.trim() || key;

  /* ----- Balanced justified layout --------------------------------------- */
  let store; let lastWidth = 0;
  function targetHeight(w) { return w < 480 ? 205 : w < 800 ? 235 : w < 1100 ? 265 : 300; }

  // Break the ordered images into rows so every row lands as close as possible to the target height H0.
  // dp[i] = cheapest layout of the first i images; a row of images j..i-1 costs (ln(h/H0))^2, where h is the
  // height that makes the row exactly fill the container (rows taller than maxH are penalised, not rejected,
  // so very short filtered sets still lay out).
  function bestRows(ars, W, gap, H0, maxH) {
    const n = ars.length;
    const pre = [0]; ars.forEach((a, i) => pre.push(pre[i] + a));
    const rowH = (j, i) => (W - gap * (i - j - 1)) / (pre[i] - pre[j]);
    const dp = Array(n + 1).fill(Infinity); const from = Array(n + 1).fill(0); dp[0] = 0;
    for (let i = 1; i <= n; i++) for (let j = 0; j < i; j++) {
      const h = rowH(j, i);
      const c = dp[j] + Math.log(h / H0) ** 2 + (h > maxH ? 0.5 + Math.log(h / maxH) ** 2 : 0);
      if (c < dp[i]) { dp[i] = c; from[i] = j; }
    }
    const rows = []; let i = n;
    while (i > 0) { rows.unshift([from[i], i]); i = from[i]; }
    return rows;
  }

  function layout() {
    if (!grid) return;
    const W = Math.floor(grid.clientWidth);
    if (!W) return;
    lastWidth = W;
    grid.classList.add('is-justified');
    store ||= grid.appendChild(Object.assign(document.createElement('div'), { hidden: true, className: 'g-store' }));
    items.forEach((el) => store.appendChild(el));
    grid.querySelectorAll('.g-row').forEach((r) => r.remove());

    const vis = items.filter((el) => !el.hidden);
    if (!vis.length) return;
    const gap = W < 640 ? 8 : 14;
    const H0 = targetHeight(W);
    const ars = vis.map((el) => parseFloat(el.dataset.ar) || 1);
    const total = ars.reduce((a, b) => a + b, 0);
    const maxH = H0 * 1.5;
    const parts = bestRows(ars, W, gap, H0, maxH);
    parts.forEach(([from, to]) => {
      const rowItems = vis.slice(from, to);
      const sum = ars.slice(from, to).reduce((x, y) => x + y, 0);
      let h = (W - gap * (rowItems.length - 1)) / sum;
      const capped = h > maxH;
      if (capped) h = maxH;                  // a short filtered set is centred instead of blown up
      const row = document.createElement("div");
      row.className = "g-row" + (capped ? " is-capped" : "");
      row.style.setProperty("--gap", gap + "px");
      rowItems.forEach((el, i) => {
        el.style.width = (ars[from + i] * h).toFixed(2) + "px";
        el.style.setProperty("--h", h.toFixed(2) + "px");
        row.appendChild(el);
      });
      grid.insertBefore(row, store);
    });
  }

  /* ----- Filter ---------------------------------------------------------- */
  function applyFilter(key) {
    let shown = 0;
    items.forEach((el) => { const on = key === 'all' || el.dataset.cat === key; el.hidden = !on; if (on) shown++; });
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === key)));
    if (grid) grid.hidden = shown === 0;
    if (empty) empty.dataset.visible = String(shown === 0);
    layout();
    if (status) status.textContent = key === 'all' ? `Showing all ${shown} images.` : `Showing ${shown} ${shown === 1 ? 'image' : 'images'} in ${label(key)}.`;
    try {
      const url = new URL(location.href);
      key === 'all' ? url.searchParams.delete('cat') : url.searchParams.set('cat', key);
      history.replaceState(null, '', url);
    } catch { /* file:// or sandboxed */ }
  }
  chips.forEach((c) => c.addEventListener('click', () => applyFilter(c.dataset.filter)));
  document.querySelectorAll('[data-filter-reset]').forEach((b) => b.addEventListener('click', () => applyFilter('all')));
  const initial = new URLSearchParams(location.search).get('cat');
  if (grid) {
    applyFilter(initial && chips.some((c) => c.dataset.filter === initial) ? initial : 'all');
    let t; let ro;
    const relayout = () => { clearTimeout(t); t = setTimeout(() => { if (Math.floor(grid.clientWidth) !== lastWidth) layout(); }, 90); };
    if ('ResizeObserver' in window) { ro = new ResizeObserver(relayout); ro.observe(grid); } else window.addEventListener('resize', relayout);
  }

  /* ----- Lightbox -------------------------------------------------------- */
  const box = document.getElementById('lightbox');
  const lbItems = [...document.querySelectorAll('[data-lb]')];
  if (!box || !lbItems.length) return;
  const imgEl = document.getElementById('lb-img');
  const capEl = document.getElementById('lb-cap');
  const countEl = document.getElementById('lb-count');
  const closeBtn = document.getElementById('lb-close');
  const prevBtn = document.getElementById('lb-prev');
  const nextBtn = document.getElementById('lb-next');
  let list = []; let index = 0; let opener = null; let touchX = null;

  const inGroup = (group) => lbItems.filter((el) => el.dataset.lbGroup === group && !el.hidden && !el.closest('[hidden]'));

  function show(i) {
    index = (i + list.length) % list.length;
    const el = list[index];
    const src = el.querySelector('img');
    imgEl.src = src.currentSrc || src.src;
    imgEl.alt = src.alt;
    imgEl.width = src.naturalWidth || src.width;
    imgEl.height = src.naturalHeight || src.height;
    capEl.innerHTML = '';
    const small = document.createElement('small');
    small.textContent = el.querySelector('small')?.textContent || '';
    capEl.append(small, el.dataset.title || src.alt);
    countEl.textContent = `${index + 1} / ${list.length}`;
    prevBtn.hidden = nextBtn.hidden = list.length < 2;
  }
  function open(el) {
    list = inGroup(el.dataset.lbGroup);
    opener = el.querySelector('.g-open');
    box.dataset.open = 'true';
    box.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lb-lock');
    show(list.indexOf(el));
    closeBtn.focus();
  }
  function close() {
    if (box.dataset.open !== 'true') return;
    box.dataset.open = 'false';
    box.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lb-lock');
    imgEl.removeAttribute('src');
    opener?.focus();
  }
  lbItems.forEach((el) => el.querySelector('.g-open').addEventListener('click', () => open(el)));
  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => show(index - 1));
  nextBtn.addEventListener('click', () => show(index + 1));
  box.addEventListener('click', (e) => { if (e.target === box || e.target.classList.contains('lb__stage')) close(); });

  document.addEventListener('keydown', (e) => {
    if (box.dataset.open !== 'true') return;
    const rtl = document.documentElement.dir === 'rtl';
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(index + (rtl ? 1 : -1)); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(index + (rtl ? -1 : 1)); }
    else if (e.key === 'Tab') {
      const f = [closeBtn, prevBtn, nextBtn].filter((b) => !b.hidden);
      const pos = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(pos + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  box.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX; touchX = null;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1) * (document.documentElement.dir === 'rtl' ? -1 : 1));
  }, { passive: true });
}
