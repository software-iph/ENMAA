/* ENMAA dashboard — single page app, no build step. */
(() => {
  const app = document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const TYPES = { contact: 'Contact', career: 'Job application', investor: 'Investor interest', project: 'Project enquiry' };
  const STATUSES = { new: 'New', in_progress: 'In progress', replied: 'Replied', archived: 'Archived' };
  const LANGS = [['en', 'English'], ['ar', 'Arabic'], ['it', 'Italian'], ['tr', 'Turkish'], ['zh', 'Chinese']];
  const LANG_LABEL = Object.fromEntries(LANGS);
  const rtl = (l) => (l === 'ar' ? ' dir="rtl" class="ar"' : '');
  // Language tabs: one tab per language, all fields stay in the form (only one language is shown at a time).
  const langTabs = (panels, note = 'Empty fields show the English text on the website.') => `<div class="lang-tabs">
    <div class="lang-tabbar" role="tablist">${LANGS.map(([l, name], i) => `<button type="button" role="tab" data-lt="${l}" class="${i ? '' : 'on'}" aria-selected="${!i}">${name}</button>`).join('')}<span class="muted lang-note">${note}</span></div>
    ${LANGS.map(([l], i) => `<div class="lang-panel" data-lp="${l}"${i ? ' hidden' : ''}>${panels(l)}</div>`).join('')}</div>`;
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lt]');
    if (!b) return;
    const box = b.closest('.lang-tabs');
    box.querySelectorAll(':scope > .lang-tabbar [data-lt]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    box.querySelectorAll(':scope > .lang-panel').forEach((p) => { p.hidden = p.dataset.lp !== b.dataset.lt; });
  });
  let me = null;
  let unread = 0;

  // ---------- api ----------
  async function api(path, opts = {}) {
    const init = { method: opts.method || 'GET', headers: { 'X-Requested-With': 'enmaa-admin' }, credentials: 'same-origin' };
    if (opts.body instanceof FormData) init.body = opts.body;
    else if (opts.body !== undefined) { init.body = JSON.stringify(opts.body); init.headers['Content-Type'] = 'application/json'; }
    const res = await fetch('/admin/api' + path, init);
    if (res.status === 401 && path !== '/login') { me = null; render(); throw new Error('Signed out'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }
  function toast(msg, bad) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'show' + (bad ? ' bad' : '');
    clearTimeout(toast.h);
    toast.h = setTimeout(() => (t.className = ''), 2600);
  }
  const fmtDate = (s) => {
    if (!s) return '';
    const d = new Date(s.length > 10 ? s : s + 'T00:00:00');
    return isNaN(d) ? s : d.toLocaleString('en-GB', s.length > 10 ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const today = () => new Date().toISOString().slice(0, 10);

  // ---------- routing ----------
  window.addEventListener('hashchange', render);
  const route = () => (location.hash.replace(/^#\/?/, '').split('?')[0] || 'overview').split('/');

  async function boot() {
    try { me = await api('/me'); } catch { me = null; }
    render();
  }

  async function render() {
    if (!me) return renderLogin();
    const [page, id] = route();
    try {
      const s = await api('/stats');
      unread = s.totals.unread || 0;
      shell(page);
      const main = $('.main');
      const views = { overview, visitors, inbox, message, projects, project: projectEdit, news, article: newsEdit, vacancies, vacancy: vacancyEdit, settings, account, list: listPage, texts: textsPage, images: pageImages, media: mediaPage };
      await (views[page] || overview)(main, id, s);
      main.focus?.();
    } catch (e) { if (me) toast(e.message, true); }
  }

  function renderLogin() {
    app.innerHTML = `<div class="login"><form id="login">
      <img src="/logos/en-purple.png" alt="ENMAA">
      <h1>Dashboard</h1>
      <label class="f"><span>Username</span><input type="text" name="username" autocomplete="username" required autofocus></label>
      <label class="f"><span>Password</span><input type="password" name="password" autocomplete="current-password" required></label>
      <button class="btn" type="submit" style="width:100%;justify-content:center">Sign in</button>
      <p class="err" role="alert"></p>
    </form></div>`;
    $('#login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        await api('/login', { method: 'POST', body: { username: f.get('username'), password: f.get('password') } });
        me = await api('/me');
        location.hash = '#/overview';
        render();
      } catch (err) { $('.err', e.target).textContent = err.message; }
    });
  }

  // Small line icons for the sidebar and cards.
  const ICONS = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    slides: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 16l5-5 4 4 3-3 6 6"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    handshake: '<path d="M2 12l5-5 5 3 5-3 5 5-5 5-5-3-5 3z"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3"/>',
    news: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="1"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12h18"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    tools: '<path d="M14 7l3-3 3 3-3 3M17 4l-8 8M4 20l5-5M9 15l-3-3 3-3 3 3"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    text: '<path d="M4 6h16M4 12h10M4 18h16"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-6-6-9 9"/>',
    gallery: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="8" cy="8" r="1.5"/>',
    trend: '<path d="M3 20h18"/><path d="M4 16l5-5 4 3 7-8"/><path d="M15 6h5v5"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  };
  const icon = (name) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  // Editable lists shown in the sidebar: kind -> [icon, group]
  const LISTS = {
    hero_slide: ['slides', 'Home'], service: ['layers', 'Home'], value: ['star', 'Home'], partner: ['handshake', 'Home'],
    dev_keyword: ['tag', 'Content'], sector: ['chart', 'Content'], discipline: ['tools', 'Content'], document: ['file', 'Content'], careers_photo: ['camera', 'Content'],
  };
  const LIST_LABELS = {
    hero_slide: 'Hero slides', service: 'What we do', value: 'Values', partner: 'Partner logos',
    dev_keyword: 'Development keywords', sector: 'Investor sectors', discipline: 'Vendor disciplines', document: 'Vendor documents', careers_photo: 'Careers photos',
  };

  function shell(page) {
    const [, sub] = route();
    const active = { message: 'inbox', project: 'projects', article: 'news', vacancy: 'vacancies', list: `list/${sub}` }[page] || page;
    const link = (key, label, ic, extra = '') => `<a href="#/${key}" class="${active === key ? 'on' : ''}">${icon(ic)}<span class="lbl">${label}</span>${extra}</a>`;
    const listLinks = (group) => Object.entries(LISTS).filter(([, [, g]]) => g === group).map(([k, [ic]]) => link(`list/${k}`, LIST_LABELS[k], ic)).join('');
    app.innerHTML = `<div class="mobile-top"><img src="/logos/en-white.png" alt="ENMAA"><button type="button" id="menu">Menu</button></div>
    <div class="shell">
      <aside class="side">
        <div class="brand"><img src="/logos/en-white.png" alt="ENMAA"><small>Dashboard</small></div>
        <nav>
          ${link('overview', 'Overview', 'home')}
          <div class="group">Statistics</div>
          ${link('visitors', 'Visitors', 'trend')}
          <div class="group">Home page</div>
          ${listLinks('Home')}
          <div class="group">Content</div>
          ${link('projects', 'Developments', 'building')}
          ${link('news', 'News', 'news')}
          ${link('vacancies', 'Vacancies', 'briefcase')}
          ${listLinks('Content')}
          <div class="group">Site</div>
          ${link('texts', 'Site texts (EN / AR)', 'text')}
          ${link('images', 'Page images', 'image')}
          ${link('media', 'Media library', 'gallery')}
          ${link('settings', 'Settings', 'gear')}
          <div class="group">Received</div>
          ${link('inbox', 'Messages', 'inbox', unread ? `<span class="badge">${unread}</span>` : '')}
          <div class="group">Account</div>
          ${link('account', 'Users & password', 'user')}
          <a href="/" target="_blank" rel="noopener">${icon('external')}<span class="lbl">View website</span></a>
        </nav>
        <div class="foot">Signed in as <b>${esc(me.username)}</b> · <button type="button" id="logout">Sign out</button></div>
      </aside>
      <main class="main" tabindex="-1"></main>
    </div>`;
    $('#logout').addEventListener('click', async () => { await api('/logout', { method: 'POST' }); me = null; location.hash = ''; render(); });
    $('#menu').addEventListener('click', () => $('.side').classList.toggle('open'));
  }

  // ---------- overview ----------
  async function overview(main, _id, s) {
    const byType = Object.fromEntries(s.byType.map((r) => [r.type, r]));
    const days = [];
    for (let i = 29; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); days.push([d, (s.daily.find((x) => x.day === d) || {}).n || 0]); }
    const max = Math.max(1, ...days.map((d) => d[1]));
    const it = s.content.items || {};
    const tile = (href, n, label, ic) => `<a class="card tile" href="${href}"><div class="n">${n}</div><div class="l">${icon(ic)}${label}</div></a>`;
    main.innerHTML = `<div class="top"><h1>Overview</h1><div class="actions"><a class="btn" href="#/inbox">Open messages</a></div></div>
      <div class="tiles">
        ${tile('#/list/hero_slide', it.hero_slide || 0, 'Hero slides', 'slides')}
        ${tile('#/list/service', it.service || 0, 'What we do', 'layers')}
        ${tile('#/list/value', it.value || 0, 'Values', 'star')}
        ${tile('#/projects', s.content.projects, 'Developments', 'building')}
        ${tile('#/news', s.content.news, 'News', 'news')}
        ${tile('#/vacancies', s.content.vacancies, 'Open vacancies', 'briefcase')}
        ${tile('#/list/sector', it.sector || 0, 'Investor sectors', 'chart')}
        ${tile('#/list/partner', it.partner || 0, 'Partner logos', 'handshake')}
        ${tile('#/media', s.content.media, 'Uploaded files', 'gallery')}
        ${tile('#/texts', s.content.texts, 'Edited texts', 'text')}
      </div>
      <div class="card quick"><h2>Quick actions</h2><div class="row">
        <a class="btn ghost sm" href="#/project/new">${icon('plus')} Add development</a>
        <a class="btn ghost sm" href="#/article/new">${icon('plus')} Add news</a>
        <a class="btn ghost sm" href="#/vacancy/new">${icon('plus')} Add vacancy</a>
        <a class="btn ghost sm" href="#/list/hero_slide">${icon('plus')} Add hero slide</a>
        <a class="btn ghost sm" href="#/media">${icon('plus')} Upload images</a>
        <a class="btn ghost sm" href="#/texts">${icon('text')} Edit site texts</a>
      </div></div>
      <div class="grid g3" style="margin-top:20px">
        <div class="card stat"><a href="#/visitors?period=today"><div class="n">${s.visits?.today || 0}</div><div class="l">Visitors today</div></a></div>
        <div class="card stat"><a href="#/visitors?period=7"><div class="n">${s.visits?.week || 0}</div><div class="l">Visitors, last 7 days</div></a></div>
        <div class="card stat"><a href="#/inbox?status=new"><div class="n">${s.totals.unread || 0}</div><div class="l">New messages</div></a></div>
        <div class="card stat"><div class="n">${s.totals.week || 0}</div><div class="l">Received in the last 7 days</div></div>
        <div class="card stat"><div class="n">${s.totals.total || 0}</div><div class="l">All messages</div></div>
        <div class="card stat"><div class="n">${s.content.vacancies}</div><div class="l">Open vacancies</div></div>
      </div>
      <div class="grid g2" style="margin-top:20px">
        <div class="card"><h2>Messages by form</h2>
          <table><thead><tr><th>Form</th><th>New</th><th>Total</th></tr></thead><tbody>
          ${Object.entries(TYPES).map(([k, l]) => `<tr data-go="#/inbox?type=${k}"><td>${l}</td><td>${byType[k]?.unread || 0}</td><td>${byType[k]?.total || 0}</td></tr>`).join('')}
          </tbody></table></div>
        <div class="card"><h2>Messages, last 30 days</h2>
          <div class="bars" role="img" aria-label="Messages per day over the last 30 days">${days.map(([d, n]) => `<div style="height:${(n / max) * 100}%" title="${fmtDate(d)}: ${n}"></div>`).join('')}</div>
          <div class="bars-axis"><span>${fmtDate(days[0][0])}</span><span>Today</span></div></div>
      </div>
      <div class="card" style="margin-top:20px"><h2>Latest messages</h2>
        ${s.recent.length ? `<table><tbody>${s.recent.map((r) => `<tr class="${r.status === 'new' ? 'unread' : ''}" data-go="#/message/${r.id}">
          <td><span class="pill type">${TYPES[r.type] || r.type}</span></td><td>${esc(r.name)}</td><td class="clip">${esc(r.subject)}</td><td class="nowrap muted">${fmtDate(r.created_at)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No messages yet. Website form submissions will appear here.</p>'}
      </div>`;
    bindRowLinks(main);
  }
  function bindRowLinks(root) {
    $$('[data-go]', root).forEach((tr) => tr.addEventListener('click', (e) => { if (!e.target.closest('input,button,a')) location.hash = tr.dataset.go; }));
  }

  // ---------- visitors (statistics) ----------
  const DEVICE_NAMES = { desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet' };
  const LANG_NAMES = LANG_LABEL;
  const shortDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const longDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const plusDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const num = (n, dp = 0) => Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: dp, minimumFractionDigits: 0 });
  function periodRange(p) {
    const t = today();
    const [y, m] = t.split('-').map(Number);
    const first = (yy, mm) => `${yy}-${String(mm).padStart(2, '0')}-01`;
    switch (p) {
      case 'today': return [t, t];
      case '7': return [plusDays(t, -6), t];
      case '90': return [plusDays(t, -89), t];
      case 'month': return [first(y, m), t];
      case 'lastmonth': { const ly = m === 1 ? y - 1 : y; const lm = m === 1 ? 12 : m - 1; return [first(ly, lm), plusDays(first(y, m), -1)]; }
      case 'year': return [`${y}-01-01`, t];
      default: return [plusDays(t, -29), t];
    }
  }
  const PERIODS = [['today', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['month', 'This month'], ['lastmonth', 'Last month'], ['year', 'This year'], ['custom', 'Custom']];

  async function visitors(main) {
    const qp = hashQuery();
    const period = qp.get('period') || (qp.get('from') ? 'custom' : '30');
    const [from, to] = period === 'custom' ? [qp.get('from') || periodRange('30')[0], qp.get('to') || today()] : periodRange(period);
    const filt = { from, to, page: qp.get('page') || '', device: qp.get('device') || '', lang: qp.get('lang') || '', source: qp.get('source') || '' };
    const query = new URLSearchParams(Object.entries(filt).filter(([, v]) => v)).toString();
    const r = await api('/visitors?' + query);
    const asTable = qp.get('view') === 'table';

    const go = (changes) => {
      const p = hashQuery();
      Object.entries(changes).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
      location.hash = '#/visitors' + (p.toString() ? '?' + p : '');
    };
    const sel = (name, opts, cur) => `<select data-f="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const pageOpts = [['', 'All pages'], ...r.options.pages.map((p) => [p.path, p.label])];
    if (filt.page && !pageOpts.some(([v]) => v === filt.page)) pageOpts.push([filt.page, filt.page]);
    const srcOpts = [['', 'All sources'], ...r.options.sources.map((s) => [s, s])];
    if (filt.source && !srcOpts.some(([v]) => v === filt.source)) srcOpts.push([filt.source, filt.source]);
    const T = r.totals;
    const any = r.days.some((d) => d.views);

    // bar list with a light bar behind the label (click = filter)
    const barList = (rows, key, labelOf, cols, filterKey) => {
      const max = Math.max(1, ...rows.map((x) => x.visitors));
      return rows.length ? `<div class="vlist" style="--cols:${cols.length}">
        <div class="vlist-head"><span></span>${cols.map((c) => `<span>${c[0]}</span>`).join('')}</div>
        ${rows.map((x) => `<button type="button" class="vrow${filt[filterKey] === x[key] ? ' on' : ''}" data-filter="${filterKey}" data-value="${esc(x[key])}" title="Click to show only: ${esc(labelOf(x))}">
          <span class="vbar"><i style="width:${Math.max(2, (x.visitors / max) * 100)}%"></i><b>${esc(labelOf(x))}</b></span>
          ${cols.map((c) => `<span class="vnum${c[2] ? ' soft' : ''}">${num(x[c[1]])}</span>`).join('')}</button>`).join('')}
      </div>` : '<p class="muted">No visits for this selection yet.</p>';
    };

    main.innerHTML = `<div class="top"><div><div class="muted" style="font-size:12px">Statistics</div><h1>Visitors</h1></div></div>
      <p class="muted vintro">How many people visit the website. Counted without cookies: each person counts once per day, and no personal data (like IP addresses) is stored. Bots and search-engine crawlers are not counted.</p>
      <div class="card vfilters">
        <label class="f"><span>Period</span>${sel('period', PERIODS, period)}</label>
        <label class="f"><span>From</span><input type="date" data-f="from" value="${from}" max="${today()}"></label>
        <label class="f"><span>To</span><input type="date" data-f="to" value="${to}" max="${today()}"></label>
        <label class="f"><span>Page</span>${sel('page', pageOpts, filt.page)}</label>
        <label class="f"><span>Device</span>${sel('device', [['', 'All devices'], ['desktop', 'Desktop'], ['mobile', 'Mobile'], ['tablet', 'Tablet']], filt.device)}</label>
        <label class="f"><span>Language</span>${sel('lang', [['', 'All'], ...LANGS], filt.lang)}</label>
        <label class="f"><span>Came from</span>${sel('source', srcOpts, filt.source)}</label>
        <div class="vfilters-end">${filt.page || filt.device || filt.lang || filt.source ? '<button type="button" class="btn ghost sm" id="vclear">Clear filters</button>' : ''}
          <a class="btn ghost sm" href="/admin/api/visitors.csv?${query}">${icon('download')} CSV</a></div>
      </div>
      <div class="vstats">
        <div class="card stat"><div class="n">${num(T.visitors)}</div><div class="l">Visitors</div></div>
        <div class="card stat"><div class="n">${num(T.views)}</div><div class="l">Page views</div></div>
        <div class="card stat"><div class="n">${num(T.perDay, T.perDay < 10 ? 1 : 0)}</div><div class="l">Average visitors per day</div></div>
        <div class="card stat"><div class="n">${num(T.pagesPerVisitor, 1)}</div><div class="l">Pages per visitor</div></div>
        <div class="card stat"><div class="n">${T.busiest ? num(T.busiest.visitors) : '–'}</div><div class="l">Busiest day${T.busiest ? ' · ' + shortDay(T.busiest.day) : ''}</div></div>
      </div>
      <div class="card vchart-card">
        <div class="vchart-head"><h3>Visitors per day <span class="muted">${shortDay(r.from)} ${r.from.slice(0, 4) !== r.to.slice(0, 4) ? r.from.slice(0, 4) + ' ' : ''}– ${shortDay(r.to)} ${r.to.slice(0, 4)}</span></h3>
          <button type="button" class="btn ghost sm" id="vview">${asTable ? 'Show as chart' : 'Show as table'}</button></div>
        ${asTable ? `<div class="vtable"><table><thead><tr><th>Date</th><th>Visitors</th><th>Page views</th></tr></thead><tbody>
          ${r.days.slice().reverse().map((d) => `<tr><td>${longDay(d.day)}</td><td>${num(d.visitors)}</td><td>${num(d.views)}</td></tr>`).join('')}</tbody></table></div>`
          : `<div class="vchart" id="vchart"></div>${any ? '' : '<p class="muted vnone">No visits in this period yet. Visits are counted from now on as people open the website.</p>'}`}
      </div>
      <div class="grid g2 vlists">
        <div class="card"><h3>Most visited pages</h3>${barList(r.pages, 'path', (x) => x.label, [['Visitors', 'visitors'], ['Views', 'views', true]], 'page')}</div>
        <div class="card"><h3>Where visitors came from</h3>${barList(r.sources, 'source', (x) => x.source, [['Visitors', 'visitors']], 'source')}</div>
        <div class="card"><h3>Devices</h3>${barList(r.devices, 'key', (x) => DEVICE_NAMES[x.key] || x.key, [['Visitors', 'visitors']], 'device')}</div>
        <div class="card"><h3>Languages</h3>${barList(r.langs, 'key', (x) => LANG_NAMES[x.key] || x.key, [['Visitors', 'visitors']], 'lang')}</div>
      </div>`;

    // filters
    $$('[data-f]', main).forEach((el) => el.addEventListener('change', () => {
      const f = el.dataset.f;
      if (f === 'period') return go({ period: el.value === 'custom' ? 'custom' : el.value, from: el.value === 'custom' ? from : '', to: el.value === 'custom' ? to : '' });
      if (f === 'from' || f === 'to') return go({ period: 'custom', from: f === 'from' ? el.value : from, to: f === 'to' ? el.value : to });
      go({ [f]: el.value });
    }));
    $$('[data-filter]', main).forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.filter;
      go({ [k]: filt[k] === b.dataset.value ? '' : b.dataset.value });
    }));
    $('#vclear')?.addEventListener('click', () => go({ page: '', device: '', lang: '', source: '' }));
    $('#vview').addEventListener('click', () => go({ view: asTable ? '' : 'table' }));
    if (!asTable) drawVisitorChart($('#vchart'), r.days);
  }

  // Bar chart: visitors per day, with a tooltip on hover/tap.
  function drawVisitorChart(box, days) {
    const draw = () => {
      const W = Math.max(320, box.clientWidth);
      const H = 260;
      const pad = { l: 44, r: 8, t: 12, b: 30 };
      const iw = W - pad.l - pad.r;
      const ih = H - pad.t - pad.b;
      const maxV = Math.max(...days.map((d) => d.visitors), 0);
      const nice = (v) => { if (v <= 4) return 4; const p = 10 ** Math.floor(Math.log10(v)); const m = [1, 2, 2.5, 5, 10].find((x) => x * p >= v); return m * p; };
      const top = nice(maxV);
      const step = iw / days.length;
      const bw = Math.max(2, Math.min(36, step * 0.72));
      const y = (v) => pad.t + ih - (v / top) * ih;
      const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
      const every = Math.max(1, Math.ceil(days.length / Math.floor(iw / 74)));
      box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Visitors per day">
        ${ticks.map((v) => `<g><line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" class="vgrid"/><text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end" class="vtick">${num(v)}</text></g>`).join('')}
        ${days.map((d, i) => {
          const x = pad.l + i * step;
          const h = Math.max(d.visitors ? 2 : 0, ih - (y(d.visitors) - pad.t));
          return `<g class="vday" data-i="${i}"><rect class="vhit" x="${x}" y="${pad.t}" width="${step}" height="${ih}"/>
            <rect class="vbarr" x="${x + (step - bw) / 2}" y="${pad.t + ih - h}" width="${bw}" height="${h}" rx="2"/>
            ${i % every === 0 ? `<text x="${x + step / 2}" y="${H - 8}" text-anchor="middle" class="vtick">${shortDay(d.day)}</text>` : ''}</g>`;
        }).join('')}
      </svg><div class="vtip" hidden></div>`;
      const tip = $('.vtip', box);
      $$('.vday', box).forEach((g) => {
        const show = () => {
          $$('.vday.on', box).forEach((x) => x.classList.remove('on'));
          g.classList.add('on');
          const d = days[Number(g.dataset.i)];
          tip.innerHTML = `<b>${longDay(d.day)}</b><span>${num(d.visitors)} visitor${d.visitors === 1 ? '' : 's'}</span><span class="soft">${num(d.views)} page view${d.views === 1 ? '' : 's'}</span>`;
          tip.hidden = false;
          const x = pad.l + (Number(g.dataset.i) + 0.5) * step;
          tip.style.left = Math.min(Math.max(x, 80), W - 80) + 'px';
          tip.style.top = Math.max(0, y(d.visitors) - 8) + 'px';
        };
        g.addEventListener('mouseenter', show);
        g.addEventListener('click', show);
      });
      box.addEventListener('mouseleave', () => { tip.hidden = true; $$('.vday.on', box).forEach((x) => x.classList.remove('on')); });
    };
    draw();
    let t;
    const onResize = () => { clearTimeout(t); t = setTimeout(() => { if (document.body.contains(box)) draw(); else window.removeEventListener('resize', onResize); }, 150); };
    window.addEventListener('resize', onResize);
  }

  // ---------- inbox ----------
  function hashQuery() { return new URLSearchParams(location.hash.split('?')[1] || ''); }

  async function inbox(main) {
    const q = hashQuery();
    const state = { type: q.get('type') || '', status: q.get('status') || '', q: q.get('q') || '' };
    main.innerHTML = `<div class="top"><h1>Messages</h1><div class="actions"><a class="btn ghost" id="csv" href="#">Export CSV</a></div></div>
      <div class="tabsbar" role="tablist">${[['', 'All forms'], ...Object.entries(TYPES)].map(([k, l]) => `<button type="button" role="tab" data-type="${k}" class="${state.type === k ? 'on' : ''}" aria-selected="${state.type === k}">${l}</button>`).join('')}</div>
      <div class="filters">
        <input type="search" id="q" placeholder="Search name, email, subject, message…" value="${esc(state.q)}" aria-label="Search messages">
        <select id="status" aria-label="Status"><option value="">Open (not archived)</option>${Object.entries(STATUSES).map(([k, l]) => `<option value="${k}"${state.status === k ? ' selected' : ''}>${l}</option>`).join('')}<option value="all"${state.status === 'all' ? ' selected' : ''}>All, including archived</option></select>
      </div>
      <div class="bulk" hidden><span id="selcount"></span>
        <select id="bulkAction" aria-label="Bulk action"><option value="">Choose action…</option>${Object.entries(STATUSES).map(([k, l]) => `<option value="${k}">Mark as ${l.toLowerCase()}</option>`).join('')}<option value="delete">Delete</option></select>
        <button class="btn sm" id="bulkGo" type="button">Apply</button></div>
      <div id="list"></div>`;

    const go = () => {
      const p = new URLSearchParams();
      if (state.type) p.set('type', state.type);
      if (state.status) p.set('status', state.status);
      if (state.q) p.set('q', state.q);
      history.replaceState(null, '', '#/inbox' + (p.toString() ? '?' + p : ''));
      load();
    };
    $$('[data-type]', main).forEach((b) => b.addEventListener('click', () => { state.type = b.dataset.type; $$('[data-type]', main).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); go(); }));
    $('#status').addEventListener('change', (e) => { state.status = e.target.value; go(); });
    let tmr;
    $('#q').addEventListener('input', (e) => { clearTimeout(tmr); tmr = setTimeout(() => { state.q = e.target.value.trim(); go(); }, 250); });
    $('#csv').addEventListener('click', (e) => {
      e.preventDefault();
      const p = new URLSearchParams();
      if (state.type) p.set('type', state.type);
      if (state.status && state.status !== 'all') p.set('status', state.status);
      if (state.q) p.set('q', state.q);
      location.href = '/admin/api/submissions.csv?' + p;
    });

    async function load() {
      const p = new URLSearchParams();
      if (state.type) p.set('type', state.type);
      if (state.status === 'all') p.set('all', '1'); else if (state.status) p.set('status', state.status);
      if (state.q) p.set('q', state.q);
      const rows = await api('/submissions?' + p);
      const list = $('#list');
      if (!rows.length) { list.innerHTML = '<div class="empty">No messages match these filters.</div>'; updateBulk(); return; }
      list.innerHTML = `<div class="table-wrap"><table><thead><tr>
        <th><input type="checkbox" id="all" aria-label="Select all"></th><th>Received</th><th>Form</th><th>Name</th><th>Email</th><th>Subject</th><th>Status</th></tr></thead><tbody>
        ${rows.map((r) => `<tr class="${r.status === 'new' ? 'unread' : ''}" data-go="#/message/${r.id}">
          <td><input type="checkbox" class="sel" value="${r.id}" aria-label="Select message from ${esc(r.name)}"></td>
          <td class="nowrap">${fmtDate(r.created_at)}</td><td><span class="pill type">${TYPES[r.type] || r.type}</span></td>
          <td>${esc(r.name)}</td><td>${esc(r.email)}</td><td class="clip">${esc(r.subject || r.message)}</td>
          <td><span class="pill ${r.status}">${STATUSES[r.status]}</span></td></tr>`).join('')}
        </tbody></table></div>`;
      bindRowLinks(list);
      $('#all').addEventListener('change', (e) => { $$('.sel').forEach((c) => (c.checked = e.target.checked)); updateBulk(); });
      $$('.sel').forEach((c) => c.addEventListener('change', updateBulk));
      updateBulk();
    }
    function updateBulk() {
      const ids = $$('.sel:checked').map((c) => Number(c.value));
      $('.bulk').hidden = !ids.length;
      $('#selcount').textContent = `${ids.length} selected`;
      return ids;
    }
    $('#bulkGo').addEventListener('click', async () => {
      const ids = updateBulk();
      const action = $('#bulkAction').value;
      if (!action) return toast('Choose an action first.', true);
      if (action === 'delete' && !confirm(`Delete ${ids.length} message(s) permanently? Attached CVs are deleted too.`)) return;
      await api('/submissions/bulk', { method: 'POST', body: { ids, action } });
      toast('Updated');
      render();
    });
    await load();
  }

  async function message(main, id) {
    const m = await api('/submissions/' + id);
    if (m.status === 'new') { await api('/submissions/' + id, { method: 'PATCH', body: { status: 'in_progress' } }); m.status = 'in_progress'; }
    const d = m.data || {};
    const rows = [
      ['Form', TYPES[m.type] || m.type], ['Received', fmtDate(m.created_at)], ['Name', m.name],
      ['Email', m.email ? `<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : '', true],
      ['Phone', m.phone], ['Organisation', m.organisation], ['Country', m.country],
      [m.type === 'career' ? 'Position' : m.type === 'project' ? 'Development' : 'Subject', m.subject],
      ['Sector', d.sector], ['Investment range', d.investment_range], ['Preferred language', d.preferred_language],
      ['Website language', LANG_LABEL[m.lang] || m.lang],
    ].filter((r) => r[1]);
    const replySubject = encodeURIComponent(`Re: ${m.subject || 'Your message to ENMAA'}`);
    main.innerHTML = `<div class="top"><h1>${esc(m.name || 'Message')}</h1><div class="actions">
        <a class="btn ghost" href="#/inbox">← Back to messages</a>
        ${m.email ? `<a class="btn" href="mailto:${esc(m.email)}?subject=${replySubject}" id="reply">Reply by email</a>` : ''}
      </div></div>
      <div class="detail">
        <div class="card">
          <dl class="kv">${rows.map(([k, v, raw]) => `<dt>${k}</dt><dd>${raw ? v : esc(v)}</dd>`).join('')}</dl>
          ${m.message ? `<div class="msg">${esc(m.message)}</div>` : ''}
          ${m.file_path ? `<p style="margin-top:16px"><a class="btn ghost" href="/admin/api/submissions/${m.id}/file">Download CV — ${esc(m.file_name)}</a></p>` : ''}
        </div>
        <div>
          <div class="card"><h2>Status</h2><div class="status-btns">${Object.entries(STATUSES).map(([k, l]) => `<button type="button" data-status="${k}" class="${m.status === k ? 'on' : ''}" aria-pressed="${m.status === k}">${l}</button>`).join('')}</div></div>
          <div class="card"><h2>Internal notes</h2><textarea id="notes" rows="6" aria-label="Internal notes">${esc(m.notes)}</textarea>
            <div class="row" style="margin-top:10px"><button class="btn sm" id="saveNotes" type="button">Save notes</button></div></div>
          <div class="card"><h2>Delete</h2><p class="muted">Removes this message${m.file_path ? ' and the attached CV' : ''} permanently.</p><button class="btn danger sm" id="del" type="button">Delete message</button></div>
        </div>
      </div>`;
    $$('[data-status]', main).forEach((b) => b.addEventListener('click', async () => {
      await api('/submissions/' + id, { method: 'PATCH', body: { status: b.dataset.status } });
      $$('[data-status]', main).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      toast('Status: ' + STATUSES[b.dataset.status]);
    }));
    $('#reply')?.addEventListener('click', () => { if (m.status !== 'replied') api('/submissions/' + id, { method: 'PATCH', body: { status: 'replied' } }).then(() => { $$('[data-status]', main).forEach((x) => x.classList.toggle('on', x.dataset.status === 'replied')); }); });
    $('#saveNotes').addEventListener('click', async () => { await api('/submissions/' + id, { method: 'PATCH', body: { notes: $('#notes').value } }); toast('Notes saved'); });
    $('#del').addEventListener('click', async () => {
      if (!confirm('Delete this message permanently?')) return;
      await api('/submissions/' + id, { method: 'DELETE' });
      toast('Message deleted');
      location.hash = '#/inbox';
    });
  }

  // ---------- editor helpers ----------
  const val = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o) ?? '';
  function tfield(obj, lang, key, label, type = 'text') {
    const v = esc(val(obj, `t.${lang}.${key}`));
    const dir = rtl(lang);
    return `<label class="f"><span>${label}</span>${type === 'textarea'
      ? `<textarea data-t="${lang}.${key}" rows="6"${dir}>${v}</textarea>`
      : `<input type="text" data-t="${lang}.${key}" value="${v}"${dir}>`}</label>`;
  }
  function langCols(obj, fields) {
    return langTabs((l) => fields.map(([k, label, type]) => tfield(obj, l, k, label, type)).join(''));
  }
  function readT(root) {
    const t = {};
    $$('[data-t]', root).forEach((el) => {
      if (el.closest('[data-skip-t]')) return;
      const [l, k] = el.dataset.t.split('.');
      (t[l] = t[l] || {})[k] = el.value.trim();
    });
    return t;
  }
  async function uploadFile(file) {
    const fd = new FormData();
    fd.append('file', file);
    const r = await api('/upload', { method: 'POST', body: fd });
    return r.url;
  }
  function imagePicker(name, url, accept = 'image/*') {
    const isPdf = accept.includes('pdf');
    return `<div class="img-pick" data-picker="${name}">
      ${isPdf ? '' : `<img src="${esc(url) || ''}" alt="" ${url ? '' : 'style="visibility:hidden"'}>`}
      <div class="grow"><input type="text" data-field="${name}" value="${esc(url)}" placeholder="${isPdf ? '/uploads/files/…pdf' : '/uploads/images/…jpg'}">
      <div class="row" style="margin-top:6px"><label class="btn ghost sm">Upload…<input type="file" accept="${accept}" hidden></label>${isPdf ? '' : '<button type="button" class="btn ghost sm" data-library>Choose from library</button>'}${isPdf && url ? `<a href="${esc(url)}" target="_blank" rel="noopener">Open</a>` : ''}</div></div>
    </div>`;
  }

  // Media library chooser (modal). Resolves with the chosen URL, or null.
  async function chooseImage() {
    const { uploaded, builtIn } = await api('/media');
    const imgs = [...uploaded.filter((m) => !/\.pdf$/i.test(m.url)), ...builtIn];
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'modal';
      wrap.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-label="Choose an image">
        <div class="top"><h1>Choose an image</h1><div class="actions">
          <label class="btn sm">Upload new…<input type="file" accept="image/*" multiple hidden></label>
          <button type="button" class="btn ghost sm" data-close>Cancel</button></div></div>
        <div class="lib-grid">${imgs.map((m) => `<button type="button" class="lib-item" data-url="${esc(m.url)}"><img src="${esc(m.url)}" alt="" loading="lazy"><span>${esc(m.name || '')}</span></button>`).join('')}</div>
      </div>`;
      document.body.append(wrap);
      const done = (v) => { wrap.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
      const onKey = (e) => { if (e.key === 'Escape') done(null); };
      document.addEventListener('keydown', onKey);
      wrap.addEventListener('click', (e) => {
        if (e.target === wrap || e.target.closest('[data-close]')) return done(null);
        const b = e.target.closest('[data-url]');
        if (b) done(b.dataset.url);
      });
      $('input[type=file]', wrap).addEventListener('change', async (e) => {
        try {
          const urls = await uploadFiles(e.target.files);
          toast('Uploaded');
          done(urls[0]);
        } catch (err) { toast(err.message, true); }
      });
      $('.lib-item', wrap)?.focus();
    });
  }
  async function uploadFiles(files) {
    const fd = new FormData();
    [...files].forEach((f) => fd.append('file', f));
    const r = await api('/upload', { method: 'POST', body: fd });
    return r.urls;
  }

  function bindPickers(root) {
    $$('[data-picker]', root).forEach((p) => {
      const input = $('input[type=text]', p);
      const img = $('img', p);
      const sync = () => { if (img) { img.src = input.value; img.style.visibility = input.value ? '' : 'hidden'; } };
      input.addEventListener('change', sync);
      $('[data-library]', p)?.addEventListener('click', async () => {
        const url = await chooseImage();
        if (url) { input.value = url; sync(); input.dispatchEvent(new Event('change')); }
      });
      $('input[type=file]', p).addEventListener('change', async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        try { input.value = await uploadFile(f); sync(); toast('Uploaded'); } catch (err) { toast(err.message, true); }
        e.target.value = '';
      });
    });
  }
  const fieldVal = (root, name) => $(`[data-field="${name}"]`, root)?.value.trim() ?? '';

  // ---------- editable lists (hero slides, what we do, values, partners, sectors, ...) ----------
  const SCENE_OPTIONS = [
    ['sea', 'Sea & beach'], ['centre', 'City centre — streets & plaza'], ['park', 'Parks & trees'], ['towers', 'High-rise towers'],
    ['villas', 'Villas & low-rise houses'], ['resort', 'Resort — hotel, pool & umbrellas'], ['offices', 'Office buildings'], ['desert', 'Desert dunes'],
  ];
  const LIST_HELP = {
    hero_slide: 'The home page slideshow. Each slide has a photo and the label shown in the tabs at the bottom of the hero.',
    service: 'The expanding panels in “What we do” on the home page.',
    value: 'The values list on the home page. The photo shows when the value is highlighted.',
    partner: 'Logos in the “Working with” strip on the home page. The strip is hidden until you add a logo. Use approved logos only (PNG or JPG).',
    dev_keyword: 'The keyword buttons on “Our Developments”. Each keyword shows one or more elements in the 3D model (sea, towers, villas…). Tick the keywords on each development under Developments → edit; a development appears when it has every keyword a visitor picks.',
    careers_photo: 'The photo strip under “Our Commitment” on the Careers page.',
    sector: 'The opportunity sectors on the Investors page. They also fill the “Sector of interest” list in the Register Interest form.',
    discipline: 'The “Who can register” cards on the Vendors page.',
    document: 'The “Prepare before you start” checklist on the Vendors page.',
  };
  async function listPage(main, kind) {
    const data = await api('/items/' + kind);
    const has = (f) => data.fields.includes(f);
    const label = LIST_LABELS[kind] || data.label;
    const textFields = [has('title') && ['title', kind === 'partner' ? 'Name' : 'Title'], has('text') && ['text', 'Text', 'textarea']].filter(Boolean);
    const editor = (it) => `<form class="card item-ed" data-id="${it.id || ''}">
      <div class="item-head">
        ${has('image') ? `<img class="thumb" src="${esc(it.image || '')}" alt="">` : ''}
        <div class="grow"><b>${esc(it.t?.en?.title || (it.id ? `Item ${it.id}` : 'New item'))}</b>${it.t?.ar?.title ? `<br><span class="muted ar" dir="rtl">${esc(it.t.ar.title)}</span>` : ''}</div>
        ${it.id ? `<span class="pill ${it.active ? 'on' : 'off'}">${it.active ? 'Shown' : 'Hidden'}</span>
        <button type="button" class="btn ghost sm" data-move="-1" aria-label="Move up">↑</button>
        <button type="button" class="btn ghost sm" data-move="1" aria-label="Move down">↓</button>` : ''}
        <button type="button" class="btn ghost sm" data-toggle>${it.id ? 'Edit' : 'Close'}</button>
      </div>
      <div class="item-body"${it.id ? ' hidden' : ''}>
        ${has('image') ? `<label class="f"><span>${kind === 'partner' ? 'Logo' : 'Photo'}</span>${imagePicker('image', it.image || '')}</label>` : ''}
        ${textFields.length ? langCols(it, textFields) : ''}
        ${has('scene') ? (() => {
          const on = new Set(it.extra?.scenes?.length ? it.extra.scenes : [it.extra?.scene || 'centre']);
          return `<div class="f" style="margin-bottom:16px"><span>3D elements shown when this keyword is chosen <span class="muted">(tick one or more)</span></span>
            <div class="cat-picks">${SCENE_OPTIONS.map(([v, l]) => `<label class="cat-pick"><input type="checkbox" data-scene="${v}"${on.has(v) ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div></div>`;
        })() : ''}
        ${has('link') ? `<label class="f"><span>Link (optional)</span><input type="url" data-field="link" value="${esc(it.link || '')}" placeholder="https://"></label>` : ''}
        <label class="chk"><input type="checkbox" data-field="active" ${it.active !== false ? 'checked' : ''}> Show on the website</label>
        <div class="row" style="margin-top:14px"><button class="btn" type="submit">Save</button>${it.id ? '<button class="btn danger" type="button" data-del>Delete</button>' : ''}<span class="err" role="alert"></span></div>
      </div>
    </form>`;
    main.innerHTML = `<div class="top"><h1>${esc(label)}</h1><div class="actions"><button class="btn" type="button" id="addItem">${icon('plus')} Add</button></div></div>
      <p class="muted">${esc(LIST_HELP[kind] || '')} Use ↑ ↓ to change the order.</p>
      <div id="newItem"></div>
      <div class="list-items">${data.items.length ? data.items.map(editor).join('') : '<div class="empty">Nothing here yet. Click “Add”.</div>'}</div>`;

    const wire = (form) => {
      bindPickers(form);
      const body = $('.item-body', form);
      $('[data-toggle]', form).addEventListener('click', () => {
        if (!form.dataset.id) { form.remove(); return; }
        body.hidden = !body.hidden;
        $('[data-toggle]', form).textContent = body.hidden ? 'Edit' : 'Close';
      });
      $$('[data-move]', form).forEach((b) => b.addEventListener('click', async () => {
        const ids = data.items.map((x) => x.id);
        const i = ids.indexOf(Number(form.dataset.id));
        const j = i + Number(b.dataset.move);
        if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        await api(`/items/${kind}/order`, { method: 'POST', body: { ids } });
        render();
      }));
      $('[data-del]', form)?.addEventListener('click', async () => {
        if (!confirm('Delete this item from the website?')) return;
        await api(`/items/${kind}/${form.dataset.id}`, { method: 'DELETE' });
        toast('Deleted');
        render();
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const scenes = $$('[data-scene]', form).filter((c) => c.checked).map((c) => c.dataset.scene);
        const body = { t: readT(form), image: fieldVal(form, 'image'), link: fieldVal(form, 'link'), scenes, active: $('[data-field=active]', form).checked };
        if (has('scene') && !scenes.length) { $('.err', form).textContent = 'Tick at least one 3D element.'; return; }
        if (has('image') && !body.image) { $('.err', form).textContent = 'Choose a photo first.'; return; }
        try {
          await api(form.dataset.id ? `/items/${kind}/${form.dataset.id}` : `/items/${kind}`, { method: form.dataset.id ? 'PUT' : 'POST', body });
          toast('Saved — live on the website');
          render();
        } catch (err) { $('.err', form).textContent = err.message; }
      });
    };
    $$('.item-ed', main).forEach(wire);
    $('#addItem').addEventListener('click', () => {
      const holder = $('#newItem');
      if (holder.children.length) return;
      holder.innerHTML = editor({ t: {}, active: true });
      wire(holder.firstElementChild);
    });
  }

  // ---------- site texts ----------
  async function textsPage(main) {
    const groups = await api('/texts');
    const q = hashQuery();
    let current = q.get('g') || groups[0].name;
    const human = (k) => k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
    main.innerHTML = `<div class="top"><h1>Site texts</h1><div class="actions"><button class="btn" type="button" id="saveTexts">Save changes</button></div></div>
      <p class="muted">Every heading, button, label and message on the website, in all five languages. Leave a field empty to use the original wording (shown in grey). Development, news and vacancy texts are edited on their own pages.</p>
      <div class="tabsbar">${groups.map((g) => `<button type="button" data-g="${esc(g.name)}" class="${g.name === current ? 'on' : ''}">${esc(g.name)} <span class="muted">${g.items.length}</span></button>`).join('')}</div>
      <div class="filters"><input type="search" id="tq" placeholder="Search texts…" aria-label="Search texts"></div>
      <div id="tlist"></div>`;
    const dirty = {};
    const draw = () => {
      const term = $('#tq').value.trim().toLowerCase();
      const items = term
        ? groups.flatMap((g) => g.items).filter((i) => [i.key, ...Object.values(i.default), ...Object.values(i.value)].join(' ').toLowerCase().includes(term))
        : groups.find((g) => g.name === current).items;
      $('#tlist').innerHTML = items.length ? items.map((i) => {
        const v = dirty[i.key] || i.value;
        const long = (i.default.en || '').length > 70;
        const ctl = (lang) => long
          ? `<textarea data-k="${esc(i.key)}" data-l="${lang}" rows="3" placeholder="${esc(i.default[lang] || i.default.en)}"${rtl(lang)}>${esc(v[lang])}</textarea>`
          : `<input type="text" data-k="${esc(i.key)}" data-l="${lang}" value="${esc(v[lang] || '')}" placeholder="${esc(i.default[lang] || i.default.en)}"${rtl(lang)}>`;
        const edited = Object.values(i.value).some(Boolean);
        return `<div class="text-row${edited ? ' edited' : ''}"><div class="text-key">${esc(human(i.key))}${edited ? ' <span class="pill on">edited</span>' : ''}</div>
          <div class="lang-grid">${LANGS.map(([l, name]) => `<label class="f"><span>${name}</span>${ctl(l)}</label>`).join('')}</div></div>`;
      }).join('') : '<div class="empty">No texts match.</div>';
      $$('[data-k]', main).forEach((el) => el.addEventListener('input', () => {
        const k = el.dataset.k;
        const base = groups.flatMap((g) => g.items).find((x) => x.key === k).value;
        dirty[k] = { ...(dirty[k] || base), [el.dataset.l]: el.value };
      }));
    };
    $$('[data-g]', main).forEach((b) => b.addEventListener('click', () => {
      current = b.dataset.g;
      $$('[data-g]', main).forEach((x) => x.classList.toggle('on', x === b));
      $('#tq').value = '';
      history.replaceState(null, '', '#/texts?g=' + encodeURIComponent(current));
      draw();
    }));
    let tmr;
    $('#tq').addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(draw, 200); });
    $('#saveTexts').addEventListener('click', async () => {
      if (!Object.keys(dirty).length) return toast('No changes to save');
      await api('/texts', { method: 'PUT', body: { changes: dirty } });
      toast('Texts saved — live on the website');
      render();
    });
    draw();
  }

  // ---------- page images ----------
  const PAGE_IMAGES = [
    ['img_hero_developments', 'Our Developments — top banner'],
    ['img_hero_careers', 'Careers — top banner'],
    ['img_hero_vendors', 'Vendors — top banner'],
    ['img_hero_investors', 'Investors — top banner'],
    ['img_hero_contact', 'Contact — top banner'],
    ['img_band', 'Home — “To Unlock the True Potential of Libya” band'],
    ['img_share', 'Image shown when the site is shared on social media'],
  ];
  async function pageImages(main) {
    const s = await api('/settings');
    main.innerHTML = `<div class="top"><h1>Page images</h1></div>
      <p class="muted">Banner photos for each page. Home page slides, “What we do”, values and the Careers photo strip have their own pages in the sidebar; development and news photos are set on each item.</p>
      <form id="ed"><div class="grid g2">${PAGE_IMAGES.map(([k, l]) => `<div class="card"><h2>${esc(l)}</h2>${imagePicker(k, s[k] || '')}</div>`).join('')}</div>
      <div class="savebar"><button class="btn" type="submit">Save page images</button><span class="err" role="alert"></span></div></form>`;
    bindPickers(main);
    $('#ed').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(PAGE_IMAGES.map(([k]) => [k, fieldVal(main, k)]));
      try { await api('/settings', { method: 'PUT', body }); toast('Page images saved — live on the website'); } catch (err) { $('.err', main).textContent = err.message; }
    });
  }

  // ---------- media library ----------
  async function mediaPage(main) {
    const { uploaded, builtIn } = await api('/media');
    const card = (m) => `<div class="lib-card">
      ${/\.pdf$/i.test(m.url) ? `<a class="pdf" href="${esc(m.url)}" target="_blank" rel="noopener">PDF</a>` : `<img src="${esc(m.url)}" alt="" loading="lazy">`}
      <div class="p"><span class="name" title="${esc(m.name || '')}">${esc(m.name || m.url)}</span>
        <div class="row"><button type="button" class="btn ghost sm" data-copy="${esc(m.url)}">Copy link</button>${m.id ? `<button type="button" class="btn danger sm" data-delm="${m.id}">Delete</button>` : ''}</div></div></div>`;
    main.innerHTML = `<div class="top"><h1>Media library</h1><div class="actions"><label class="btn">${icon('plus')} Upload images or PDFs<input type="file" id="up" accept="image/*,application/pdf" multiple hidden></label></div></div>
      <p class="muted">Everything you upload is kept here and can be reused anywhere through “Choose from library”. JPG, PNG, WebP, AVIF or PDF, up to 20 MB each.</p>
      <div class="card"><h2>Uploaded (${uploaded.length})</h2>${uploaded.length ? `<div class="lib-cards">${uploaded.map(card).join('')}</div>` : '<p class="muted">No uploads yet.</p>'}</div>
      <div class="card"><h2>Built-in photos (${builtIn.length})</h2><p class="muted">Mood photos from the brand guidelines, used until approved photography is uploaded.</p><div class="lib-cards">${builtIn.map(card).join('')}</div></div>`;
    $('#up').addEventListener('change', async (e) => {
      try { await uploadFiles(e.target.files); toast('Uploaded'); render(); } catch (err) { toast(err.message, true); }
    });
    $$('[data-copy]', main).forEach((b) => b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); toast('Link copied'); } catch { prompt('Copy this link:', b.dataset.copy); }
    }));
    $$('[data-delm]', main).forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this file? Pages that still use it will show an empty image.')) return;
      await api('/media/' + b.dataset.delm, { method: 'DELETE' });
      toast('Deleted');
      render();
    }));
  }

  // ---------- developments ----------
  async function projects(main) {
    const rows = await api('/projects');
    main.innerHTML = `<div class="top"><h1>Developments</h1><div class="actions"><a class="btn" href="#/project/new">+ Add development</a></div></div>
      <p class="muted">Shown on “Our Developments” in this order. Mark up to two as Featured to show them on the home page.</p>
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th></th><th>Name</th><th>Location</th><th>Order</th><th>Featured</th><th>Visible</th><th></th></tr></thead><tbody>
      ${rows.map((p) => `<tr data-go="#/project/${p.id}"><td><img class="thumb" src="${esc(p.hero_image)}" alt=""></td><td><b>${esc(p.t.en?.name)}</b><br><span class="muted ar" dir="rtl">${esc(p.t.ar?.name)}</span></td>
        <td>${esc(p.t.en?.location)}</td><td>${p.sort}</td><td>${p.featured ? '<span class="pill on">Featured</span>' : ''}</td>
        <td>${p.published ? '<span class="pill on">Published</span>' : '<span class="pill off">Hidden</span>'}</td>
        <td><a href="/en/developments/${esc(p.slug)}" target="_blank" rel="noopener">View ↗</a></td></tr>`).join('')}
      </tbody></table></div>` : '<div class="empty">No developments yet.</div>'}`;
    bindRowLinks(main);
  }

  async function projectEdit(main, id) {
    const isNew = id === 'new';
    const p = isNew ? { t: {}, chapters: [], gallery: [], categories: [], published: 1, featured: 0, sort: 0 } : await api('/projects/' + id);
    const cats = (await api('/items/dev_keyword')).items;
    const chosen = new Set((p.categories || []).map(Number));
    main.innerHTML = `<div class="top"><h1>${isNew ? 'New development' : esc(p.t.en?.name)}</h1><div class="actions"><a class="btn ghost" href="#/projects">← All developments</a>${isNew ? '' : `<a class="btn ghost" href="/en/developments/${esc(p.slug)}" target="_blank" rel="noopener">View on site ↗</a>`}</div></div>
      <form id="ed">
      <div class="card"><h2>Text</h2>${langCols(p, [['name', 'Name *'], ['line', 'Short line'], ['city', 'City (used by the City filter)'], ['location', 'Location'], ['type', 'Type'], ['masterplanner', 'Masterplanner'], ['overview', 'Overview (blank line = new paragraph)', 'textarea']])}</div>
      <div class="card"><h2>Details</h2>
        <div class="grid g2">
          <label class="f"><span>URL slug</span><input type="text" data-field="slug" value="${esc(p.slug || '')}" placeholder="generated from the English name"></label>
          <label class="f"><span>Site area (m², leave empty to hide)</span><input type="text" data-field="site_area" value="${esc(p.site_area || '')}"></label>
          <label class="f"><span>Order (lower first)</span><input type="number" data-field="sort" value="${esc(p.sort)}"></label>
          <div class="f" style="padding-top:22px"><label class="chk"><input type="checkbox" data-field="published" ${p.published ? 'checked' : ''}> Published</label><label class="chk"><input type="checkbox" data-field="featured" ${p.featured ? 'checked' : ''}> Featured on home page</label></div>
        </div>
        <label class="f"><span>Main image</span>${imagePicker('hero_image', p.hero_image || '')}</label>
        <label class="f"><span>Brochure (PDF)</span>${imagePicker('brochure', p.brochure || '', 'application/pdf')}</label>
      </div>
      <div class="card"><h2>Keywords</h2><p class="muted">Tick everything that describes this development. On “Our Developments” it appears when a visitor's chosen keywords are all ticked here. Manage the list under <a href="#/list/dev_keyword">Development keywords</a>.</p>
        <div class="cat-picks">${cats.length ? cats.map((c) => `<label class="cat-pick"><input type="checkbox" data-cat="${c.id}"${chosen.has(c.id) ? ' checked' : ''}><span><b>${esc(c.t?.en?.title || '')}</b><br><span class="muted ar" dir="rtl">${esc(c.t?.ar?.title || '')}</span></span></label>`).join('') : '<p class="muted">No keywords yet.</p>'}</div>
      </div>
      <div class="card"><h2>Gallery</h2><p class="muted">Each image is labelled Render, Lifestyle or Photo on the site.</p>
        <div class="gal" id="gal"></div>
        <div class="row" style="margin-top:12px"><label class="btn ghost sm">+ Upload images<input type="file" accept="image/*" multiple hidden id="galUp"></label><button type="button" class="btn ghost sm" id="galLib">+ From library</button></div>
      </div>
      <div class="card"><h2>Story chapters</h2><p class="muted">Image + text blocks shown on a dark background, alternating sides.</p>
        <div class="list-items" id="chapters"></div>
        <div class="row" style="margin-top:12px"><button type="button" class="btn ghost sm" id="addCh">+ Add chapter</button></div>
      </div>
      <div class="savebar"><button class="btn" type="submit">Save development</button>${isNew ? '' : '<button class="btn danger" type="button" id="del">Delete</button>'}<span class="err" role="alert"></span></div>
      </form>`;
    bindPickers(main);

    let gallery = [...p.gallery];
    const drawGal = () => {
      $('#gal').innerHTML = gallery.map((g, i) => `<div class="g"><img src="${esc(g.src)}" alt="">
        <div class="p"><select data-gi="${i}" data-k="label" aria-label="Label">${['Render', 'Lifestyle', 'Photo', ''].map((l) => `<option value="${l}"${g.label === l ? ' selected' : ''}>${l || 'No label'}</option>`).join('')}</select>
        <input type="text" data-gi="${i}" data-k="credit" value="${esc(g.credit || '')}" placeholder="Credit">
        <div class="row"><button type="button" class="btn ghost sm" data-mv="${i}" data-d="-1" aria-label="Move left">←</button><button type="button" class="btn ghost sm" data-mv="${i}" data-d="1" aria-label="Move right">→</button><button type="button" class="btn danger sm" data-rm="${i}">Remove</button></div></div></div>`).join('') || '<p class="muted">No images yet.</p>';
      $$('[data-gi]', main).forEach((el) => el.addEventListener('change', () => { gallery[el.dataset.gi][el.dataset.k] = el.value; }));
      $$('[data-rm]', main).forEach((b) => b.addEventListener('click', () => { gallery.splice(+b.dataset.rm, 1); drawGal(); }));
      $$('[data-mv]', main).forEach((b) => b.addEventListener('click', () => {
        const i = +b.dataset.mv, j = i + +b.dataset.d;
        if (j < 0 || j >= gallery.length) return;
        [gallery[i], gallery[j]] = [gallery[j], gallery[i]];
        drawGal();
      }));
    };
    drawGal();
    $('#galLib').addEventListener('click', async () => {
      const url = await chooseImage();
      if (url) { gallery.push({ src: url, label: 'Render', credit: '' }); drawGal(); }
    });
    $('#galUp').addEventListener('change', async (e) => {
      for (const f of e.target.files) {
        try { gallery.push({ src: await uploadFile(f), label: 'Render', credit: '' }); } catch (err) { toast(err.message, true); }
      }
      e.target.value = '';
      drawGal();
    });

    let chapters = p.chapters.map((c) => ({ ...c }));
    const drawCh = () => {
      $('#chapters').innerHTML = chapters.map((c, i) => `<div class="item" data-ci="${i}" data-skip-t>
        <div class="item-tools"><button type="button" class="btn danger sm" data-crm="${i}">Remove</button></div>
        <label class="f"><span>Image</span>${imagePicker('ch' + i, c.image || '')}</label>
        ${langCols(c, [['title', 'Title'], ['text', 'Text', 'textarea']])}
      </div>`).join('') || '<p class="muted">No chapters.</p>';
      bindPickers($('#chapters'));
      $$('[data-crm]', main).forEach((b) => b.addEventListener('click', () => { syncCh(); chapters.splice(+b.dataset.crm, 1); drawCh(); }));
    };
    const syncCh = () => {
      chapters = $$('[data-ci]', main).map((el, i) => {
        const t = {};
        $$('[data-t]', el).forEach((x) => { const [l, k] = x.dataset.t.split('.'); (t[l] = t[l] || {})[k] = x.value.trim(); });
        return { image: fieldVal(el, 'ch' + i), t };
      });
    };
    drawCh();
    $('#addCh').addEventListener('click', () => { syncCh(); chapters.push({ image: '', t: {} }); drawCh(); });

    $('#ed').addEventListener('submit', async (e) => {
      e.preventDefault();
      syncCh();
      const body = {
        t: readT(main), slug: fieldVal(main, 'slug'), categories: $$('[data-cat]:checked', main).map((c) => Number(c.dataset.cat)), site_area: fieldVal(main, 'site_area'), sort: Number(fieldVal(main, 'sort')) || 0,
        published: $('[data-field=published]', main).checked, featured: $('[data-field=featured]', main).checked,
        hero_image: fieldVal(main, 'hero_image'), brochure: fieldVal(main, 'brochure'), gallery, chapters,
      };
      try {
        await api(isNew ? '/projects' : '/projects/' + id, { method: isNew ? 'POST' : 'PUT', body });
        toast('Development saved');
        location.hash = '#/projects';
      } catch (err) { $('.err', main).textContent = err.message; }
    });
    $('#del')?.addEventListener('click', async () => {
      if (!confirm('Delete this development from the website?')) return;
      await api('/projects/' + id, { method: 'DELETE' });
      toast('Deleted');
      location.hash = '#/projects';
    });
  }

  // ---------- news ----------
  async function news(main) {
    const rows = await api('/news');
    main.innerHTML = `<div class="top"><h1>News</h1><div class="actions"><a class="btn" href="#/article/new">+ Add news item</a></div></div>
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th></th><th>Title</th><th>Category</th><th>Date</th><th>Visible</th></tr></thead><tbody>
      ${rows.map((n) => `<tr data-go="#/article/${n.id}"><td><img class="thumb" src="${esc(n.image)}" alt=""></td><td><b>${esc(n.t.en?.title)}</b><br><span class="muted ar" dir="rtl">${esc(n.t.ar?.title)}</span></td>
        <td>${esc(n.t.en?.category)}</td><td class="nowrap">${fmtDate(n.date)}</td><td>${n.published ? '<span class="pill on">Published</span>' : '<span class="pill off">Hidden</span>'}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="empty">No news yet.</div>'}`;
    bindRowLinks(main);
  }
  async function newsEdit(main, id) {
    const isNew = id === 'new';
    const n = isNew ? { t: {}, date: today(), published: 1 } : (await api('/news')).find((x) => String(x.id) === id);
    if (!n) { main.innerHTML = '<div class="empty">Not found.</div>'; return; }
    main.innerHTML = `<div class="top"><h1>${isNew ? 'New news item' : esc(n.t.en?.title)}</h1><div class="actions"><a class="btn ghost" href="#/news">← All news</a></div></div>
      <form id="ed">
      <div class="card"><h2>Text</h2>${langCols(n, [['title', 'Title *'], ['category', 'Category'], ['summary', 'Summary', 'textarea'], ['body', 'Article (blank line = new paragraph)', 'textarea']])}</div>
      <div class="card"><h2>Details</h2><div class="grid g2">
        <label class="f"><span>Date *</span><input type="date" data-field="date" value="${esc(n.date)}"></label>
        <label class="f"><span>URL slug</span><input type="text" data-field="slug" value="${esc(n.slug || '')}" placeholder="generated from the English title"></label></div>
        <label class="f"><span>Image</span>${imagePicker('image', n.image || '')}</label>
        <label class="chk"><input type="checkbox" data-field="published" ${n.published ? 'checked' : ''}> Published</label>
      </div>
      <div class="savebar"><button class="btn" type="submit">Save news item</button>${isNew ? '' : '<button class="btn danger" type="button" id="del">Delete</button>'}<span class="err" role="alert"></span></div>
      </form>`;
    bindPickers(main);
    $('#ed').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = { t: readT(main), date: fieldVal(main, 'date'), slug: fieldVal(main, 'slug'), image: fieldVal(main, 'image'), published: $('[data-field=published]', main).checked };
      try { await api(isNew ? '/news' : '/news/' + id, { method: isNew ? 'POST' : 'PUT', body }); toast('News saved'); location.hash = '#/news'; }
      catch (err) { $('.err', main).textContent = err.message; }
    });
    $('#del')?.addEventListener('click', async () => { if (!confirm('Delete this news item?')) return; await api('/news/' + id, { method: 'DELETE' }); toast('Deleted'); location.hash = '#/news'; });
  }

  // ---------- vacancies ----------
  async function vacancies(main) {
    const rows = await api('/vacancies');
    main.innerHTML = `<div class="top"><h1>Vacancies</h1><div class="actions"><a class="btn" href="#/vacancy/new">+ Add vacancy</a></div></div>
      <p class="muted">Active vacancies are listed on the Careers page and appear in the “Position Applying For” list of the application form.</p>
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Position</th><th>Department</th><th>City</th><th>Posted</th><th>Status</th></tr></thead><tbody>
      ${rows.map((v) => `<tr data-go="#/vacancy/${v.id}"><td><b>${esc(v.t.en?.title)}</b><br><span class="muted ar" dir="rtl">${esc(v.t.ar?.title)}</span></td><td>${esc(v.t.en?.department)}</td><td>${esc(v.t.en?.city)}</td>
        <td class="nowrap">${fmtDate(v.posted_date)}</td><td>${v.active ? '<span class="pill on">Active</span>' : '<span class="pill off">Closed</span>'}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="empty">No vacancies. The Careers page will invite general applications.</div>'}`;
    bindRowLinks(main);
  }
  async function vacancyEdit(main, id) {
    const isNew = id === 'new';
    const v = isNew ? { t: {}, posted_date: today(), active: 1 } : (await api('/vacancies')).find((x) => String(x.id) === id);
    if (!v) { main.innerHTML = '<div class="empty">Not found.</div>'; return; }
    main.innerHTML = `<div class="top"><h1>${isNew ? 'New vacancy' : esc(v.t.en?.title)}</h1><div class="actions"><a class="btn ghost" href="#/vacancies">← All vacancies</a></div></div>
      <form id="ed">
      <div class="card"><h2>Text</h2>${langCols(v, [['title', 'Position *'], ['department', 'Department'], ['city', 'City'], ['description', 'Short description', 'textarea']])}</div>
      <div class="card"><h2>Details</h2><div class="grid g2">
        <label class="f"><span>Posted date *</span><input type="date" data-field="posted_date" value="${esc(v.posted_date)}"></label>
        <div class="f" style="padding-top:22px"><label class="chk"><input type="checkbox" data-field="active" ${v.active ? 'checked' : ''}> Active (shown on the website)</label></div></div>
      </div>
      <div class="savebar"><button class="btn" type="submit">Save vacancy</button>${isNew ? '' : '<button class="btn danger" type="button" id="del">Delete</button>'}<span class="err" role="alert"></span></div>
      </form>`;
    $('#ed').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = { t: readT(main), posted_date: fieldVal(main, 'posted_date'), active: $('[data-field=active]', main).checked };
      try { await api(isNew ? '/vacancies' : '/vacancies/' + id, { method: isNew ? 'POST' : 'PUT', body }); toast('Vacancy saved'); location.hash = '#/vacancies'; }
      catch (err) { $('.err', main).textContent = err.message; }
    });
    $('#del')?.addEventListener('click', async () => { if (!confirm('Delete this vacancy?')) return; await api('/vacancies/' + id, { method: 'DELETE' }); toast('Deleted'); location.hash = '#/vacancies'; });
  }

  // ---------- settings ----------
  async function settings(main) {
    const s = await api('/settings');
    const f = (k, label, type = 'text', ar) => `<label class="f"><span>${label}</span>${type === 'textarea'
      ? `<textarea data-s="${k}" rows="5"${ar ? ' dir="rtl" class="ar"' : ''}>${esc(s[k])}</textarea>`
      : `<input type="${type}" data-s="${k}" value="${esc(s[k])}"${ar ? ' dir="rtl" class="ar"' : ''}>`}</label>`;
    main.innerHTML = `<div class="top"><h1>Settings</h1></div>
      <form id="ed">
      <div class="card"><h2>Contact details (footer and contact page)</h2><div class="grid g2">
        ${f('contact_email', 'Email', 'email')}${f('contact_phone', 'Phone')}${LANGS.map(([l, name]) => f('contact_address_' + l, `Address (${name})`, 'text', l === 'ar')).join('')}</div></div>
      <div class="card"><h2>Social links</h2><div class="grid g2">${f('social_linkedin', 'LinkedIn URL', 'url')}${f('social_instagram', 'Instagram URL', 'url')}${f('social_x', 'X URL', 'url')}${f('social_facebook', 'Facebook URL', 'url')}</div></div>
      <div class="card"><h2>Forms & links</h2>
        ${f('vendor_form_url', 'Vendor Pre-Qualification form URL (Tendering)', 'url')}
        ${f('hr_reference_url', 'HR reference form URL', 'url')}
        ${f('investment_ranges', 'Investment ranges for the Register Interest form (one per line)', 'textarea')}</div>
      <div class="card"><h2>Legal pages</h2><p class="muted">Paste the texts from Legal. A blank line starts a new paragraph.</p>
        ${langTabs((l) => [['privacy', 'Privacy Policy'], ['terms', 'Terms of Use'], ['accessibility', 'Accessibility']].map(([k, n]) => f(`legal_${k}_${l}`, `${n} — ${LANG_LABEL[l]}`, 'textarea', l === 'ar')).join(''))}</div>
      <div class="savebar"><button class="btn" type="submit">Save settings</button><span class="err" role="alert"></span></div>
      </form>`;
    $('#ed').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {};
      $$('[data-s]', main).forEach((el) => (body[el.dataset.s] = el.value.trim()));
      try { await api('/settings', { method: 'PUT', body }); toast('Settings saved'); } catch (err) { $('.err', main).textContent = err.message; }
    });
  }

  // ---------- account ----------
  async function account(main) {
    const admins = await api('/admins');
    main.innerHTML = `<div class="top"><h1>Users & password</h1></div>
      <div class="grid g2">
        <form class="card" id="pw"><h2>Change your password</h2>
          <label class="f"><span>Current password</span><input type="password" name="current" autocomplete="current-password" required></label>
          <label class="f"><span>New password (min. 10 characters)</span><input type="password" name="next" autocomplete="new-password" minlength="10" required></label>
          <button class="btn" type="submit">Update password</button><p class="err" role="alert"></p></form>
        <div class="card"><h2>Dashboard users</h2>
          <table><tbody>${admins.map((a) => `<tr style="cursor:default"><td><b>${esc(a.username)}</b>${a.username === me.username ? ' <span class="muted">(you)</span>' : ''}</td><td class="muted">${fmtDate(a.created_at)}</td>
            <td>${a.username === me.username ? '' : `<button class="btn danger sm" data-deluser="${a.id}" type="button">Remove</button>`}</td></tr>`).join('')}</tbody></table>
          <form id="nu" style="margin-top:18px"><h2>Add a user</h2>
            <label class="f"><span>Username</span><input type="text" name="username" autocomplete="off" required></label>
            <label class="f"><span>Password (min. 10 characters)</span><input type="password" name="password" autocomplete="new-password" minlength="10" required></label>
            <button class="btn" type="submit">Add user</button><p class="err" role="alert"></p></form>
        </div>
      </div>`;
    $('#pw').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try { await api('/password', { method: 'POST', body: { current: f.get('current'), next: f.get('next') } }); e.target.reset(); toast('Password updated'); }
      catch (err) { $('.err', e.target).textContent = err.message; }
    });
    $('#nu').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try { await api('/admins', { method: 'POST', body: { username: f.get('username'), password: f.get('password') } }); toast('User added'); render(); }
      catch (err) { $('.err', e.target).textContent = err.message; }
    });
    $$('[data-deluser]', main).forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Remove this user from the dashboard?')) return;
      await api('/admins/' + b.dataset.deluser, { method: 'DELETE' });
      toast('User removed');
      render();
    }));
  }

  boot();
})();
