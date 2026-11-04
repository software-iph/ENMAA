// Dashboard: login, contact inbox, and content editing (developments, news, vacancies, settings).
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const { all, one, run, getSettings, saveSettings, ITEM_KINDS, SCENES, getItems, loadTexts, hashPassword, verifyPassword } = require('./db');
const { textCatalog } = require('./i18n');
const { today } = require('./analytics');

const UPLOADS = path.join(__dirname, '..', 'uploads');
const SESSION_DAYS = 7;
const router = express.Router();

router.use(express.json({ limit: '1mb' }));

// ---------- auth ----------
function readToken(req) {
  const m = /(?:^|;\s*)enmaa_admin=([a-f0-9]{64})/.exec(req.headers.cookie || '');
  return m ? m[1] : null;
}
async function currentAdmin(req) {
  const token = readToken(req);
  if (!token) return null;
  const row = await one('SELECT a.id, a.username, s.expires FROM sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token = $1', [token]);
  if (!row || Number(row.expires) < Date.now()) return null;
  return { id: row.id, username: row.username, token };
}
async function requireAuth(req, res, next) {
  const admin = await currentAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Not signed in' });
  // Mutating requests must come from our own page (custom header), which blocks cross-site form posts.
  if (req.method !== 'GET' && req.get('X-Requested-With') !== 'enmaa-admin') return res.status(403).json({ error: 'Forbidden' });
  req.admin = admin;
  next();
}

const loginAttempts = new Map();
router.post('/api/login', async (req, res) => {
  const ip = req.ip;
  const now = Date.now();
  const tries = (loginAttempts.get(ip) || []).filter((ts) => now - ts < 15 * 60e3);
  if (tries.length >= 10) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  const { username, password } = req.body || {};
  const admin = await one('SELECT * FROM admins WHERE username = $1', [String(username || '')]);
  if (!admin || !verifyPassword(String(password || ''), admin.pass_hash)) {
    tries.push(now);
    loginAttempts.set(ip, tries);
    return res.status(401).json({ error: 'Wrong username or password.' });
  }
  loginAttempts.delete(ip);
  const token = crypto.randomBytes(32).toString('hex');
  await run('DELETE FROM sessions WHERE expires < $1', [now]);
  await run('INSERT INTO sessions (token, admin_id, expires) VALUES ($1, $2, $3)', [token, admin.id, now + SESSION_DAYS * 864e5]);
  res.cookie('enmaa_admin', token, { httpOnly: true, sameSite: 'strict', secure: req.secure, maxAge: SESSION_DAYS * 864e5, path: '/admin' });
  res.json({ ok: true, username: admin.username });
});

router.post('/api/logout', async (req, res) => {
  const token = readToken(req);
  if (token) await run('DELETE FROM sessions WHERE token = $1', [token]);
  res.clearCookie('enmaa_admin', { path: '/admin' });
  res.json({ ok: true });
});

router.get('/api/me', async (req, res) => {
  const admin = await currentAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Not signed in' });
  res.json({ username: admin.username });
});

const api = express.Router();
api.use(requireAuth);

// ---------- overview ----------
api.get('/stats', async (req, res) => {
  const [byType, totals, recent, daily, content] = await Promise.all([
    all(`SELECT type, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'new')::int AS unread FROM submissions GROUP BY type`),
    one(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'new')::int AS unread,
         COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS week FROM submissions`),
    all('SELECT id, type, status, name, email, subject, created_at FROM submissions ORDER BY id DESC LIMIT 6'),
    all(`SELECT to_char(created_at, 'YYYY-MM-DD') AS day, COUNT(*)::int AS n FROM submissions
         WHERE created_at >= current_date - 29 GROUP BY day ORDER BY day`),
    one(`SELECT (SELECT COUNT(*) FROM projects)::int AS projects, (SELECT COUNT(*) FROM news)::int AS news,
         (SELECT COUNT(*) FROM vacancies WHERE active)::int AS vacancies, (SELECT COUNT(*) FROM media)::int AS media,
         (SELECT COUNT(*) FROM texts)::int AS texts`),
  ]);
  const itemRows = await all('SELECT kind, COUNT(*)::int AS n FROM items GROUP BY kind');
  content.items = Object.fromEntries(itemRows.map((r) => [r.kind, r.n]));
  const d = today();
  const visits = await one(`SELECT COUNT(DISTINCT visitor) FILTER (WHERE day = $1)::int AS today,
    COUNT(DISTINCT (day::text || ':' || visitor))::int AS week FROM page_views WHERE day > $1::date - 7`, [d]);
  res.json({ byType, totals, recent, daily, content, visits });
});

// ---------- submissions (contact inbox) ----------
const STATUSES = ['new', 'in_progress', 'replied', 'archived'];

function listSubmissions(query) {
  const where = [];
  const params = [];
  const p = (v) => { params.push(v); return `$${params.length}`; };
  if (query.type) where.push(`type = ${p(query.type)}`);
  if (query.status) where.push(`status = ${p(query.status)}`);
  else if (!query.all) where.push("status <> 'archived'");
  if (query.q) {
    const like = p(`%${query.q}%`);
    where.push(`(name ILIKE ${like} OR email ILIKE ${like} OR subject ILIKE ${like} OR message ILIKE ${like} OR organisation ILIKE ${like})`);
  }
  return all(`SELECT * FROM submissions ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`, params);
}

api.get('/submissions', async (req, res) => {
  const rows = await listSubmissions({ type: req.query.type, status: req.query.status, q: req.query.q, all: req.query.all === '1' });
  res.json(rows.map(({ ip, ...r }) => r));
});

api.get('/submissions.csv', async (req, res) => {
  const rows = await listSubmissions({ type: req.query.type, status: req.query.status, q: req.query.q, all: true });
  const cols = ['id', 'created_at', 'type', 'status', 'name', 'email', 'phone', 'organisation', 'country', 'subject', 'message', 'lang', 'notes'];
  const cell = (v) => {
    let s = v instanceof Date ? v.toISOString() : String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n');
  res.set('Content-Disposition', `attachment; filename="enmaa-messages-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.type('text/csv').send('﻿' + csv);
});

const intId = (v) => (Number.isInteger(Number(v)) ? Number(v) : -1);

api.get('/submissions/:id', async (req, res) => {
  const row = await one('SELECT * FROM submissions WHERE id = $1', [intId(req.params.id)]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

api.patch('/submissions/:id', async (req, res) => {
  const { status, notes } = req.body || {};
  const id = intId(req.params.id);
  if (!(await one('SELECT id FROM submissions WHERE id = $1', [id]))) return res.status(404).json({ error: 'Not found' });
  if (status !== undefined) {
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Bad status' });
    await run('UPDATE submissions SET status = $1, updated_at = now() WHERE id = $2', [status, id]);
  }
  if (notes !== undefined) await run('UPDATE submissions SET notes = $1, updated_at = now() WHERE id = $2', [String(notes).slice(0, 5000), id]);
  res.json({ ok: true });
});

async function deleteSubmission(id) {
  const row = await one('SELECT file_path FROM submissions WHERE id = $1', [id]);
  if (!row) return false;
  if (row.file_path) fs.unlink(path.join(UPLOADS, 'cv', path.basename(row.file_path)), () => {});
  await run('DELETE FROM submissions WHERE id = $1', [id]);
  return true;
}

api.post('/submissions/bulk', async (req, res) => {
  const { ids, action } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'No messages selected' });
  const list = ids.map(Number).filter(Number.isInteger);
  if (action === 'delete') for (const id of list) await deleteSubmission(id);
  else if (STATUSES.includes(action)) await run('UPDATE submissions SET status = $1, updated_at = now() WHERE id = ANY($2::int[])', [action, list]);
  else return res.status(400).json({ error: 'Unknown action' });
  res.json({ ok: true });
});

api.delete('/submissions/:id', async (req, res) => {
  if (!(await deleteSubmission(intId(req.params.id)))) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

api.get('/submissions/:id/file', async (req, res) => {
  const row = await one('SELECT file_path, file_name FROM submissions WHERE id = $1', [intId(req.params.id)]);
  if (!row || !row.file_path) return res.status(404).send('Not found');
  const file = path.join(UPLOADS, 'cv', path.basename(row.file_path));
  if (!fs.existsSync(file)) return res.status(404).send('File missing');
  res.download(file, row.file_name || path.basename(file));
});

// ---------- content ----------
const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const json = (v, fallback) => JSON.stringify(v ?? fallback);

async function uniqueSlug(table, wanted, id) {
  const base = slugify(wanted) || `item-${Date.now()}`;
  let slug = base;
  let i = 2;
  while (await one(`SELECT id FROM ${table} WHERE slug = $1 AND id <> $2`, [slug, id || 0])) slug = `${base}-${i++}`;
  return slug;
}

// Developments
api.get('/projects', async (req, res) => res.json(await all('SELECT * FROM projects ORDER BY sort, id')));
api.get('/projects/:id', async (req, res) => {
  const r = await one('SELECT * FROM projects WHERE id = $1', [intId(req.params.id)]);
  r ? res.json(r) : res.status(404).json({ error: 'Not found' });
});
async function saveProject(req, res) {
  const b = req.body || {};
  const id = req.params.id ? intId(req.params.id) : null;
  if (!b.t?.en?.name) return res.status(400).json({ error: 'English name is required.' });
  const slug = await uniqueSlug('projects', b.slug || b.t.en.name, id);
  const categories = (Array.isArray(b.categories) ? b.categories : []).map(Number).filter(Number.isInteger);
  const vals = [slug, Number(b.sort) || 0, !!b.featured, !!(b.published ?? true), b.hero_image || '', b.brochure || '', String(b.site_area || ''), json(b.t, {}), json(b.chapters, []), json(b.gallery, []), JSON.stringify(categories)];
  if (id) await run('UPDATE projects SET slug=$1, sort=$2, featured=$3, published=$4, hero_image=$5, brochure=$6, site_area=$7, t=$8, chapters=$9, gallery=$10, categories=$11 WHERE id=$12', [...vals, id]);
  else await run('INSERT INTO projects (slug, sort, featured, published, hero_image, brochure, site_area, t, chapters, gallery, categories) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', vals);
  res.json({ ok: true, slug });
}
api.post('/projects', saveProject);
api.put('/projects/:id', saveProject);
api.delete('/projects/:id', async (req, res) => { await run('DELETE FROM projects WHERE id = $1', [intId(req.params.id)]); res.json({ ok: true }); });

// News
api.get('/news', async (req, res) => res.json(await all('SELECT * FROM news ORDER BY date DESC, id DESC')));
async function saveNews(req, res) {
  const b = req.body || {};
  const id = req.params.id ? intId(req.params.id) : null;
  if (!b.t?.en?.title) return res.status(400).json({ error: 'English title is required.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) return res.status(400).json({ error: 'Date is required.' });
  const slug = await uniqueSlug('news', b.slug || b.t.en.title, id);
  const vals = [slug, b.date, b.image || '', !!(b.published ?? true), json(b.t, {})];
  if (id) await run('UPDATE news SET slug=$1, date=$2, image=$3, published=$4, t=$5 WHERE id=$6', [...vals, id]);
  else await run('INSERT INTO news (slug, date, image, published, t) VALUES ($1,$2,$3,$4,$5)', vals);
  res.json({ ok: true, slug });
}
api.post('/news', saveNews);
api.put('/news/:id', saveNews);
api.delete('/news/:id', async (req, res) => { await run('DELETE FROM news WHERE id = $1', [intId(req.params.id)]); res.json({ ok: true }); });

// Vacancies
api.get('/vacancies', async (req, res) => res.json(await all('SELECT * FROM vacancies ORDER BY posted_date DESC, id DESC')));
async function saveVacancy(req, res) {
  const b = req.body || {};
  const id = req.params.id ? intId(req.params.id) : null;
  if (!b.t?.en?.title) return res.status(400).json({ error: 'English title is required.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.posted_date || '')) return res.status(400).json({ error: 'Posted date is required.' });
  const vals = [!!(b.active ?? true), b.posted_date, json(b.t, {})];
  if (id) await run('UPDATE vacancies SET active=$1, posted_date=$2, t=$3 WHERE id=$4', [...vals, id]);
  else await run('INSERT INTO vacancies (active, posted_date, t) VALUES ($1,$2,$3)', vals);
  res.json({ ok: true });
}
api.post('/vacancies', saveVacancy);
api.put('/vacancies/:id', saveVacancy);
api.delete('/vacancies/:id', async (req, res) => { await run('DELETE FROM vacancies WHERE id = $1', [intId(req.params.id)]); res.json({ ok: true }); });

// Editable lists (hero slides, What we do, values, partners, sectors, ...)
const kindOf = (req, res) => {
  const spec = ITEM_KINDS[req.params.kind];
  if (!spec) res.status(404).json({ error: 'Unknown list' });
  return spec;
};
api.get('/items', async (req, res) => {
  const counts = Object.fromEntries((await all('SELECT kind, COUNT(*)::int AS n FROM items GROUP BY kind')).map((r) => [r.kind, r.n]));
  res.json(Object.entries(ITEM_KINDS).map(([kind, s]) => ({ kind, ...s, count: counts[kind] || 0 })));
});
api.get('/items/:kind', async (req, res) => {
  const spec = kindOf(req, res);
  if (!spec) return;
  res.json({ kind: req.params.kind, ...spec, items: await getItems(req.params.kind, { all: true }) });
});
async function saveItem(req, res) {
  if (!kindOf(req, res)) return;
  const b = req.body || {};
  const id = req.params.id ? intId(req.params.id) : null;
  const scenes = [...new Set((Array.isArray(b.scenes) ? b.scenes : [b.scene]).filter((s) => SCENES.includes(s)))];
  const extra = scenes.length ? { scene: scenes[0], scenes } : {};
  const vals = [!!(b.active ?? true), String(b.image || ''), String(b.link || ''), json(b.t, {}), JSON.stringify(extra)];
  if (id) {
    await run('UPDATE items SET active=$1, image=$2, link=$3, t=$4, extra=$5 WHERE id=$6 AND kind=$7', [...vals, id, req.params.kind]);
  } else {
    const { n } = await one('SELECT COALESCE(MAX(sort), 0)::int + 1 AS n FROM items WHERE kind = $1', [req.params.kind]);
    await run('INSERT INTO items (active, image, link, t, extra, kind, sort) VALUES ($1,$2,$3,$4,$5,$6,$7)', [...vals, req.params.kind, n]);
  }
  res.json({ ok: true });
}
api.post('/items/:kind', saveItem);
api.put('/items/:kind/:id', saveItem);
api.delete('/items/:kind/:id', async (req, res) => {
  await run('DELETE FROM items WHERE id = $1 AND kind = $2', [intId(req.params.id), req.params.kind]);
  res.json({ ok: true });
});
api.post('/items/:kind/order', async (req, res) => {
  const ids = (req.body?.ids || []).map(Number).filter(Number.isInteger);
  for (let i = 0; i < ids.length; i++) await run('UPDATE items SET sort = $1 WHERE id = $2 AND kind = $3', [i + 1, ids[i], req.params.kind]);
  res.json({ ok: true });
});

// Site texts (every interface text in English and Arabic)
api.get('/texts', (req, res) => res.json(textCatalog()));
api.put('/texts', async (req, res) => {
  const changes = req.body?.changes || {};
  const known = new Set(textCatalog().flatMap((g) => g.items.map((i) => i.key)));
  for (const [key, v] of Object.entries(changes)) {
    if (!known.has(key)) continue;
    const en = String(v?.en ?? '').trim();
    const ar = String(v?.ar ?? '').trim();
    if (!en && !ar) await run('DELETE FROM texts WHERE key = $1', [key]);
    else await run(`INSERT INTO texts (key, en, ar, updated_at) VALUES ($1, $2, $3, now())
      ON CONFLICT (key) DO UPDATE SET en = EXCLUDED.en, ar = EXCLUDED.ar, updated_at = now()`, [key, en || null, ar || null]);
  }
  await loadTexts();
  res.json({ ok: true });
});

// Media library
const BUILT_IN = path.join(__dirname, '..', 'public', 'img');
api.get('/media', async (req, res) => {
  const uploaded = await all('SELECT id, url, name, size, created_at FROM media ORDER BY id DESC');
  const builtIn = fs.readdirSync(BUILT_IN).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).map((f) => ({ url: `/img/${f}`, name: f, builtIn: true }));
  res.json({ uploaded, builtIn });
});
api.delete('/media/:id', async (req, res) => {
  const row = await one('SELECT url FROM media WHERE id = $1', [intId(req.params.id)]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const m = /^\/uploads\/(images|files)\/([^/]+)$/.exec(row.url);
  if (m) fs.unlink(path.join(UPLOADS, m[1], m[2]), () => {});
  await run('DELETE FROM media WHERE id = $1', [intId(req.params.id)]);
  res.json({ ok: true });
});

// Settings
api.get('/settings', async (req, res) => res.json(await getSettings()));
api.put('/settings', async (req, res) => { await saveSettings(req.body || {}); res.json({ ok: true }); });

// Account
api.post('/password', async (req, res) => {
  const { current, next } = req.body || {};
  const admin = await one('SELECT * FROM admins WHERE id = $1', [req.admin.id]);
  if (!verifyPassword(String(current || ''), admin.pass_hash)) return res.status(400).json({ error: 'Current password is wrong.' });
  if (String(next || '').length < 10) return res.status(400).json({ error: 'New password must be at least 10 characters.' });
  await run('UPDATE admins SET pass_hash = $1 WHERE id = $2', [hashPassword(next), admin.id]);
  await run('DELETE FROM sessions WHERE admin_id = $1 AND token <> $2', [admin.id, req.admin.token]);
  res.json({ ok: true });
});
api.get('/admins', async (req, res) => res.json(await all('SELECT id, username, created_at FROM admins ORDER BY id')));
api.post('/admins', async (req, res) => {
  const { username, password } = req.body || {};
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(String(username || ''))) return res.status(400).json({ error: 'Username: 3–40 letters, numbers, dot, dash or underscore.' });
  if (String(password || '').length < 10) return res.status(400).json({ error: 'Password must be at least 10 characters.' });
  if (await one('SELECT id FROM admins WHERE username = $1', [username])) return res.status(400).json({ error: 'That username already exists.' });
  await run('INSERT INTO admins (username, pass_hash) VALUES ($1, $2)', [username, hashPassword(password)]);
  res.json({ ok: true });
});
api.delete('/admins/:id', async (req, res) => {
  if (intId(req.params.id) === req.admin.id) return res.status(400).json({ error: 'You cannot remove your own account.' });
  await run('DELETE FROM admins WHERE id = $1', [intId(req.params.id)]);
  res.json({ ok: true });
});

// Uploads (images and PDF brochures)
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOADS, path.extname(file.originalname).toLowerCase() === '.pdf' ? 'files' : 'images')),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.pdf'].includes(ext));
  },
});
api.post('/upload', upload.array('file', 30), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Upload a JPG, PNG, WebP, AVIF or PDF file (max 20 MB).' });
  const urls = [];
  for (const f of req.files) {
    const folder = f.destination.endsWith('files') ? 'files' : 'images';
    const url = `/uploads/${folder}/${f.filename}`;
    await run('INSERT INTO media (url, name, size) VALUES ($1, $2, $3) ON CONFLICT (url) DO NOTHING', [url, f.originalname.slice(0, 200), f.size]);
    urls.push(url);
  }
  // prepare the phone / tablet / desktop sizes of new photos right away
  require('./images').warmUploads(req.files.filter((f) => !f.destination.endsWith('files')).map((f) => f.filename));
  res.json({ url: urls[0], urls });
});

// ---------- visitor statistics (data from src/analytics.js) ----------
const ymd = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? String(s) : null);
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const VISIT = "(day::text || ':' || visitor)"; // one person on one day

function visitorFilters(qs) {
  const to = ymd(qs.to) || today();
  let from = ymd(qs.from) || addDays(to, -29);
  if (from > to) from = to;
  const vals = [from, to];
  const where = ['day BETWEEN $1 AND $2'];
  const add = (sql, v) => { vals.push(v); where.push(sql.replace('?', '$' + vals.length)); };
  if (['desktop', 'mobile', 'tablet'].includes(qs.device)) add('device = ?', qs.device);
  if (['en', 'ar'].includes(qs.lang)) add('lang = ?', qs.lang);
  if (qs.page) add('path = ?', String(qs.page).slice(0, 300));
  // "came from" keeps every page view of the people who arrived from that source that day
  if (qs.source) add(`${VISIT} IN (SELECT day::text || ':' || visitor FROM page_views WHERE day BETWEEN $1 AND $2 AND source = ?)`, String(qs.source).slice(0, 200));
  return { from, to, vals, where: where.join(' AND ') };
}

// Readable page names: "Home", "Development: Marina District", "News: …"
async function pageLabeler() {
  const [projects, news] = await Promise.all([all('SELECT slug, t FROM projects'), all('SELECT slug, t FROM news')]);
  const proj = Object.fromEntries(projects.map((p) => [p.slug, p.t?.en?.name || p.slug]));
  const art = Object.fromEntries(news.map((n) => [n.slug, n.t?.en?.title || n.slug]));
  const fixed = { '/': 'Home', '/developments': 'Our Developments', '/careers': 'Careers', '/vendors': 'Vendors', '/investors': 'Investors', '/news': 'News', '/contact': 'Contact', '/privacy': 'Privacy', '/terms': 'Terms', '/accessibility': 'Accessibility' };
  return (path) => {
    if (fixed[path]) return fixed[path];
    let m = /^\/developments\/([^/]+)$/.exec(path);
    if (m) return `Development: ${proj[m[1]] || m[1]}`;
    m = /^\/news\/([^/]+)$/.exec(path);
    if (m) return `News: ${(art[m[1]] || m[1]).replace(/^Sample headline:\s*/i, '')}`;
    return path;
  };
}

async function visitorReport(qs) {
  const f = visitorFilters(qs);
  const W = f.where;
  const [daily, pagesRows, sources, devices, langs, allPages, allSources, label] = await Promise.all([
    all(`SELECT day::text AS day, COUNT(DISTINCT visitor)::int AS visitors, COUNT(*)::int AS views FROM page_views WHERE ${W} GROUP BY day ORDER BY day`, f.vals),
    all(`SELECT path, COUNT(DISTINCT ${VISIT})::int AS visitors, COUNT(*)::int AS views FROM page_views WHERE ${W} GROUP BY path ORDER BY visitors DESC, views DESC LIMIT 60`, f.vals),
    all(`SELECT source, COUNT(DISTINCT ${VISIT})::int AS visitors FROM page_views
         WHERE day BETWEEN $1 AND $2 AND source IS NOT NULL AND ${VISIT} IN (SELECT ${VISIT} FROM page_views WHERE ${W})
         GROUP BY source ORDER BY visitors DESC LIMIT 30`, f.vals),
    all(`SELECT device AS key, COUNT(DISTINCT ${VISIT})::int AS visitors FROM page_views WHERE ${W} GROUP BY device ORDER BY visitors DESC`, f.vals),
    all(`SELECT lang AS key, COUNT(DISTINCT ${VISIT})::int AS visitors FROM page_views WHERE ${W} GROUP BY lang ORDER BY visitors DESC`, f.vals),
    all('SELECT path, COUNT(*)::int AS n FROM page_views WHERE day BETWEEN $1 AND $2 GROUP BY path ORDER BY n DESC LIMIT 200', [f.from, f.to]),
    all('SELECT source, COUNT(*)::int AS n FROM page_views WHERE day BETWEEN $1 AND $2 AND source IS NOT NULL GROUP BY source ORDER BY n DESC LIMIT 100', [f.from, f.to]),
    pageLabeler(),
  ]);
  // every day in the range, including days without visits
  const byDay = Object.fromEntries(daily.map((d) => [d.day, d]));
  const days = [];
  for (let d = f.from; d <= f.to; d = addDays(d, 1)) days.push(byDay[d] || { day: d, visitors: 0, views: 0 });
  const visitors = days.reduce((a, d) => a + d.visitors, 0);
  const views = days.reduce((a, d) => a + d.views, 0);
  const busiest = days.reduce((b, d) => (d.visitors > (b?.visitors || 0) ? d : b), null);
  return {
    from: f.from, to: f.to, days,
    totals: { visitors, views, perDay: days.length ? visitors / days.length : 0, pagesPerVisitor: visitors ? views / visitors : 0, busiest },
    pages: pagesRows.map((p) => ({ ...p, label: label(p.path) })),
    sources, devices, langs,
    options: { pages: allPages.map((p) => ({ path: p.path, label: label(p.path) })), sources: allSources.map((s) => s.source) },
  };
}

api.get('/visitors', async (req, res) => res.json(await visitorReport(req.query)));
api.get('/visitors.csv', async (req, res) => {
  const r = await visitorReport(req.query);
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    ['Date', 'Visitors', 'Page views'].join(','), ...r.days.map((d) => [d.day, d.visitors, d.views].join(',')), '',
    ['Page', 'Visitors', 'Page views'].join(','), ...r.pages.map((p) => [cell(p.label), p.visitors, p.views].join(',')), '',
    ['Came from', 'Visitors'].join(','), ...r.sources.map((s) => [cell(s.source), s.visitors].join(',')),
  ];
  res.set('Content-Disposition', `attachment; filename="enmaa-visitors-${r.from}-to-${r.to}.csv"`);
  res.type('text/csv').send('﻿' + lines.join('\r\n'));
});

router.use('/api', api);

// Dashboard single-page app
// The page links its script and styles with a version number, so a new version is never stuck in the browser cache.
const ADMIN_V = Date.now().toString(36);
const adminIndex = () => fs.readFileSync(path.join(__dirname, '..', 'admin', 'index.html'), 'utf8')
  .replace(/(\/admin\/admin\.(?:css|js))(?=")/g, `$1?v=${ADMIN_V}`);
router.use(express.static(path.join(__dirname, '..', 'admin'), { index: false }));
router.get(/.*/, (req, res) => res.set('Cache-Control', 'no-cache').type('html').send(adminIndex()));

module.exports = router;
