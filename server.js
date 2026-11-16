const path = require('path');
const fs = require('fs');

// Load settings such as DATABASE_URL from .env when present.
try { process.loadEnvFile(path.join(__dirname, '.env')); } catch { /* no .env file */ }

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');

const { all, one, run, init, getSettings, getItems } = require('./src/db');
const { LANGS, translator, pick } = require('./src/i18n');
const pages = require('./src/views/pages');
const adminRouter = require('./src/admin');
const analytics = require('./src/analytics');

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const UPLOADS = path.join(__dirname, 'uploads');

const app = express();
app.disable('x-powered-by');
app.use(require('compression')()); // gzip for HTML, CSS, JS and JSON (images are already compressed)
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
  });
  next();
});

const images = require('./src/images');
app.use(images.handler); // /r/<width>/... responsive images
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));
// Three.js for the keyword model on Our Developments (served from node_modules, no CDN).
app.use('/vendor/three/addons', express.static(path.join(__dirname, 'node_modules', 'three', 'examples', 'jsm'), { maxAge: '30d' }));
app.use('/vendor/three', express.static(path.join(__dirname, 'node_modules', 'three', 'build'), { maxAge: '30d' }));
// Public uploads: images and brochures only. CVs live in uploads/cv and are never served statically.
app.use('/uploads/images', express.static(path.join(UPLOADS, 'images'), { maxAge: '7d' }));
app.use('/uploads/files', express.static(path.join(UPLOADS, 'files'), { maxAge: '1d' }));

app.use('/admin', adminRouter);

// ---------------- helpers ----------------
function cookieLang(req) {
  const m = /(?:^|;\s*)lang=([a-z]{2})\b/.exec(req.headers.cookie || '');
  return m && LANGS.includes(m[1]) ? m[1] : null;
}

function localizeProject(p, lang) {
  const f = (k) => pick(p.t, lang, k);
  return {
    id: p.id, slug: p.slug, featured: !!p.featured, hero_image: p.hero_image || '/img/hero.jpg', brochure: p.brochure, site_area: p.site_area,
    name: f('name'), line: f('line'), location: f('location'), type: f('type'), masterplanner: f('masterplanner'), overview: f('overview'),
    city: f('city'), cityKey: p.t?.en?.city || f('city'), categories: Array.isArray(p.categories) ? p.categories.map(Number) : [],
    chapters: p.chapters.map((c) => ({ image: c.image, title: pick(c.t, lang, 'title'), text: pick(c.t, lang, 'text') })),
    gallery: p.gallery.filter((g) => g && g.src),
  };
}
function localizeNews(n, lang) {
  return { id: n.id, slug: n.slug, date: n.date, image: n.image, title: pick(n.t, lang, 'title'), category: pick(n.t, lang, 'category'), summary: pick(n.t, lang, 'summary'), body: pick(n.t, lang, 'body') };
}
function localizeVacancy(v, lang) {
  return { id: v.id, posted_date: v.posted_date, title: pick(v.t, lang, 'title'), department: pick(v.t, lang, 'department'), city: pick(v.t, lang, 'city'), description: pick(v.t, lang, 'description') };
}

// 3D elements a development keyword shows: `scenes` (several allowed); `scene` is the first, for the icon.
function sceneFields(extra) {
  const scenes = Array.isArray(extra?.scenes) && extra.scenes.length ? extra.scenes : (extra?.scene ? [extra.scene] : []);
  return { scenes, scene: scenes[0] || '' };
}

// Editable lists (hero slides, values, sectors, ...) in the current language.
async function listItems(kind, lang) {
  return (await getItems(kind)).map((r) => ({
    id: r.id, image: r.image, link: r.link,
    title: pick(r.t, lang, 'title'), text: pick(r.t, lang, 'text'), key: r.t?.en?.title || String(r.id), ...sceneFields(r.extra),
  }));
}

const q = {
  projects: () => all('SELECT * FROM projects WHERE published ORDER BY sort, id'),
  project: (slug) => one('SELECT * FROM projects WHERE published AND slug = $1', [slug]),
  news: (limit = 100) => all('SELECT * FROM news WHERE published ORDER BY date DESC, id DESC LIMIT $1', [limit]),
  vacancies: () => all('SELECT * FROM vacancies WHERE active ORDER BY posted_date DESC, id DESC'),
};

// ---------------- public pages ----------------
app.get('/', (req, res) => {
  const browser = (req.headers['accept-language'] || '').split(',').map((x) => x.trim().slice(0, 2).toLowerCase()).find((l) => LANGS.includes(l));
  const lang = cookieLang(req) || browser || 'en';
  res.redirect(302, `/${lang}/`);
});

app.get('/sitemap.xml', async (req, res) => {
  const paths = ['/', '/developments', '/careers', '/vendors', '/investors', '/contact', '/privacy', '/terms', '/accessibility']
    .concat((await q.projects()).map((p) => `/developments/${p.slug}`));
  const urls = paths.flatMap((p) => LANGS.map((l) => `<url><loc>${BASE_URL}/${l}${p}</loc>${LANGS.map((a) => `<xhtml:link rel="alternate" hreflang="${a}" href="${BASE_URL}/${a}${p}"/>`).join('')}</url>`));
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>`);
});
app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nSitemap: ${BASE_URL}/sitemap.xml\n`));

const langRouter = express.Router({ mergeParams: true });

langRouter.use(async (req, res, next) => {
  const lang = req.params.lang;
  if (!LANGS.includes(lang)) return next('router');
  res.cookie('lang', lang, { maxAge: 365 * 864e5, sameSite: 'lax' });
  const subPath = req.path === '/' ? '/' : req.path.replace(/\/$/, '');
  res.locals.ctx = { lang, t: translator(lang), settings: await getSettings(), path: subPath, baseUrl: BASE_URL };
  next();
});
langRouter.use(analytics.track); // cookieless visitor statistics (see src/analytics.js)

langRouter.get('/', async (req, res) => {
  const { lang } = res.locals.ctx;
  const [projects, news, slides, services, values, partners] = await Promise.all([
    q.projects(), q.news(24), listItems('hero_slide', lang), listItems('service', lang), listItems('value', lang), listItems('partner', lang),
  ]);
  const localized = projects.map((r) => localizeProject(r, lang));
  const featured = localized.filter((p) => p.featured).slice(0, 2);
  res.send(pages.home(res.locals.ctx, { featured, news: news.map((n) => localizeNews(n, lang)), slides, services, values, partners }));
});
langRouter.get('/developments', async (req, res) => {
  const { lang } = res.locals.ctx;
  const [rows, keywords] = await Promise.all([q.projects(), listItems('dev_keyword', lang)]);
  res.send(pages.developments(res.locals.ctx, { projects: rows.map((r) => localizeProject(r, lang)), keywords }));
});
langRouter.get('/developments/:slug', async (req, res, next) => {
  const { lang } = res.locals.ctx;
  const row = await q.project(req.params.slug);
  if (!row) return next();
  const p = localizeProject(row, lang);
  const others = (await q.projects()).filter((r) => r.slug !== p.slug).slice(0, 3).map((r) => localizeProject(r, lang));
  res.send(pages.project(res.locals.ctx, { p, others }));
});
langRouter.get('/careers', async (req, res) => {
  const { lang } = res.locals.ctx;
  const [vacancies, photos] = await Promise.all([q.vacancies(), listItems('careers_photo', lang)]);
  res.send(pages.careers(res.locals.ctx, { vacancies: vacancies.map((v) => localizeVacancy(v, lang)), photos }));
});
langRouter.get('/vendors', async (req, res) => {
  const { lang } = res.locals.ctx;
  const [disciplines, documents] = await Promise.all([listItems('discipline', lang), listItems('document', lang)]);
  res.send(pages.vendors(res.locals.ctx, { disciplines, documents }));
});
langRouter.get('/investors', async (req, res) => {
  res.send(pages.investors(res.locals.ctx, { sectors: await listItems('sector', res.locals.ctx.lang) }));
});
// News is shown only on the home page (story popup). Old news addresses lead there.
langRouter.get('/news', (req, res) => res.redirect(301, `/${req.params.lang}/#news`));
langRouter.get('/news/:slug', (req, res) => res.redirect(301, `/${req.params.lang}/#news=${encodeURIComponent(req.params.slug)}`));
langRouter.get('/contact', (req, res) => res.send(pages.contact(res.locals.ctx)));
for (const key of ['privacy', 'terms', 'accessibility']) {
  langRouter.get(`/${key}`, (req, res) => res.send(pages.legal(res.locals.ctx, { key })));
}
langRouter.use((req, res) => res.status(404).send(pages.notFound(res.locals.ctx)));

app.use('/:lang', langRouter);

// ---------------- form submissions ----------------
const cvUpload = multer({
  storage: multer.diskStorage({
    destination: path.join(UPLOADS, 'cv'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 30 },
  fileFilter: (req, file, cb) => {
    const ok = ['.pdf', '.docx'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : Object.assign(new Error('file'), { code: 'BAD_FILE' }), ok);
  },
});

// Vendor registration attachments: private folder, only downloadable from the dashboard.
const DOCS = path.join(UPLOADS, 'docs');
fs.mkdirSync(DOCS, { recursive: true });
fs.mkdirSync(path.join(UPLOADS, 'cv'), { recursive: true });
const DOC_EXT = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];
const DOC_MAX_FILES = 5;
const docUpload = multer({
  storage: multer.diskStorage({
    destination: DOCS,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: DOC_MAX_FILES, fields: 60 },
  fileFilter: (req, file, cb) => {
    const ok = DOC_EXT.includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : Object.assign(new Error('file'), { code: 'BAD_FILE' }), ok);
  },
});
const VENDOR_FILES = [{ name: 'company_profile', maxCount: 1 }, { name: 'documents', maxCount: DOC_MAX_FILES }];

// Simple in-memory rate limit: 8 submissions per IP per 10 minutes.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((ts) => now - ts < 10 * 60e3);
  list.push(now);
  hits.set(ip, list);
  return list.length > 8;
}

const FORM_TYPES = {
  contact: { required: ['name', 'email', 'subject', 'message'] },
  project: { required: ['name', 'email', 'country', 'message'] },
  investor: { required: ['name', 'organisation', 'email', 'country', 'sector', 'investment_range', 'preferred_language'] },
  vendor: {
    required: ['collab_type', 'applicant_kind', 'organisation', 'country', 'address', 'name', 'job_title', 'email', 'phone', 'activities', 'experience', 'collaboration'],
    checks: ['decl_accurate', 'decl_authority', 'decl_legal'],
  },
  career: { required: ['first_name', 'last_name', 'email', 'position'], file: true },
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clip = (s, n = 4000) => String(s ?? '').trim().slice(0, n);
const COLLAB_TYPES = ['supplier', 'contractor', 'consultant', 'service', 'partner', 'other'];
const REF_PREFIX = { contact: 'CON', project: 'PRJ', career: 'CAR', investor: 'INV', vendor: 'VEN' };
// Every uploaded file of this request (CV or vendor attachments)
const uploadedFiles = (req) => (req.file ? [req.file] : Object.values(req.files || {}).flat());

async function handleForm(req, res) {
  const type = req.params.type;
  const spec = FORM_TYPES[type];
  const body = req.body || {};
  const lang = LANGS.includes(body.lang) ? body.lang : 'en';
  const t = translator(lang);
  const wantsJson = (req.headers.accept || '').includes('application/json');
  const removeFile = () => { for (const f of uploadedFiles(req)) fs.unlink(f.path, () => {}); };

  const reply = (status, payload) => {
    if (wantsJson) return res.status(status).json(payload);
    const back = String(body.return_to || `/${lang}/`).startsWith('/') && !String(body.return_to).startsWith('//') ? body.return_to : `/${lang}/`;
    return res.redirect(303, `${back}?sent=${payload.ok ? '1' : '0'}${payload.ref ? `&ref=${payload.ref}` : ''}`);
  };

  if (!spec) return res.status(404).json({ ok: false });
  // Honeypot: pretend success for bots.
  if (body.website) { removeFile(); return reply(200, { ok: true, message: t('form_success') }); }
  if (rateLimited(req.ip)) { removeFile(); return reply(429, { ok: false, message: t('err_rate') }); }

  const errors = {};
  for (const k of spec.required) if (!clip(body[k])) errors[k] = t('err_required');
  if (body.email && !EMAIL_RE.test(clip(body.email))) errors.email = t('err_email');
  if (body.consent !== 'yes') errors.consent = t('err_consent');
  if (spec.file && !req.file) errors.cv = t('err_file');
  for (const k of spec.checks || []) if (body[k] !== 'yes') errors[k] = t('err_consent');
  if (type === 'vendor') {
    if (body.collab_type && !COLLAB_TYPES.includes(body.collab_type)) errors.collab_type = t('err_required');
    if (body.applicant_kind && !['company', 'individual'].includes(body.applicant_kind)) errors.applicant_kind = t('err_required');
    if (body.applicant_kind === 'company' && !clip(body.reg_no)) errors.reg_no = t('err_required');
    if (uploadedFiles(req).length > DOC_MAX_FILES) errors.documents = t('err_files');
  }
  if (Object.keys(errors).length) { removeFile(); return reply(422, { ok: false, message: t('form_error'), errors }); }

  let name = clip(body.name, 200);
  const data = {};
  let subject = clip(body.subject, 300);
  if (type === 'career') {
    name = `${clip(body.first_name, 100)} ${clip(body.last_name, 100)}`.trim();
    data.first_name = clip(body.first_name, 100);
    data.last_name = clip(body.last_name, 100);
    if (body.position === 'general') subject = 'General application';
    else {
      const v = Number.isInteger(Number(body.position)) ? await one('SELECT * FROM vacancies WHERE id = $1', [Number(body.position)]) : null;
      subject = v ? pick(v.t, 'en', 'title') : 'General application';
      data.vacancy_id = v ? v.id : null;
    }
  }
  if (type === 'project') {
    const p = await one('SELECT slug, t FROM projects WHERE slug = $1', [clip(body.project, 200)]);
    subject = p ? pick(p.t, 'en', 'name') : clip(body.project, 200);
    data.project = p ? p.slug : null;
  }
  if (type === 'vendor') {
    Object.assign(data, {
      collab_type: clip(body.collab_type, 30), applicant_kind: clip(body.applicant_kind, 20), reg_no: clip(body.reg_no, 100),
      address: clip(body.address, 500), website: clip(body.company_website, 300), job_title: clip(body.job_title, 150),
      activities: clip(body.activities, 3000), coverage: clip(body.coverage, 500), experience: clip(body.experience, 4000),
      affiliations: clip(body.affiliations, 1000), software: clip(body.software, 1000), certifications: clip(body.certifications, 2000),
      collaboration: clip(body.collaboration, 4000),
      declarations: 'accurate, authorised, no legal impediments, privacy notice',
    });
    const typeName = translator('en')(`ct_${data.collab_type}`);
    subject = `${typeName} · ${clip(body.organisation, 200)}`;
  }
  if (type === 'investor') {
    data.sector = clip(body.sector, 50);
    data.investment_range = clip(body.investment_range, 100);
    data.preferred_language = clip(body.preferred_language, 10);
    subject = `${data.sector} · ${data.investment_range}`;
  }

  const files = type === 'vendor' ? [
    ...(req.files?.company_profile || []).map((f) => ({ file: path.basename(f.path), name: clip(f.originalname, 200), size: f.size, label: 'Company profile' })),
    ...(req.files?.documents || []).map((f) => ({ file: path.basename(f.path), name: clip(f.originalname, 200), size: f.size, label: 'Supporting document' })),
  ] : [];
  const row = await one(`INSERT INTO submissions (type, lang, name, email, organisation, country, phone, subject, message, data, file_path, file_name, files, ip)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id, created_at`, [
    type, lang, name, clip(body.email, 200), clip(body.organisation, 200), clip(body.country, 100), clip(body.phone, 50), subject,
    clip(body.message, 5000), JSON.stringify(data), req.file ? path.basename(req.file.path) : null, req.file ? clip(req.file.originalname, 200) : null,
    JSON.stringify(files), req.ip,
  ]);
  // Reference number, e.g. VEN-2026-00042 (the row id keeps it unique)
  const ref = `${REF_PREFIX[type]}-${new Date(row.created_at).getUTCFullYear()}-${String(row.id).padStart(5, '0')}`;
  await run('UPDATE submissions SET ref = $1 WHERE id = $2', [ref, row.id]);
  const okKey = { career: 'form_success_career', vendor: 'form_success_vendor', investor: 'form_success_investor' }[type] || 'form_success';
  return reply(200, { ok: true, ref, message: t(okKey, { ref }) });
}

app.post('/api/forms/:type', (req, res, next) => {
  const upload = { career: cvUpload.single('cv'), vendor: docUpload.fields(VENDOR_FILES) }[req.params.type];
  if (upload) {
    return upload(req, res, (err) => {
      if (err) {
        for (const f of uploadedFiles(req)) fs.unlink(f.path, () => {});
        const lang = LANGS.includes(req.body?.lang) ? req.body.lang : 'en';
        const t = translator(lang);
        const errors = req.params.type === 'career' ? { cv: t('err_file') } : { documents: t('err_files') };
        return res.status(422).json({ ok: false, message: t('form_error'), errors });
      }
      handleForm(req, res).catch(next);
    });
  }
  next();
}, express.urlencoded({ extended: false, limit: '100kb' }), multer().none(), handleForm);

// ---------------- errors ----------------
app.use(async (req, res) => {
  const lang = cookieLang(req) || 'en';
  res.status(404).send(pages.notFound({ lang, t: translator(lang), settings: await getSettings(), path: '/', baseUrl: BASE_URL }));
});
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Server error');
});

init().then((adminFile) => {
  app.listen(PORT, () => {
    console.log(`ENMAA website running at ${BASE_URL}`);
    console.log(`Dashboard: ${BASE_URL}/admin`);
    if (adminFile) console.log(`First dashboard login saved to ${adminFile}`);
    images.warmAll(); // make every photo size ahead of time, so visitors never wait for one
  });
}).catch((err) => {
  console.error('Could not connect to PostgreSQL. Check DATABASE_URL in .env.');
  console.error(err.message);
  process.exit(1);
});
