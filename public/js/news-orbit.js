/* Home news ring: cards stand on the inside of a ring that turns around the viewer.
   Drag (with momentum), arrows, keyboard and a slow auto-turn; it always settles
   with one story facing you. Clicking a side card turns it to the front;
   clicking the front card opens the story. */
(() => {
  const stage = document.querySelector('[data-orbit]');
  if (!stage) return;
  const section = stage.closest('.news-orbit');
  const ring = stage.querySelector('.orbit-ring');
  const cards = [...ring.querySelectorAll('.orbit-card')];
  const counter = section.querySelector('[data-orbit-n]');
  const live = section.querySelector('[data-orbit-live]');
  const n = cards.length;
  const step = 360 / n;
  const rtl = document.documentElement.dir === 'rtl';
  const sign = rtl ? -1 : 1; // the next story sits on the reading side
  const reduced = document.documentElement.classList.contains('reduce-motion');

  let R = 600, T = 480;
  function layout() {
    const w = cards[0].offsetWidth || 300;
    R = Math.max(w * 1.9, ((w + 40) * n) / (2 * Math.PI));
    T = R - (window.innerWidth < 768 ? 30 : 40);
    cards.forEach((c, i) => { c.style.transform = `rotateY(${-sign * i * step}deg) translateZ(${-R}px)`; });
  }

  let rot = 0;          // current ring angle (deg)
  let vel = 0;          // speed (deg per second)
  let target = 0;       // angle the ring eases towards
  let dragging = false;
  let front = -1;

  const norm = (a) => ((a % 360) + 540) % 360 - 180;   // -> [-180, 180)
  const indexAt = (a) => ((Math.round(a / (sign * step)) % n) + n) % n;
  const goTo = (i) => { target = sign * i * step + Math.round((rot - sign * i * step) / 360) * 360; };
  const go = (d) => { goTo(indexAt(target) + d); kick(); };

  function render() {
    ring.style.transform = `translate3d(-50%, -50%, ${T}px) rotateY(${rot}deg)`;
    cards.forEach((c, i) => {
      const rel = Math.abs(norm(rot - sign * i * step));
      const o = rel < 22 ? 1 : Math.max(0, 1 - (rel - 22) / 78);
      c.style.opacity = o.toFixed(3);
      c.style.pointerEvents = o < 0.25 ? 'none' : '';
      c.style.visibility = o === 0 ? 'hidden' : '';
    });
    const f = indexAt(rot);
    if (f !== front) {
      front = f;
      preload(Number(cards[f].dataset.real));
      cards.forEach((c, i) => c.classList.toggle('is-front', i === f));
      const real = Number(cards[f].dataset.real);
      if (counter) counter.textContent = String(real + 1).padStart(2, '0');
      if (live) live.textContent = cards[f].querySelector('.orbit-title').textContent;
    }
  }

  // ---------- animation loop (runs only while something moves and the ring is on screen) ----------
  // A spring pulls the ring to the chosen card. It starts at the finger's speed, so letting go
  // flows straight into the glide (no coasting, then crawling back). Time-based: same feel at 60 or 120 Hz.
  const STIFF = 30, DAMP = 11;
  let raf = 0;
  let visible = false;
  let lastFrame = 0;
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.034, Math.max(0.001, (now - (lastFrame || now - 16)) / 1000));
    lastFrame = now;
    if (!dragging) {
      if (reduced) { rot = target; vel = 0; glide = null; }
      else if (glide) {
        // after a swipe: a slow, even glide to the closest picture (soft start, soft stop)
        const p = Math.min(1, (now - glide.t0) / glide.dur);
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        rot = glide.from + (glide.to - glide.from) * e;
        if (p >= 1 || target !== glide.to) { if (p >= 1) rot = target; glide = null; vel = 0; }
      } else {
        vel += (STIFF * (target - rot) - DAMP * vel) * dt;
        rot += vel * dt;
        if (Math.abs(target - rot) < 0.01 && Math.abs(vel) < 0.5) { rot = target; vel = 0; }
      }
    }
    render();
    if (dragging || vel || rot !== target) kick(); else lastFrame = 0;
  }
  let glide = null; // {from, to, t0, dur} while gliding to the closest picture after a swipe
  const SETTLE_MS = 1600;
  function kick() { if (visible && !paused && !raf) raf = requestAnimationFrame(frame); }
  let paused = false; // the ring stands still while a story is open
  const preloaded = new Set();
  function preload(i) {
    if (preloaded.has(i)) return;
    const tpl = section.querySelector(`template[data-story="${i}"]`);
    const im = tpl && tpl.content.querySelector('img');
    if (!im) return;
    preloaded.add(i);
    const pre = new Image();
    pre.decoding = 'async';
    if (im.sizes) pre.sizes = im.sizes;
    if (im.srcset) pre.srcset = im.srcset;
    pre.src = im.getAttribute('src');
    if (pre.decode) pre.decode().catch(() => {}); // unpack it now, not when the popup opens
  }

  // ---------- auto-turn ----------
  let hover = false;
  let focusIn = false;
  setInterval(() => {
    if (reduced || !visible || hover || focusIn || dragging || document.hidden || (modal && modal.open)) return;
    go(1);
  }, 5000);
  section.addEventListener('mouseenter', () => { hover = true; });
  section.addEventListener('mouseleave', () => { hover = false; });
  section.addEventListener('focusin', () => { focusIn = true; });
  section.addEventListener('focusout', () => { focusIn = false; });

  // ---------- drag ----------
  let lastX = 0, startX = 0, moved = false;
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true; moved = false;
    startX = lastX = e.clientX; vel = 0; glide = null;
    stage.classList.add('is-dragging');
    kick();
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    if (Math.abs(e.clientX - startX) > 6) moved = true;
    const k = 180 / (R * Math.PI) * 1.15; // a card follows the finger
    rot -= dx * k;
    lastX = e.clientX;
    target = rot;
    kick();
  });
  // Let go: the ring glides slowly to the picture closest to the middle (the swipe speed
  // does not throw it further), easing in and out.
  function release() {
    vel = 0;
    goTo(indexAt(rot));
    // the further from the picture, the longer the glide (never rushed)
    const far = Math.min(1, Math.abs(target - rot) / (step / 2));
    glide = Math.abs(target - rot) < 0.05 ? null : { from: rot, to: target, t0: performance.now(), dur: SETTLE_MS * (0.6 + 0.4 * far) };
    lastFrame = 0;
    kick();
  }
  const end = () => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('is-dragging');
    release();
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);

  // ---------- story popup: the page blurs behind, the story opens in a card ----------
  const modal = section.querySelector('[data-story-modal]');
  const content = modal && modal.querySelector('[data-story-content]');
  const stories = [...section.querySelectorAll('template[data-story]')];
  let story = 0;
  let closing = 0;
  let opener = null;
  let storyUrl = '';
  const panel = modal && modal.querySelector('.story-panel');
  const progress = modal && modal.querySelector('[data-story-progress]');
  const slugs = stories.map((tp) => tp.content.querySelector('[data-story-href]').dataset.slug);

  function fill(i, dir = 0) {
    story = (i + stories.length) % stories.length;
    const tpl = stories[story].content.cloneNode(true);
    storyUrl = new URL(tpl.querySelector('[data-story-href]').getAttribute('href'), location.href).href;
    tpl.querySelector('[data-story-href]').remove();
    // the address shows the open story, so it can be shared and reopens on load
    history.replaceState(null, '', '#news=' + slugs[story]);
    content.classList.remove('is-in', 'from-next', 'from-prev');
    content.replaceChildren(tpl);
    // sharp photo fades in over the small preview once it has loaded
    const photoEl = content.querySelector('.story-photo');
    if (photoEl && !(photoEl.complete && photoEl.naturalWidth)) {
      photoEl.classList.add('is-loading');
      photoEl.addEventListener('load', () => photoEl.classList.remove('is-loading'), { once: true });
    }
    preload((story + 1) % stories.length);
    preload((story - 1 + stories.length) % stories.length);
    content.scrollTop = 0;
    panel.scrollTop = 0;
    readProgress();
    const copy = modal.querySelector('[data-story-copy]');
    copy.textContent = copy.dataset.label || (copy.dataset.label = copy.textContent);
    copy.classList.remove('is-done');
    if (dir) content.classList.add(dir > 0 ? 'from-next' : 'from-prev');
    void content.offsetWidth;
    content.classList.add('is-in');
  }
  // Get the photo ready first (at most a moment), then show the popup and play its animation
  // from a rendered starting point. Without this the very first opening jumps instead of sliding.
  const settle = (img, ms = 250) => (img && img.decode ? Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, ms))]) : Promise.resolve());
  const twoFrames = () => new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 60); });
  let opening = false;
  async function openStory(i) {
    if (!modal || opening) return;
    opening = true;
    clearTimeout(closing);
    opener = document.activeElement;
    fill(i);
    paused = true;
    await settle(content.querySelector('.story-photo'));
    if (!modal.open) modal.showModal();
    // lock page scrolling on larger screens only; on phones it makes Safari's toolbars resize mid-opening
    if (window.innerWidth >= 768) document.documentElement.classList.add('story-lock');
    void panel.offsetWidth; // render the closed state once
    await twoFrames();
    modal.classList.add('is-open');
    modal.querySelector('.story-close').focus({ preventScroll: true });
    opening = false;
  }
  function closeStory() {
    if (!modal || !modal.open) return;
    modal.classList.remove('is-open');
    document.documentElement.classList.remove('story-lock');
    history.replaceState(null, '', location.pathname + location.search);
    closing = setTimeout(() => { modal.close(); paused = false; kick(); if (opener) opener.focus({ preventScroll: true }); }, reduced ? 0 : 420);
  }
  // thin line at the top of the popup: how far you have read
  function readProgress() {
    const max = panel.scrollHeight - panel.clientHeight;
    progress.style.transform = `scaleX(${max > 4 ? Math.min(1, panel.scrollTop / max) : 1})`;
  }
  function stepStory(d) {
    fill(story + d, d);
    // turn the ring to the same story behind the popup
    const k = cards.findIndex((c) => Number(c.dataset.real) === story);
    if (k > -1) { goTo(k); kick(); }
  }
  if (modal) {
    modal.querySelectorAll('[data-story-close]').forEach((b) => b.addEventListener('click', closeStory));
    modal.addEventListener('cancel', (e) => { e.preventDefault(); closeStory(); });
    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.target.closest('input, textarea')) return;
      stepStory((e.key === 'ArrowRight') !== rtl ? 1 : -1);
    });
    panel.addEventListener('scroll', readProgress, { passive: true });
    modal.querySelectorAll('[data-story-step]').forEach((b) => b.addEventListener('click', () => stepStory(Number(b.dataset.storyStep))));
    modal.querySelector('[data-story-copy]').addEventListener('click', async (e) => {
      const b = e.currentTarget;
      try { await navigator.clipboard.writeText(storyUrl); } catch (_) { return; }
      b.textContent = b.dataset.done;
      b.classList.add('is-done');
    });
  }

  // click: side card -> bring to front; front card -> open the story popup
  cards.forEach((c, i) => c.addEventListener('click', (e) => {
    e.preventDefault();
    if (moved) { moved = false; return; }
    if (i !== front) { goTo(i); kick(); return; }
    preload(Number(c.dataset.real));
    openStory(Number(c.dataset.real));
  }));
  cards.forEach((c, i) => c.addEventListener('focus', () => { goTo(i); kick(); }));
  cards.forEach((c) => c.addEventListener('pointerenter', () => preload(Number(c.dataset.real))));

  let wheelEnd = 0;
  // trackpad sideways swipe (vertical wheel keeps scrolling the page)
  stage.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    rot -= e.deltaX * 0.12;
    vel = 0;
    target = rot;
    kick();
    clearTimeout(wheelEnd);
    wheelEnd = setTimeout(() => release(), 90);
  }, { passive: false });

  // keyboard
  stage.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const right = e.key === 'ArrowRight';
    go(right !== rtl ? 1 : -1);
  });
  section.querySelectorAll('[data-orbit-step]').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.orbitStep))));

  // ---------- start ----------
  layout();
  render();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; kick(); }, { threshold: 0.1 }).observe(stage);
  } else { visible = true; }
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layout(); render(); }, 150); });
  section.classList.add('is-ready');

  // a shared link (#news=story-name) turns the ring to that story and opens it
  const shared = /^#news=(.+)$/.exec(location.hash);
  if (shared) {
    const i = slugs.indexOf(decodeURIComponent(shared[1]));
    if (i > -1) {
      section.scrollIntoView({ block: 'center' });
      const k = cards.findIndex((c) => Number(c.dataset.real) === i);
      rot = target = sign * k * step;
      render();
      setTimeout(() => openStory(i), 350);
    }
  }
})();
