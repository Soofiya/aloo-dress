/* ==========================================================================
   game.js — the game logic. You should not need to edit this to add clothes
   (that's all in config.js).

   HOW IT WORKS, IN BRIEF
   - Every clothing item is a full-size transparent <img> stacked on top of
     Aloo. Because every PNG is the same size as aloo.png with Aloo in the
     same place, there is no positioning maths: the browser just stacks them.
   - "worn" remembers what Aloo is wearing: { hats: ['santahat'], ... }
   - Tapping an item in the carousel calls toggle(). Dragging one calls
     putOn() when you let go over Aloo.
   ========================================================================== */
(function () {
  'use strict';

  // ---------- Handy references ----------
  const $ = (sel) => document.querySelector(sel);
  const stageEl  = $('#stage');
  const areaEl   = $('#stage-area');
  const layersEl = $('#layers');
  const trayEl   = $('#tray');
  const hintEl   = $('#hint');
  const toastEl  = $('#toast');
  const prevBtn  = $('#prev');
  const nextBtn  = $('#next');

  document.title = GAME.title;

  // Look items up by id, and remember each item's position in the list
  const itemsById = {};
  ITEMS.forEach((item, i) => { item.order = i; itemsById[item.id] = item; });

  // What Aloo is wearing right now:  categoryId -> [itemIds]
  const worn = {};
  Object.keys(CATEGORIES).forEach((c) => { worn[c] = []; });

  // The <img> for each item, created the first time it is worn (lazy loading)
  const layerEls = {};

  // ---------- File paths (see config.js for the folder convention) ----------
  const layerSrc = (it) => `assets/layers/${it.category}/${it.id}.${GAME.imageFormat}`;
  const thumbSrc = (it) => `assets/thumbs/${it.category}/${it.id}.${GAME.imageFormat}`;

  // Stacking order: category position in LAYER_ORDER, then order in ITEMS.
  const zIndexFor = (it) => LAYER_ORDER.indexOf(it.category) * 1000 + it.order;
  const baseImg = $('#aloo');
  baseImg.style.zIndex = LAYER_ORDER.indexOf('aloo') * 1000;

  // The stage takes its shape from aloo.png, whatever size you draw it at.
  // (All clothing PNGs must be exactly the same size as aloo.png.)
  function fitStageToAloo() {
    if (baseImg.naturalWidth) {
      document.documentElement.style.setProperty('--ratio', baseImg.naturalWidth / baseImg.naturalHeight);
    }
  }
  if (baseImg.complete) fitStageToAloo(); else baseImg.addEventListener('load', fitStageToAloo);

  // ==========================================================================
  // WEARING THINGS
  // ==========================================================================
  const isWorn = (id) => worn[itemsById[id].category].includes(id);

  function putOn(id) {
    const item = itemsById[id];
    const cat = CATEGORIES[item.category];
    if (cat.rule === 'replace') worn[item.category] = [id];
    else if (!isWorn(id)) worn[item.category].push(id);
    // Conflict rule: e.g. dungarees clear 'bottoms' (see config.js)
    (cat.clears || []).forEach((other) => { worn[other] = []; });
  }

  function takeOff(id) {
    const cat = itemsById[id].category;
    worn[cat] = worn[cat].filter((x) => x !== id);
  }

  function toggle(id) {
    if (isWorn(id)) takeOff(id); else putOn(id);
    refresh(true);
  }

  // Make the screen match the `worn` list
  function refresh(animate) {
    ITEMS.forEach((item) => {
      if (isWorn(item.id)) ensureLayer(item);
      if (layerEls[item.id]) layerEls[item.id].classList.toggle('on', isWorn(item.id));
    });
    trayEl.querySelectorAll('.thumb').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(isWorn(btn.dataset.id)));
    });
    if (animate) { bounce(layersEl); hintEl.classList.add('gone'); }
  }

  function ensureLayer(item) {
    if (layerEls[item.id]) return;
    const img = new Image();
    img.className = 'layer';
    img.alt = '';                       // decorative: the carousel button carries the label
    img.draggable = false;
    img.decoding = 'async';
    img.style.zIndex = zIndexFor(item);
    img.onerror = () => console.warn('Missing image:', img.src);
    img.src = layerSrc(item);
    layersEl.appendChild(img);
    layerEls[item.id] = img;
  }

  function bounce(el) {
    el.classList.remove('bounce');
    void el.offsetWidth;                // restart the animation
    el.classList.add('bounce');
    el.addEventListener('animationend', () => el.classList.remove('bounce'), { once: true });
  }

  // ==========================================================================
  // THE CAROUSEL  (all items, in the order of the ITEMS list)
  // ==========================================================================
  function buildCarousel() {
    ITEMS.forEach((it) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb';
      b.dataset.id = it.id;
      b.setAttribute('aria-label', it.name);
      b.setAttribute('aria-pressed', 'false');
      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.draggable = false;
      img.src = thumbSrc(it);
      // If a thumbnail is missing, fall back to the full layer image
      img.onerror = () => { if (img.src.indexOf(layerSrc(it)) < 0) img.src = layerSrc(it); };
      b.appendChild(img);
      b.insertAdjacentHTML('beforeend', '<span class="ring" aria-hidden="true"></span>');
      trayEl.appendChild(b);
    });
  }

  // Arrows move one "page" (three items) at a time
  prevBtn.addEventListener('click', () => trayEl.scrollBy({ left: -trayEl.clientWidth, behavior: 'smooth' }));
  nextBtn.addEventListener('click', () => trayEl.scrollBy({ left:  trayEl.clientWidth, behavior: 'smooth' }));
  function updateArrows() {
    const max = trayEl.scrollWidth - trayEl.clientWidth;
    prevBtn.disabled = trayEl.scrollLeft < 4;
    nextBtn.disabled = trayEl.scrollLeft > max - 4;
  }
  trayEl.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);

  // TAP (or keyboard Enter/Space) on an item
  let justDragged = false;              // stops a drag from also counting as a tap
  trayEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.thumb');
    if (!btn || justDragged) return;
    toggle(btn.dataset.id);
    bounce(btn);
  });

  // ==========================================================================
  // DRAG AND DROP  (pointer events: one code path for finger, pen and mouse)
  //
  // The carousel scrolls sideways (touch-action: pan-x in the CSS), so:
  //   - dragging SIDEWAYS scrolls the carousel (the browser handles it)
  //   - dragging UP / DOWN picks the item up (no scroll conflict)
  //   - a mouse can drag in any direction
  // Let go over the stage area to put it on Aloo.
  // ==========================================================================
  let drag = null;

  trayEl.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.thumb');
    if (!btn || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { id: btn.dataset.id, btn, pointerId: e.pointerId,
             x0: e.clientX, y0: e.clientY, active: false, ghost: null };
  });

  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;

    if (!drag.active) {
      const start = e.pointerType === 'mouse'
        ? Math.hypot(dx, dy) > 6
        : Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.2;
      if (!start) return;
      startDrag();
    }
    drag.ghost.style.left = e.clientX + 'px';
    drag.ghost.style.top  = e.clientY + 'px';
    areaEl.classList.toggle('drop-ready', overStage(e));
  });

  function startDrag() {
    drag.active = true;
    const ghost = document.createElement('img');
    ghost.className = 'ghost';
    ghost.alt = '';
    ghost.src = drag.btn.querySelector('img').src;
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    try { drag.btn.setPointerCapture(drag.pointerId); } catch (_) { /* fine */ }
  }

  function overStage(e) {
    const r = areaEl.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right &&
           e.clientY >= r.top  && e.clientY <= r.bottom;
  }

  function endDrag(e, drop) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (drag.active) {
      if (drop && overStage(e)) { putOn(drag.id); refresh(true); }
      drag.ghost.remove();
      areaEl.classList.remove('drop-ready');
      justDragged = true;                         // swallow the click that follows
      setTimeout(() => { justDragged = false; }, 80);
    }
    drag = null;
  }
  window.addEventListener('pointerup',     (e) => endDrag(e, true));
  window.addEventListener('pointercancel', (e) => endDrag(e, false));

  // ==========================================================================
  // PREVENT ACCIDENTAL ZOOM / SCROLL (Safari ignores some of the CSS/meta)
  // ==========================================================================
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((n) =>
    document.addEventListener(n, (e) => e.preventDefault()));
  stageEl.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // ==========================================================================
  // MIX / RESET / SAVE
  // ==========================================================================
  $('#btn-reset').addEventListener('click', () => {
    Object.keys(worn).forEach((c) => { worn[c] = []; });
    refresh(true);
    toast('Clothes off!');
  });

  // Mix: replace categories get one item (or none), stack categories get a few
  $('#btn-random').addEventListener('click', () => {
    Object.keys(worn).forEach((c) => { worn[c] = []; });
    Object.keys(CATEGORIES).forEach((c) => {
      const pool = ITEMS.filter((it) => it.category === c);
      if (!pool.length) return;
      if (CATEGORIES[c].rule === 'stack') {
        pool.forEach((it) => { if (Math.random() < 0.35) putOn(it.id); });
      } else if (c === 'background' || Math.random() < 0.7) {
        putOn(pool[Math.floor(Math.random() * pool.length)].id);
      }
    });
    refresh(true);
  });

  // Save: draw every visible layer onto a <canvas> the size of aloo.png,
  // then share (phones) or download (desktop).
  $('#btn-save').addEventListener('click', async () => {
    try {
      const cw = baseImg.naturalWidth, ch = baseImg.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = getComputedStyle(document.body).backgroundColor;   // the yellow
      ctx.fillRect(0, 0, cw, ch);

      const visible = Array.from(layersEl.querySelectorAll('.layer.on'))
        .sort((a, b) => Number(a.style.zIndex) - Number(b.style.zIndex));
      for (const img of visible) {
        try { await img.decode(); } catch (_) { /* skip images that failed */ }
        ctx.drawImage(img, 0, 0, cw, ch);
      }

      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('no blob');
      const file = new File([blob], 'aloo.png', { type: 'image/png' });

      // Phones: open the share sheet ("Save Image", Messages, etc.)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: GAME.title });
        return;
      }
      // Desktop: normal download
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'aloo.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast('Saved!');
    } catch (err) {
      if (err && err.name === 'AbortError') return;   // user closed the share sheet
      console.error(err);
      toast('Could not save');
    }
  });

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  // ==========================================================================
  // THE WOBBLY BORDER  (a rectangle with a hand-drawn wiggle, redrawn on resize)
  // ==========================================================================
  function drawFrame() {
    const el = $('#frame'), svg = el.firstElementChild, path = svg.firstElementChild;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const m = 4, amp = 3, wave = 24;      // inset, wiggle height, wiggle length (px)
    let seed = 7;                         // fixed seed = the same wobble every time
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pts = [];
    const side = (x0, y0, x1, y1, nx, ny) => {
      const len = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(len / 5);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const d = Math.sin(t * len / wave * 2 * Math.PI) * amp + (rnd() - 0.5) * 1.2;
        pts.push([x0 + (x1 - x0) * t + nx * d, y0 + (y1 - y0) * t + ny * d]);
      }
    };
    side(m, m, w - m, m, 0, 1);
    side(w - m, m, w - m, h - m, -1, 0);
    side(w - m, h - m, m, h - m, 0, -1);
    side(m, h - m, m, m, 1, 0);
    path.setAttribute('d', 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z');
  }
  window.addEventListener('resize', drawFrame);

  // ==========================================================================
  // START
  // ==========================================================================
  buildCarousel();
  GAME.startWearing.forEach((id) => { if (itemsById[id]) putOn(id); });
  refresh(false);
  drawFrame();
  updateArrows();
  // Fonts/images arriving can change sizes slightly: tidy up once things settle
  window.addEventListener('load', () => { drawFrame(); updateArrows(); });

  // Offline support (needs https or localhost; silently skipped otherwise)
  if ('serviceWorker' in navigator && location.protocol !== 'file:' &&
      !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {   // not while previewing on your own computer
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
