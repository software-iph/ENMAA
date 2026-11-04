// Our Developments — keyword explorer.
// Left: keyword buttons. Right: an architectural model on a round plinth that builds itself
// from the chosen keywords (sea, towers, villas, park ...). Developments that have ALL the
// chosen keywords appear as pins on the model and in a list; opening one shows what it contains.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const root = document.querySelector('[data-kw]');
const dataEl = document.getElementById('kw-data');
if (root && dataEl) init(JSON.parse(dataEl.textContent));

function init(DATA) {
  const html = document.documentElement;
  const reduced = html.classList.contains('reduce-motion');
  const RTL = document.dir === 'rtl';
  const T = DATA.text;
  // Plural text for a count (Arabic: one / two / few / many), using forms sent by the server.
  const plural = (forms, n) => {
    const f = n === 1 ? 'one' : T.lang === 'ar' && n === 2 ? 'two' : T.lang === 'ar' && n % 100 >= 3 && n % 100 <= 10 ? 'few' : 'other';
    return (forms[f] || forms.other).replace('{n}', n);
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const buttons = [...root.querySelectorAll('[data-kw-id]')];
  const statusEl = root.querySelector('[data-kw-status]');
  const clearBtn = root.querySelector('[data-kw-clear]');
  const matchesEl = root.querySelector('[data-kw-matches]');
  const pinsEl = root.querySelector('[data-kw-pins]');
  const stage = root.querySelector('[data-kw-stage]');
  const cards = [...root.querySelectorAll('.p-card')];
  const countEl = root.querySelector('[data-kw-count]');
  const emptyEl = root.querySelector('[data-empty]');
  const drawer = document.querySelector('[data-kw-drawer]');

  // ---------- state (kept in the URL: ?k=3,5) ----------
  const valid = new Set(DATA.keywords.map((k) => String(k.id)));
  const selected = new Set((new URLSearchParams(location.search).get('k') || '').split(',').filter((id) => valid.has(id)).map(Number));
  const matchesAll = (p) => [...selected].every((id) => p.keywords.includes(id));
  const matched = () => (selected.size ? DATA.projects.filter(matchesAll) : []);
  const activeScenes = () => new Set(DATA.keywords.filter((k) => selected.has(k.id)).flatMap((k) => k.scenes));

  let model = null;

  function apply() {
    buttons.forEach((b) => {
      const on = selected.has(Number(b.dataset.kwId));
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    const list = matched();
    clearBtn.hidden = selected.size === 0;
    statusEl.textContent = !selected.size ? T.start : list.length ? plural(T.matches, list.length) : T.none;
    statusEl.classList.toggle('is-none', selected.size > 0 && !list.length);

    // Matching developments, shown over the model.
    matchesEl.innerHTML = list.map((p, i) => `<button type="button" class="kw-match" data-open="${esc(p.slug)}" style="--i:${i}">
      <img src="${esc(p.photos[0] || '')}" alt="" loading="lazy"><span><b>${esc(p.name)}</b><small>${esc([p.city, p.type].filter(Boolean).join(' · '))}</small><em>${esc(T.open)} ${RTL ? '←' : '→'}</em></span></button>`).join('');
    matchesEl.classList.toggle('has-items', list.length > 0);

    // Cards below follow the same rule (all chosen keywords).
    let shown = 0;
    cards.forEach((card) => {
      const p = DATA.projects.find((x) => x.slug === card.dataset.slug);
      const ok = !selected.size || (p && matchesAll(p));
      if (ok) shown++;
      card.hidden = !ok;
    });
    countEl.textContent = plural(T.count, shown);
    emptyEl.hidden = shown > 0;

    const q = new URLSearchParams(location.search);
    selected.size ? q.set('k', [...selected].join(',')) : q.delete('k');
    history.replaceState(null, '', location.pathname + (q.toString() ? `?${q}` : ''));
    if (model) model.update(activeScenes(), list);
  }
  buttons.forEach((b) => b.addEventListener('click', () => {
    const id = Number(b.dataset.kwId);
    selected.has(id) ? selected.delete(id) : selected.add(id);
    apply();
  }));
  clearBtn.addEventListener('click', () => { selected.clear(); apply(); });
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open]');
    if (btn) openDrawer(btn.dataset.open, btn);
  });

  // ---------- detail panel ("see what it contains") ----------
  let lastFocus = null;
  function openDrawer(slug, from) {
    const p = DATA.projects.find((x) => x.slug === slug);
    if (!p) return;
    lastFocus = from || document.activeElement;
    const kw = DATA.keywords.filter((k) => p.keywords.includes(k.id));
    drawer.querySelector('.kw-drawer-body').innerHTML = `
      <div class="kw-gallery">
        <div class="kw-gallery-main">${p.photos.map((src, i) => `<img src="${esc(src)}" alt=""${i ? '' : ' class="is-on"'}>`).join('')}</div>
        ${p.photos.length > 1 ? `<div class="kw-gallery-thumbs">${p.photos.map((src, i) => `<button type="button" data-photo="${i}"${i ? '' : ' class="is-on"'} aria-label="${i + 1}"><img src="${esc(src)}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <p class="kw-d-meta">${esc([p.city, p.type].filter(Boolean).join(' · '))}</p>
      <h2 class="kw-d-title" id="kw-drawer-title">${esc(p.name)}</h2>
      ${kw.length ? `<p class="kw-d-tags">${kw.map((k) => `<span class="tag">${esc(k.title)}</span>`).join('')}</p>` : ''}
      ${p.line ? `<p class="kw-d-line">${esc(p.line)}</p>` : ''}
      ${p.overview ? `<p class="kw-d-text">${esc(p.overview)}</p>` : ''}
      ${p.facts.length ? `<dl class="facts">${p.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      <div class="kw-d-actions"><a class="btn btn-primary" href="${esc(p.url)}">${esc(T.full)}</a><a class="text-link" href="${esc(p.url)}#enquire">${esc(T.interest)} ${RTL ? '←' : '→'}</a></div>`;
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    document.body.classList.add('kw-locked');
    drawer.querySelector('.kw-drawer-panel').focus();
  }
  function closeDrawer() {
    drawer.classList.remove('is-open');
    document.body.classList.remove('kw-locked');
    setTimeout(() => { drawer.hidden = true; }, reduced ? 0 : 450);
    lastFocus?.focus?.();
  }
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('[data-kw-close]')) return closeDrawer();
    const th = e.target.closest('[data-photo]');
    if (th) {
      const i = Number(th.dataset.photo);
      drawer.querySelectorAll('.kw-gallery-main img').forEach((im, k) => im.classList.toggle('is-on', k === i));
      drawer.querySelectorAll('[data-photo]').forEach((b, k) => b.classList.toggle('is-on', k === i));
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) closeDrawer(); });

  // phones: pull the sheet down from the top to close it
  const sheet = drawer.querySelector('.kw-drawer-panel');
  let startY = null;
  let pull = 0;
  sheet.addEventListener('touchstart', (e) => {
    if (window.innerWidth >= 768 || sheet.scrollTop > 0) return;
    startY = e.touches[0].clientY;
    pull = 0;
  }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (startY === null) return;
    pull = Math.max(0, e.touches[0].clientY - startY);
    if (!pull) return;
    sheet.classList.add('is-dragging');
    sheet.style.transform = `translateY(${pull}px)`;
  }, { passive: true });
  sheet.addEventListener('touchend', () => {
    if (startY === null) return;
    startY = null;
    sheet.classList.remove('is-dragging');
    sheet.style.transform = '';
    if (pull > 110) closeDrawer();
  });

  // ---------- 3D model ----------
  try {
    model = buildModel();
  } catch (err) {
    console.warn('3D model unavailable:', err);
    stage.closest('.kw-right').classList.add('no-3d');
  }
  apply();

  function buildModel() {
    const canvas = document.createElement('canvas');
    if (!(canvas.getContext('webgl2') || canvas.getContext('webgl'))) throw new Error('No WebGL');
    stage.prepend(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 1, 400);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.enableZoom = false; // keeps page scrolling smooth; the model is framed for you
    controls.minPolarAngle = 0.55;
    controls.maxPolarAngle = 1.2;
    controls.rotateSpeed = 0.55;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = RTL ? -0.6 : 0.6;
    controls.target.set(0, 6, 0);

    scene.add(new THREE.HemisphereLight('#ffffff', '#cfc6d3', 1.6));
    const sun = new THREE.DirectionalLight('#fff3e6', 2.2);
    sun.position.set(40, 70, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 180 });
    sun.shadow.bias = -0.0005;
    sun.shadow.radius = 4;
    scene.add(sun);

    // Materials (architectural-model palette with brand accents)
    const M = {
      plinthTop: new THREE.MeshStandardMaterial({ color: '#ebe4dc', roughness: 0.95 }),
      plinthSide: new THREE.MeshStandardMaterial({ color: '#2A162C', roughness: 0.6 }),
      white: new THREE.MeshStandardMaterial({ color: '#fbfaf8', roughness: 0.7 }),
      glass: new THREE.MeshStandardMaterial({ color: '#dfe4ec', roughness: 0.18, metalness: 0.55 }),
      purple: new THREE.MeshStandardMaterial({ color: '#4C2256', roughness: 0.5 }),
      roof: new THREE.MeshStandardMaterial({ color: '#c9b3a2', roughness: 0.85 }),
      road: new THREE.MeshStandardMaterial({ color: '#a9a3ad', roughness: 0.9 }),
      plaza: new THREE.MeshStandardMaterial({ color: '#e2dad1', roughness: 0.9 }),
      sand: new THREE.MeshStandardMaterial({ color: '#ead9bb', roughness: 1 }),
      water: new THREE.MeshStandardMaterial({ color: '#69aebd', roughness: 0.15, metalness: 0.25, transparent: true, opacity: 0.92 }),
      pool: new THREE.MeshStandardMaterial({ color: '#7fd0dc', roughness: 0.1, metalness: 0.2 }),
      leaf: new THREE.MeshStandardMaterial({ color: '#86a873', roughness: 0.9, flatShading: true }),
      leafDark: new THREE.MeshStandardMaterial({ color: '#6c8f5c', roughness: 0.9, flatShading: true }),
      trunk: new THREE.MeshStandardMaterial({ color: '#8a6f5a', roughness: 1 }),
      grass: new THREE.MeshStandardMaterial({ color: '#bcd0a2', roughness: 1 }),
      dune: new THREE.MeshStandardMaterial({ color: '#e4c99d', roughness: 1, flatShading: true }),
      umbrella: new THREE.MeshStandardMaterial({ color: '#4C2256', roughness: 0.6 }),
    };
    const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
    const box = (w, h, d, mat, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); const m = shadowed(new THREE.Mesh(g, mat)); m.position.set(x, y, z); return m; };

    // Plinth: a round architectural-model base.
    const R = 30;
    const TOP = 3.2;
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.6, TOP, 96), [M.plinthSide, M.plinthTop, M.plinthSide]);
    plinth.position.y = TOP / 2;
    plinth.receiveShadow = true;
    scene.add(plinth);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.3, 0.12, 8, 128), new THREE.MeshStandardMaterial({ color: '#BAC0CB', metalness: 0.8, roughness: 0.3 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = TOP;
    scene.add(ring);
    const shadowCatcher = new THREE.Mesh(new THREE.CircleGeometry(R * 1.8, 64), new THREE.ShadowMaterial({ opacity: 0.12 }));
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.receiveShadow = true;
    scene.add(shadowCatcher);

    const rng = ((seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; })(42);

    // ---------- scene elements, one group per keyword scene ----------
    const groups = {};
    const make = (name, mode) => {
      const g = new THREE.Group();
      g.position.y = TOP;
      g.userData = { mode, cur: 0, target: 0 };
      g.visible = false;
      scene.add(g);
      groups[name] = g;
      return g;
    };

    // Layout (top view): a round city plan. Every keyword owns its own slice of the plinth
    // (no element ever sits on another): sea at the front, then clockwise resort, offices,
    // city centre, towers (back), park, villas and desert. Thin roads separate the slices and
    // a round plaza sits in the middle.
    const deg = Math.PI / 180;
    const polar = (a, r) => [Math.sin(a * deg) * r, Math.cos(a * deg) * r];
    const HUB = 8.5;
    const OUT = R - 1.4;
    const ZONES = {
      sea: { a: 0, w: 96, floor: '#e9ddc6' },
      resort: { a: 66, w: 36, floor: '#efe4d2' },
      offices: { a: 102, w: 36, floor: '#e2e3ea' },
      centre: { a: 138, w: 36, floor: '#ece3d8' },
      towers: { a: 174, w: 36, floor: '#e6e1ea' },
      park: { a: 210, w: 36, floor: '#c6d9ab' },
      villas: { a: 246, w: 36, floor: '#efe6da' },
      desert: { a: 282, w: 36, floor: '#ecd2a4' },
    };
    const NEUTRAL = new THREE.Color('#e3dcd3');

    // Slice floors: neutral until their keyword is chosen, then they take the zone colour.
    const floors = {};
    Object.entries(ZONES).forEach(([name, z]) => {
      const geo = new THREE.RingGeometry(HUB + 0.6, OUT, 48, 1, (z.a - z.w / 2 - 90) * deg, z.w * deg);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({ color: NEUTRAL.clone(), roughness: 0.95 });
      const m = new THREE.Mesh(geo, mat);
      m.position.y = TOP + 0.03;
      m.receiveShadow = true;
      scene.add(m);
      floors[name] = { mat, target: new THREE.Color(z.floor) };
    });
    // Radial roads between the slices, a ring road and the central plaza.
    Object.values(ZONES).forEach((z) => {
      const a = z.a - z.w / 2;
      const len = OUT - HUB;
      const road = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, len), M.road);
      const [x, zz] = polar(a, HUB + len / 2);
      road.position.set(x, TOP + 0.05, zz);
      road.rotation.y = a * deg;
      road.receiveShadow = true;
      scene.add(road);
    });
    const ringRoad = new THREE.Mesh(new THREE.RingGeometry(HUB, HUB + 0.9, 64), M.road);
    ringRoad.rotation.x = -Math.PI / 2;
    ringRoad.position.y = TOP + 0.05;
    scene.add(ringRoad);
    const hub = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(HUB, HUB, 0.3, 64), M.plaza));
    hub.position.y = TOP + 0.15;
    scene.add(hub);
    const monument = new THREE.Group();
    [[0, 3.2, 1], [0, 1.6, 0.66], [0, 0, 1]].forEach(([, y, w]) => monument.add(box(2.4 * w, 0.5, 0.5, M.purple, -1.2 * (1 - w), y + 0.3, 0))); // the ENMAA "E"
    monument.position.y = TOP + 0.3;
    scene.add(monument);

    // Place a mesh in a zone at (angle offset, radius), turned to face the centre.
    const at = (mesh, zone, da, r, y = 0) => {
      const a = ZONES[zone].a + da;
      const [x, z] = polar(a, r);
      mesh.position.set(x, y, z);
      mesh.rotation.y = a * deg;
      return mesh;
    };
    const boxIn = (zone, da, r, w, h, d, mat, y = 0) => {
      const g = new THREE.BoxGeometry(w, h, d);
      g.translate(0, h / 2, 0);
      return at(shadowed(new THREE.Mesh(g, mat)), zone, da, r, y);
    };
    const tree = (group, zone, da, r, s) => {
      const t = new THREE.Group();
      t.add(shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.24 * s, 1.4 * s, 6), M.trunk)).translateY(0.7 * s));
      const crown = shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry(1.15 * s, 0), rng() > 0.5 ? M.leaf : M.leafDark));
      crown.position.y = 1.9 * s;
      t.add(crown);
      group.add(at(t, zone, da, r));
    };

    // Sea: water filling its slice beyond a sandy beach, a jetty and two boats; gentle waves.
    const sea = make('sea', 'spread');
    const waterGeo = new THREE.RingGeometry(14, OUT, 64, 6, (ZONES.sea.a - ZONES.sea.w / 2 - 90) * deg, ZONES.sea.w * deg);
    waterGeo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(waterGeo, M.water);
    water.position.y = 0.2;
    water.receiveShadow = true;
    const waterBase = waterGeo.attributes.position.array.slice();
    sea.add(water);
    sea.add(boxIn('sea', 0, 18, 1.3, 0.35, 8, M.white, 0.1)); // jetty
    [[-22, 21], [18, 23]].forEach(([da, r]) => {
      const boat = boxIn('sea', da, r, 1.2, 0.6, 3.2, M.white, 0.2);
      boat.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 1.2), M.glass).translateY(0.85));
      sea.add(boat);
    });

    // Resort & leisure: hotel, pool and beach umbrellas.
    const resort = make('resort', 'rise');
    resort.add(boxIn('resort', 0, 22, 8, 3.2, 3.2, M.white));
    resort.add(boxIn('resort', 0, 22, 6, 2.4, 2.8, M.white, 3.2));
    resort.add(boxIn('resort', 0, 15.5, 5.5, 0.25, 2.6, M.pool, 0.05));
    [-11, -4, 4, 11].forEach((da) => {
      const u = new THREE.Group();
      u.add(shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 6), M.trunk)).translateY(0.8));
      const top = shadowed(new THREE.Mesh(new THREE.ConeGeometry(1, 0.5, 8), M.umbrella));
      top.position.y = 1.7;
      u.add(top);
      resort.add(at(u, 'resort', da, 11.5));
    });

    // Offices & business: glass blocks with floor bands.
    const offices = make('offices', 'rise');
    [[-8, 14, 4, 3.2, 7], [6, 19, 5, 3.6, 10], [-6, 24.5, 5, 3.4, 8]].forEach(([da, r, w, d, h]) => {
      const floorsN = Math.round(h / 1.1);
      for (let f = 0; f < floorsN; f++) {
        offices.add(boxIn('offices', da, r, w, 0.75, d, M.glass, f * 1.1));
        offices.add(boxIn('offices', da, r, w + 0.15, 0.35, d + 0.15, M.white, f * 1.1 + 0.75));
      }
    });

    // City centre: a square with a pavilion, kiosks and low shops around it.
    const centre = make('centre', 'rise');
    centre.add(boxIn('centre', 0, 18, 7, 0.15, 7, M.plaza, 0.02));
    centre.add(boxIn('centre', 0, 18, 2.4, 1.2, 2.4, M.white));
    [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]].forEach(([dx, dz]) => {
      const post = boxIn('centre', 0, 18, 0.45, 2.4, 0.45, M.purple);
      post.position.x += dx * Math.cos(ZONES.centre.a * deg) + dz * Math.sin(ZONES.centre.a * deg);
      post.position.z += -dx * Math.sin(ZONES.centre.a * deg) + dz * Math.cos(ZONES.centre.a * deg);
      centre.add(post);
    });
    [[-11, 12], [11, 12], [-9, 25], [0, 26], [9, 25]].forEach(([da, r]) => centre.add(boxIn('centre', da, r, 3, 2 + rng() * 1.5, 2.6, M.white)));

    // High-rise towers.
    const towers = make('towers', 'rise');
    [[0, 15, 3.6, 24], [-9, 21, 3, 17], [8, 21, 3.2, 27], [0, 25, 2.8, 14], [-5, 12, 2.4, 11]].forEach(([da, r, w, h], i) => {
      towers.add(boxIn('towers', da, r, w, h, w, i % 2 ? M.glass : M.white));
      towers.add(boxIn('towers', da, r, w * 0.55, 1.4, w * 0.55, M.purple, h));
    });

    // Parks & green: lawn, pond and trees.
    const park = make('park', 'grow');
    const pond = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), M.pool);
    pond.rotation.x = -Math.PI / 2;
    const [px, pz] = polar(ZONES.park.a, 19);
    pond.position.set(px, 0.08, pz);
    park.add(pond);
    [[-12, 13], [-4, 12], [6, 13], [12, 15], [-13, 18], [11, 20], [-10, 23], [-2, 24.5], [7, 24.5], [13, 25], [0, 15]].forEach(([da, r]) => tree(park, 'park', da, r, 0.85 + rng() * 0.5));

    // Villas & low-rise: rows of houses with pitched roofs.
    const villas = make('villas', 'rise');
    [12.5, 17, 21.5, 26].forEach((r, row) => {
      const n = row < 2 ? 3 : 4;
      for (let i = 0; i < n; i++) {
        const da = (i - (n - 1) / 2) * (row < 2 ? 9.5 : 7.5);
        const h = 1.5 + rng() * 0.5;
        villas.add(boxIn('villas', da, r, 2.6, h, 2.6, M.white));
        const roof = shadowed(new THREE.Mesh(new THREE.ConeGeometry(2.05, 1.2, 4), M.roof));
        at(roof, 'villas', da, r, h + 0.6);
        roof.rotation.y += Math.PI / 4;
        villas.add(roof);
      }
    });

    // Desert: dunes and a small oasis.
    const desert = make('desert', 'grow');
    [[-8, 16, 4], [7, 21, 5], [-6, 25, 3.5]].forEach(([da, r, rad]) => {
      const d = shadowed(new THREE.Mesh(new THREE.SphereGeometry(rad, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.dune));
      d.scale.y = 0.35;
      desert.add(at(d, 'desert', da, r));
    });
    tree(desert, 'desert', 10, 13, 0.8);
    tree(desert, 'desert', 13, 15, 0.7);

    // Zone labels (HTML), shown when the zone's keyword is chosen.
    const titleOf = {};
    DATA.keywords.forEach((k) => k.scenes.forEach((sc) => { if (!titleOf[sc]) titleOf[sc] = k.title; }));
    const zoneLabels = Object.entries(ZONES).filter(([name]) => titleOf[name]).map(([name, z]) => {
      const el = document.createElement('span');
      el.className = 'kw-zone';
      el.textContent = titleOf[name];
      pinsEl.parentElement.append(el);
      const [x, zz] = polar(z.a, OUT + 3);
      return { name, el, pos: new THREE.Vector3(x, TOP, zz) };
    });

    // Pins: each matching development sits on the zone that best describes it.
    const TOPS = { towers: 28, offices: 11, resort: 7, centre: 4, villas: 4, park: 5, sea: 2, desert: 3 };
    const SCENE_ANCHOR = Object.fromEntries(Object.entries(ZONES).map(([name, z]) => {
      const [x, zz] = polar(z.a, 18);
      return [name, [x, TOPS[name], zz]];
    }));
    const PRIORITY = ['towers', 'resort', 'offices', 'villas', 'park', 'centre', 'sea', 'desert'];
    const scenesOf = Object.fromEntries(DATA.keywords.map((k) => [k.id, k.scenes]));
    let pins = [];

    // ---------- camera framing & resize ----------
    function frame() {
      // Step back on tall/narrow screens so the whole plinth stays in view.
      const aspect = stage.clientWidth / Math.max(1, stage.clientHeight);
      const d = Math.min(230, 138 / Math.min(1, aspect / 1.05));
      const dir = camera.position.clone().sub(controls.target);
      if (dir.lengthSq() < 1) dir.set(RTL ? -0.75 : 0.75, 0.62, 1);
      dir.setLength(d);
      camera.position.copy(controls.target).add(dir);
    }
    function resize() {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      frame();
    }
    new ResizeObserver(resize).observe(stage);
    camera.position.set(RTL ? -46 : 46, 70, 96);
    resize();

    let idleTimer;
    controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(idleTimer); });
    controls.addEventListener('end', () => { if (!reduced) idleTimer = setTimeout(() => { controls.autoRotate = true; }, 5000); });

    // ---------- render loop (only while visible) ----------
    let visible = true;
    let running = false;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) loop(); }, { threshold: 0.05 }).observe(stage);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });
    const clock = new THREE.Clock();
    const v = new THREE.Vector3();
    const easeOut = (x) => 1 - Math.pow(1 - x, 3);

    function loop() {
      if (running) return;
      running = true;
      const tick = () => {
        if (!visible || document.hidden) { running = false; return; }
        const t = clock.getElapsedTime();
        controls.update();

        Object.values(groups).forEach((g) => {
          const u = g.userData;
          u.cur += (u.target - u.cur) * (reduced ? 1 : 0.06);
          if (Math.abs(u.target - u.cur) < 0.002) u.cur = u.target;
          g.visible = u.cur > 0.005;
          const e = easeOut(Math.min(1, Math.max(0.0001, u.cur)));
          if (u.mode === 'rise') g.scale.set(1, e, 1);
          else if (u.mode === 'grow') {
            // Grow each tree/dune in place (keeping its own proportions).
            g.children.forEach((c) => {
              if (!c.userData.base) c.userData.base = c.scale.clone();
              c.scale.copy(c.userData.base).multiplyScalar(e);
            });
          }
          else g.scale.set(e, 1, e);
        });

        Object.entries(floors).forEach(([name, f]) => {
          f.mat.color.lerp(groups[name].userData.target ? f.target : NEUTRAL, reduced ? 1 : 0.08);
        });

        // Gentle waves on the water.
        if (groups.sea.visible && !reduced) {
          const pos = waterGeo.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            const x = waterBase[i * 3];
            const z = waterBase[i * 3 + 2];
            pos.array[i * 3 + 1] = Math.sin(x * 0.45 + t * 1.4) * 0.1 + Math.cos(z * 0.5 + t * 1.1) * 0.08;
          }
          pos.needsUpdate = true;
          waterGeo.computeVertexNormals();
        }

        renderer.render(scene, camera);

        // Pins follow their anchor on screen.
        const w = stage.clientWidth;
        const h = stage.clientHeight;
        zoneLabels.forEach(({ name, el, pos }) => {
          v.copy(pos).project(camera);
          el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -50%)`;
          el.classList.toggle('is-on', groups[name].userData.target === 1 && v.z < 1);
        });
        pins.forEach(({ el, anchor }) => {
          v.copy(anchor).project(camera);
          el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px)`;
          el.style.opacity = v.z < 1 ? '' : '0';
        });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    stage.classList.add('is-ready');
    loop();

    return {
      update(scenes, list) {
        Object.entries(groups).forEach(([name, g]) => { g.userData.target = scenes.has(name) ? 1 : 0; });
        pinsEl.innerHTML = '';
        const used = {};
        pins = list.map((p, i) => {
          const chosen = p.keywords.flatMap((id) => scenesOf[id] || []).filter((sc) => scenes.has(sc));
          const scene = PRIORITY.find((sc) => chosen.includes(sc)) || 'centre';
          const n = used[scene] = (used[scene] || 0) + 1;
          const [x, y, z] = SCENE_ANCHOR[scene];
          const anchor = new THREE.Vector3(x, y + TOP + (n - 1) * 5, z);
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'kw-pin';
          el.dataset.open = p.slug;
          el.style.setProperty('--i', i);
          el.innerHTML = `<span class="kw-pin-dot"></span><span class="kw-pin-label"><img src="${esc(p.photos[0] || '')}" alt=""><b>${esc(p.name)}</b></span>`;
          el.tabIndex = -1; // the list under the model is the keyboard route
          pinsEl.append(el);
          return { el, anchor };
        });
        if (!running) loop();
      },
    };
  }
}
