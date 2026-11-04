(() => {
  const E = window.ENMAA || { i18n: {} };
  const T = E.i18n;
  document.documentElement.classList.add('js');

  const root = document.documentElement;
  const RTL = document.dir === 'rtl';
  const LANG = root.lang;
  // Set in <head>: system reduced-motion preference, unless previewed with ?motion=full.
  const reduced = root.classList.contains('reduce-motion');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const nav = document.querySelector('.site-nav');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  root.classList.add('motion-ready'); // tells the <head> failsafe that animations are wired up

  // ---------- intro screen (first visit per session) ----------
  const introDelay = root.classList.contains('intro') ? 2.2 : 0;
  if (introDelay) setTimeout(() => root.classList.remove('intro'), 3300);

  // ---------- split text into masked words / characters ----------
  // Arabic letters must stay joined, so Arabic always splits by word.
  document.querySelectorAll('[data-split]').forEach((el) => {
    const text = el.textContent.trim();
    const byChar = el.dataset.split === 'chars' && LANG !== 'ar';
    const frag = document.createDocumentFragment();
    let ci = 0;
    text.split(/(\s+)/).forEach((tok, wi) => {
      if (!tok) return;
      if (/^\s+$/.test(tok)) { frag.append(' '); return; }
      const w = document.createElement('span');
      w.className = 'split-w';
      w.setAttribute('aria-hidden', 'true');
      if (byChar) {
        [...tok].forEach((ch) => {
          const c = document.createElement('span');
          c.className = 'split-c';
          c.style.setProperty('--i', ci++);
          c.textContent = ch;
          w.append(c);
        });
      } else {
        const c = document.createElement('span');
        c.className = 'split-wi';
        c.style.setProperty('--i', wi / 2);
        c.textContent = tok;
        w.append(c);
      }
      frag.append(w);
    });
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    el.textContent = '';
    el.append(sr, frag);
  });

  // ---------- scroll-lit statement: words go from faint to dark as you scroll ----------
  const scrubWords = [];
  document.querySelectorAll('[data-scrub]').forEach((el) => {
    const text = el.textContent.trim();
    el.textContent = '';
    text.split(/\s+/).forEach((w, i) => {
      if (i) el.append(' ');
      const span = document.createElement('span');
      span.className = 'scrub-w';
      if (/libya|ليبيا/i.test(w)) span.dataset.accent = '1';
      span.textContent = w;
      el.append(span);
    });
    scrubWords.push({ el, words: [...el.querySelectorAll('.scrub-w')] });
  });
  const updateScrub = (vh) => scrubWords.forEach(({ el, words }) => {
    const r = el.getBoundingClientRect();
    const p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.32), 0, 1);
    const lit = Math.round(p * words.length);
    words.forEach((w, i) => {
      const on = i < lit;
      w.classList.toggle('is-lit', on);
      w.classList.toggle('is-accent', on && !!w.dataset.accent);
    });
  });

  // ---------- stagger children & image masks ----------
  document.querySelectorAll('[data-stagger]').forEach((list) => {
    [...list.children].forEach((child, i) => {
      if (!child.classList.contains('reveal')) child.classList.add('reveal');
      child.style.setProperty('--d', `${(i % 6) * 0.09}s`);
    });
  });
  document.querySelectorAll('.img-zoom, .values-media, .article-img').forEach((m) => {
    if (m.closest('.hero') || m.closest('.lightbox')) return;
    m.classList.add('mask');
    const parentDelay = m.closest('[data-stagger] > *');
    if (parentDelay) m.style.setProperty('--d', parentDelay.style.getPropertyValue('--d'));
  });

  // Hero content waits for the intro to finish.
  // The hero is always on screen at load, so it animates in right away instead of on scroll.
  const heroItems = [...document.querySelectorAll('.hero .reveal, .hero [data-split]')];
  heroItems.forEach((el) => {
    const own = parseFloat(el.style.getPropertyValue('--d')) || 0;
    el.style.setProperty('--d', `${introDelay + own + (el.matches('[data-split]') ? 0.15 : 0.6)}s`);
  });
  setTimeout(() => heroItems.forEach((el) => el.classList.add('is-in')), 40);

  // ---------- reveal on scroll ----------
  const toReveal = [...document.querySelectorAll('.reveal, [data-split], .sec-rule, .mask, [data-panels]')].filter((el) => !heroItems.includes(el));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    toReveal.forEach((el) => io.observe(el));
  } else toReveal.forEach((el) => el.classList.add('is-in'));

  // ---------- scroll-driven effects (one rAF loop) ----------
  const progress = document.querySelector('.scroll-progress i');
  const heroFade = document.querySelector('[data-hero-fade]');
  const parallax = [...document.querySelectorAll('[data-parallax]')];

  let lastY = window.scrollY;
  let ticking = false;
  function tick() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const docH = document.documentElement.scrollHeight - vh;
    if (progress) progress.style.transform = `scaleX(${docH > 0 ? y / docH : 0})`;

    if (nav) {
      nav.classList.toggle('is-solid', y > 80);
      const menuOpen = document.body.classList.contains('menu-open');
      if (!menuOpen && y > 400 && y - lastY > 4) nav.classList.add('is-hidden');
      else if (y - lastY < -4 || y <= 400) nav.classList.remove('is-hidden');
    }
    lastY = y;
    updateScrub(vh);
    if (reduced) return;

    if (heroFade && y < vh * 1.2) {
      heroFade.style.opacity = String(clamp(1 - y / (vh * 0.75), 0, 1));
      heroFade.style.transform = `translateY(${y * 0.18}px)`;
    }
    parallax.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.2;
      if (el.closest('.hero')) {
        if (y < vh * 1.2) el.style.transform = `translate3d(0, ${y * speed}px, 0)`;
        return;
      }
      const box = el.parentElement.getBoundingClientRect();
      if (box.bottom < -100 || box.top > vh + 100) return;
      const p = clamp((box.top + box.height / 2 - vh / 2) / (vh / 2 + box.height / 2), -1, 1);
      el.style.transform = `translate3d(0, ${-p * speed * box.height * 0.4}px, 0)`;
    });
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } };
  tick();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  // ---------- auto-advancing sets (hero slideshow, What-we-do panels) ----------
  // Each set advances when the active item's progress bar animation ends,
  // so pausing is just pausing that CSS animation.
  function restartBar(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // reflow so the animation starts again
    el.classList.add(cls);
  }
  function watchVisibility(el, onChange) {
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(([en]) => onChange(en.isIntersecting), { threshold: 0.25 }).observe(el);
  }

  // Hero slideshow: tabs = the four development types.
  const hero = document.querySelector('[data-slideshow]');
  if (hero) {
    const slides = [...hero.querySelectorAll('.hero-slide')];
    const tabs = [...hero.querySelectorAll('.hero-tab')];
    const pauseBtn = hero.querySelector('[data-pause]');
    let index = 0;
    let userPaused = false;
    const setPaused = () => hero.classList.toggle('is-paused', userPaused || document.hidden || !heroVisible);
    let heroVisible = true;
    const goTo = (i) => {
      if (i === index) return;
      const prev = slides[index];
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      setTimeout(() => prev.classList.remove('is-leaving'), 1700);
      index = (i + slides.length) % slides.length;
      slides[index].classList.add('is-active');
      tabs.forEach((tb, k) => {
        tb.classList.toggle('is-done', k < index);
        tb.classList.remove('is-active');
        tb.setAttribute('aria-pressed', String(k === index));
      });
      restartBar(tabs[index], 'is-active');
      const current = hero.querySelector('[data-current]');
      if (current) current.textContent = tabs[index].querySelector('.hero-tab-label').textContent;
    };
    hero.addEventListener('animationend', (e) => {
      if (e.animationName === 'fill' && e.target.closest('.hero-tab') === tabs[index]) goTo(index + 1);
    });
    tabs.forEach((tb, k) => tb.addEventListener('click', () => goTo(k)));
    hero.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => goTo(index + Number(b.dataset.step))));
    if (pauseBtn) pauseBtn.addEventListener('click', () => {
      userPaused = !userPaused;
      pauseBtn.setAttribute('aria-label', userPaused ? pauseBtn.dataset.labelPlay : pauseBtn.dataset.labelPause);
      setPaused();
    });
    document.addEventListener('visibilitychange', setPaused);
    watchVisibility(hero, (v) => { heroVisible = v; setPaused(); });
  }

  // What we do: expanding panels.
  const panelSet = document.querySelector('[data-panels]');
  if (panelSet) {
    const panels = [...panelSet.querySelectorAll('.panel')];
    const counter = document.querySelector('[data-panel-index]');
    let active = 0;
    let hovering = false;
    let visible = false;
    panels.forEach((pn, k) => pn.style.setProperty('--n', k));
    const setPaused = () => panelSet.classList.toggle('is-paused', hovering || !visible || document.hidden);
    const activate = (k) => {
      active = (k + panels.length) % panels.length;
      panels.forEach((pn, j) => {
        pn.classList.toggle('is-active', j === active);
        pn.setAttribute('aria-expanded', String(j === active));
      });
      if (counter) counter.textContent = String(active + 1).padStart(2, '0');
      restartBar(panelSet, 'is-running');
    };
    panels.forEach((pn, k) => {
      pn.addEventListener('click', () => { if (k !== active) activate(k); });
      pn.addEventListener('focus', () => { if (k !== active) activate(k); });
      if (finePointer) pn.addEventListener('mouseenter', () => { if (k !== active) activate(k); });
      pn.addEventListener('keydown', (e) => {
        const next = RTL ? 'ArrowLeft' : 'ArrowRight';
        const prev = RTL ? 'ArrowRight' : 'ArrowLeft';
        if (e.key === next) { e.preventDefault(); panels[(k + 1) % panels.length].focus(); }
        if (e.key === prev) { e.preventDefault(); panels[(k - 1 + panels.length) % panels.length].focus(); }
      });
    });
    panelSet.addEventListener('mouseenter', () => { hovering = true; setPaused(); });
    panelSet.addEventListener('mouseleave', () => { hovering = false; setPaused(); });
    panelSet.addEventListener('animationend', (e) => {
      if (e.animationName === 'fill' && e.target.closest('.panel') === panels[active]) activate(active + 1);
    });
    document.addEventListener('visibilitychange', setPaused);
    watchVisibility(panelSet, (v) => { visible = v; setPaused(); });
    activate(0);
  }

  // ---------- magnetic buttons ----------
  if (finePointer && !reduced) {
    document.querySelectorAll('.btn-primary, .btn-light').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18;
        const yy = (e.clientY - r.top - r.height / 2) * 0.3;
        b.style.transform = `translate(${x}px, ${yy}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  // ---------- page transitions (a fade, so it stays on with reduced motion) ----------
  {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith('/admin') || url.pathname.startsWith('/uploads')) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      root.classList.add('is-leaving');
      setTimeout(() => { location.href = url.href; }, 380);
    });
    window.addEventListener('pageshow', (e) => { if (e.persisted) root.classList.remove('is-leaving'); });
  }

  const menuBtn = document.querySelector('.menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (menuBtn && menu) {
    const setOpen = (open) => {
      menuBtn.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      document.body.classList.toggle('menu-open', open);
    };
    menuBtn.addEventListener('click', () => setOpen(menu.hidden));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); menuBtn.focus(); } });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  }

  // ---------- images fade in once loaded (no half-drawn photos) ----------
  document.querySelectorAll('img.fade').forEach((im) => {
    const done = () => im.classList.add('is-loaded');
    if (im.complete && im.naturalWidth) done();
    else { im.addEventListener('load', done, { once: true }); im.addEventListener('error', done, { once: true }); }
  });

  // ---------- values: swap image on hover/focus, auto-advance while visible ----------
  const vImgs = document.querySelectorAll('.values-img');
  const vItems = [...document.querySelectorAll('.values li')];
  if (vItems.length) {
    let current = 0;
    let paused = false;
    let visible = false;
    const show = (i) => {
      current = i;
      vImgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
      vItems.forEach((x, k) => x.classList.toggle('is-on', k === i));
      const num = document.querySelector('[data-value-num]');
      const title = document.querySelector('[data-value-title]');
      if (num) num.textContent = String(i + 1).padStart(2, '0');
      if (title) title.textContent = vItems[i].querySelector('h3').textContent;
    };
    show(0);
    vItems.forEach((li, i) => {
      li.addEventListener('mouseenter', () => { paused = true; show(i); });
      li.addEventListener('mouseleave', () => { paused = false; });
      li.addEventListener('focus', () => show(i));
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.4 }).observe(vItems[0].closest('section') || vItems[0]);
      setInterval(() => { if (visible && !paused) show((current + 1) % vItems.length); }, 4200);
    }
  }

  // ---------- project tabs: highlight current section ----------
  const tabLinks = [...document.querySelectorAll('.tabs a')];
  if (tabLinks.length && 'IntersectionObserver' in window) {
    const map = new Map(tabLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) tabLinks.forEach((a) => a.classList.toggle('is-active', a === map.get(en.target.id)));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    map.forEach((a, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  // ---------- gallery lightbox ----------
  const lb = document.querySelector('.lightbox');
  const items = [...document.querySelectorAll('[data-lightbox]')];
  if (lb && items.length) {
    const im = lb.querySelector('img');
    const cap = lb.querySelector('figcaption');
    let idx = 0;
    let opener = null;
    const show = (i) => {
      idx = (i + items.length) % items.length;
      im.src = items[idx].dataset.src;
      cap.textContent = items[idx].dataset.caption || '';
    };
    const close = () => { lb.hidden = true; document.body.style.overflow = ''; opener && opener.focus(); };
    items.forEach((b, i) => b.addEventListener('click', () => { opener = b; show(i); lb.hidden = false; document.body.style.overflow = 'hidden'; lb.querySelector('.lb-close').focus(); }));
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', () => show(idx - 1));
    lb.querySelector('.lb-next').addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    // Swipe left/right on phones.
    let startX = null;
    lb.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) < 40) return;
      const forward = dx < 0 !== (document.dir === 'rtl');
      show(idx + (forward ? 1 : -1));
    });
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      const rtl = document.dir === 'rtl';
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(idx + (rtl ? -1 : 1));
      if (e.key === 'ArrowLeft') show(idx + (rtl ? 1 : -1));
    });
  }

  // ---------- vacancies: search & filters, Apply pre-selects position ----------
  const vq = document.querySelector('[data-vac-q]');
  if (vq) {
    const vd = document.querySelector('[data-vac-d]');
    const vc = document.querySelector('[data-vac-c]');
    const rows = [...document.querySelectorAll('.vac-table tbody tr')];
    const empty = document.querySelector('.vac-empty');
    const filter = () => {
      const q = vq.value.trim().toLowerCase();
      let shown = 0;
      rows.forEach((r) => {
        const ok = (!q || r.dataset.text.includes(q)) && (!vd.value || r.dataset.dept === vd.value) && (!vc.value || r.dataset.city === vc.value);
        r.hidden = !ok;
        if (ok) shown++;
      });
      empty.hidden = shown > 0;
    };
    [vq, vd, vc].forEach((el) => el.addEventListener('input', filter));
  }
  document.querySelectorAll('[data-apply]').forEach((a) => a.addEventListener('click', () => {
    const sel = document.querySelector('[data-position-select]');
    if (sel) sel.value = a.dataset.apply;
  }));

  // Investors: sector cards pre-select the sector in the form.
  document.querySelectorAll('[data-sector]').forEach((a) => a.addEventListener('click', () => {
    const sel = document.querySelector('[data-sector-select]');
    if (sel) sel.value = a.dataset.sector;
  }));

  // ---------- forms ----------
  document.querySelectorAll('.file-field input').forEach((inp) => inp.addEventListener('change', () => {
    const name = inp.closest('.file-field').querySelector('.file-name');
    name.textContent = inp.files[0] ? inp.files[0].name : '';
  }));

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const setErr = (field, msg) => {
    if (!field) return;
    field.classList.toggle('has-error', !!msg);
    const p = field.querySelector('.field-error');
    if (p) p.textContent = msg || '';
    const ctl = field.querySelector('input, select, textarea');
    if (ctl) ctl.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };

  function validate(form) {
    let first = null;
    form.querySelectorAll('.field').forEach((f) => {
      const ctl = f.querySelector('input:not([type=hidden]), select, textarea');
      if (!ctl) return;
      let msg = '';
      if (ctl.type === 'checkbox') { if (ctl.required && !ctl.checked) msg = T.err_consent; }
      else if (ctl.type === 'file') {
        const file = ctl.files[0];
        if (ctl.required && !file) msg = T.err_file;
        else if (file && (!/\.(pdf|docx)$/i.test(file.name) || file.size > 5 * 1024 * 1024)) msg = T.err_file;
      } else if (ctl.required && !ctl.value.trim()) msg = T.err_required;
      else if (ctl.type === 'email' && ctl.value && !EMAIL.test(ctl.value.trim())) msg = T.err_email;
      setErr(f, msg);
      if (msg && !first) first = ctl;
    });
    if (first) first.focus();
    return !first;
  }

  document.querySelectorAll('form[data-enhance]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = form.querySelector('.form-status');
      status.className = 'form-status';
      status.textContent = '';
      if (!validate(form)) return;
      const btn = form.querySelector('button[type=submit]');
      const label = btn.textContent;
      btn.disabled = true;
      btn.textContent = T.sending;
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          const done = document.createElement('div');
          done.className = 'form-done';
          done.setAttribute('role', 'status');
          done.tabIndex = -1;
          done.innerHTML = '<p class="h4"></p>';
          done.querySelector('p').textContent = data.message || form.dataset.success;
          form.replaceWith(done);
          done.focus();
          return;
        }
        if (data.errors) {
          Object.entries(data.errors).forEach(([name, msg]) => {
            const ctl = form.querySelector(`[name="${name}"]`);
            setErr(ctl && ctl.closest('.field'), msg);
          });
        }
        status.classList.add('is-err');
        status.textContent = data.message || T.form_error;
      } catch {
        status.classList.add('is-err');
        status.textContent = T.form_error;
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    });
  });

  // No-JS fallback confirmation (?sent=1)
  const sent = new URLSearchParams(location.search).get('sent');
  if (sent) {
    const form = document.querySelector('form[data-enhance]');
    if (form && sent === '1') {
      const done = document.createElement('div');
      done.className = 'form-done';
      done.innerHTML = '<p class="h4"></p>';
      done.querySelector('p').textContent = form.dataset.success;
      form.replaceWith(done);
      done.scrollIntoView();
    }
  }
})();

// Language menu: close when clicking elsewhere or pressing Escape.
(() => {
  const menu = document.querySelector('details.lang-switch');
  if (!menu) return;
  document.addEventListener('click', (e) => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); } });
})();
