// PostgreSQL storage. Connection string comes from DATABASE_URL (see .env).
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Pool, types } = require('pg');

// Keep DATE columns as 'YYYY-MM-DD' strings instead of timezone-shifted JS Dates.
types.setTypeParser(1082, (v) => v);

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/enmaa',
  max: 10,
  options: '-c TimeZone=UTC',
});

async function all(sql, params = []) { return (await pool.query(sql, params)).rows; }
async function one(sql, params = []) { return (await pool.query(sql, params)).rows[0] || null; }
async function run(sql, params = []) { return pool.query(sql, params); }

const SCHEMA = `
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  pass_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  lang TEXT,
  name TEXT,
  email TEXT,
  organisation TEXT,
  country TEXT,
  phone TEXT,
  subject TEXT,
  message TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  file_path TEXT,
  file_name TEXT,
  notes TEXT NOT NULL DEFAULT '',
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS submissions_type_status ON submissions (type, status);
CREATE INDEX IF NOT EXISTS submissions_created ON submissions (created_at DESC);
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT true,
  hero_image TEXT,
  brochure TEXT,
  site_area TEXT,
  t JSONB NOT NULL DEFAULT '{}',
  chapters JSONB NOT NULL DEFAULT '[]',
  gallery JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  image TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  t JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS page_views (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  day DATE NOT NULL,
  path TEXT NOT NULL,
  lang TEXT NOT NULL,
  device TEXT NOT NULL,
  source TEXT,
  visitor TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS page_views_day ON page_views (day);
CREATE TABLE IF NOT EXISTS vacancies (
  id SERIAL PRIMARY KEY,
  active BOOLEAN NOT NULL DEFAULT true,
  posted_date DATE NOT NULL,
  t JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Edited interface texts; anything not here falls back to src/i18n.js.
CREATE TABLE IF NOT EXISTS texts (
  key TEXT PRIMARY KEY,
  en TEXT,
  ar TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE texts ADD COLUMN IF NOT EXISTS it TEXT;
ALTER TABLE texts ADD COLUMN IF NOT EXISTS tr TEXT;
ALTER TABLE texts ADD COLUMN IF NOT EXISTS zh TEXT;
-- Media library: every uploaded image or PDF.
CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  name TEXT,
  size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Editable lists on the pages (hero slides, What we do, values, sectors, ...).
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  image TEXT,
  link TEXT,
  t JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS items_kind ON items (kind, sort);
`;

// ---------- password hashing ----------
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [, saltHex, hashHex] = String(stored).split('$');
  if (!saltHex || !hashHex) return false;
  const hash = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 64);
  return crypto.timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
}

// ---------- settings ----------
const DEFAULT_SETTINGS = {
  contact_email: 'info@enmaa.ly',
  contact_phone: '',
  contact_address_en: 'Tripoli, Libya',
  contact_address_ar: 'طرابلس، ليبيا',
  social_linkedin: '',
  social_instagram: '',
  social_x: '',
  social_facebook: '',
  vendor_form_url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=7EwyoRHD-kCiA0mVchsnpr-NJDCJKwNFpWvP4f8mmtRUNjdLOUpTSzJRSTlURFFGSTI5NzJYVjNTTC4u',
  hr_reference_url: 'https://forms.gle/RkL6szsZDT5JKsZLA',
  investment_ranges: 'Under USD 1 million\nUSD 1–10 million\nUSD 10–50 million\nAbove USD 50 million',
  legal_privacy_en: 'The Privacy Policy will be published here once it is provided by ENMAA Legal.',
  legal_privacy_ar: 'ستُنشر سياسة الخصوصية هنا فور اعتمادها من الإدارة القانونية في إنماء.',
  legal_terms_en: 'The Terms of Use will be published here once they are provided by ENMAA Legal.',
  legal_terms_ar: 'ستُنشر شروط الاستخدام هنا فور اعتمادها من الإدارة القانونية في إنماء.',
  legal_accessibility_en: 'ENMAA aims to meet WCAG 2.1 AA across this website. If you find something that is hard to use, please tell us through the contact page.',
  // Italian / Turkish / Chinese: empty = the English text is shown
  contact_address_it: 'Tripoli, Libia', contact_address_tr: 'Trablus, Libya', contact_address_zh: '利比亚的黎波里',
  legal_privacy_it: '', legal_terms_it: '', legal_accessibility_it: '',
  legal_privacy_tr: '', legal_terms_tr: '', legal_accessibility_tr: '',
  legal_privacy_zh: '', legal_terms_zh: '', legal_accessibility_zh: '',
  legal_accessibility_ar: 'تسعى إنماء إلى تحقيق معايير WCAG 2.1 AA في هذا الموقع. إذا واجهت أي صعوبة في الاستخدام، يُرجى إبلاغنا عبر صفحة التواصل.',
  // Page images (edited under "Page images" in the dashboard)
  img_band: '/img/sunset-city.jpg',
  img_hero_developments: '/img/commercial.jpg',
  img_hero_careers: '/img/dining.jpg',
  img_hero_vendors: '/img/tower.jpg',
  img_hero_investors: '/img/community.jpg',
  img_hero_news: '/img/flags.jpg',
  img_hero_contact: '/img/hq.jpg',
  img_share: '/img/hero.jpg',
};

// ---------- editable lists ----------
// kind -> which fields the dashboard shows. Seeded from the original texts in src/i18n.js.
const ITEM_KINDS = {
  hero_slide: { label: 'Hero slides', fields: ['image', 'title'] },
  service: { label: 'What we do', fields: ['image', 'title', 'text'] },
  value: { label: 'Values', fields: ['image', 'title', 'text'] },
  partner: { label: 'Partner logos', fields: ['image', 'title', 'link'] },
  careers_photo: { label: 'Careers photos', fields: ['image'] },
  dev_keyword: { label: 'Development keywords', fields: ['image', 'title', 'text', 'scene'] },
  sector: { label: 'Investor sectors', fields: ['image', 'title', 'text'] },
  discipline: { label: 'Vendor disciplines', fields: ['title', 'text'] },
  document: { label: 'Vendor documents', fields: ['title'] },
};

async function seedItems() {
  const { n } = await one('SELECT COUNT(*)::int AS n FROM items');
  if (n > 0) return;
  const { translator, LANGS } = require('./i18n');
  const tt = (titleKey, textKey) => JSON.stringify(Object.fromEntries(LANGS.map((l) => {
    const tr = translator(l);
    return [l, { title: titleKey ? tr(titleKey) : '', text: textKey ? tr(textKey) : '' }];
  })));
  const add = (kind, sort, image, t, link = '') =>
    run('INSERT INTO items (kind, sort, image, link, t) VALUES ($1, $2, $3, $4, $5)', [kind, sort, image, link, t]);

  const slides = ['/img/golf.jpg', '/img/sunset-city.jpg', '/img/hero.jpg', '/img/marina.jpg'];
  const services = ['/img/community.jpg', '/img/commercial.jpg', '/img/waterfront.jpg', '/img/mixed.jpg'];
  for (let i = 1; i <= 4; i++) {
    await add('hero_slide', i, slides[i - 1], tt(`type_${i}`));
    await add('service', i, services[i - 1], tt(`type_${i}`, `type_${i}_text`));
  }
  const valueImgs = ['/img/dining.jpg', '/img/family.jpg', '/img/marina.jpg', '/img/boat.jpg', '/img/interior.jpg'];
  for (let i = 1; i <= 5; i++) await add('value', i, valueImgs[i - 1], tt(`value_${i}`, `value_${i}_text`));
  const careers = ['/img/family.jpg', '/img/interior.jpg', '/img/boat.jpg', '/img/celebrate.jpg'];
  for (let i = 0; i < careers.length; i++) await add('careers_photo', i + 1, careers[i], '{}');
  const sectors = [['residential', '/img/villas.jpg'], ['commercial', '/img/sunset-city.jpg'], ['hospitality', '/img/lagoon.jpg'], ['mixed', '/img/marina.jpg']];
  for (let i = 0; i < sectors.length; i++) await add('sector', i + 1, sectors[i][1], tt(`sector_${sectors[i][0]}`, `sector_${sectors[i][0]}_text`));
  for (let i = 1; i <= 5; i++) await add('discipline', i, '', tt(`disc_${i}`, `disc_${i}_text`));
  for (let i = 1; i <= 6; i++) await add('document', i, '', tt(`doc_${i}`));
}

// 3D elements a keyword can show on Our Developments.
const SCENES = ['sea', 'centre', 'park', 'towers', 'villas', 'resort', 'offices', 'desert'];

async function getItems(kind, { all: includeHidden = false } = {}) {
  return all(`SELECT * FROM items WHERE kind = $1 ${includeHidden ? '' : 'AND active'} ORDER BY sort, id`, [kind]);
}

// ---------- edited texts ----------
async function loadTexts() {
  const rows = await all('SELECT * FROM texts');
  require('./i18n').setOverrides(rows);
}

async function getSettings() {
  const rows = await all('SELECT key, value FROM settings');
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) s[r.key] = r.value;
  return s;
}
async function saveSettings(obj) {
  for (const [k, v] of Object.entries(obj)) {
    if (k in DEFAULT_SETTINGS) {
      await run('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [k, String(v ?? '')]);
    }
  }
}

// ---------- first admin ----------
async function ensureAdmin() {
  const { n } = await one('SELECT COUNT(*)::int AS n FROM admins');
  if (n > 0) return null;
  const username = process.env.ADMIN_USER || 'admin';
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  await run('INSERT INTO admins (username, pass_hash) VALUES ($1, $2)', [username, hashPassword(password)]);
  if (!process.env.ADMIN_PASSWORD) {
    const file = path.join(DATA_DIR, 'initial-admin.txt');
    fs.writeFileSync(file, `ENMAA dashboard — first login\nusername: ${username}\npassword: ${password}\n\nChange this password from the dashboard (Account), then delete this file.\n`);
    return file;
  }
  return null;
}

// ---------- seed content (illustrative; replace from the dashboard) ----------
async function seed() {
  const { n } = await one('SELECT COUNT(*)::int AS n FROM projects');
  if (n > 0) return;

  const gal = (imgs) => JSON.stringify(imgs.map(([src, label]) => ({ src: `/img/${src}.jpg`, label, credit: '' })));
  const projects = [
    ['waterfront-district', 1, true, '/img/waterfront.jpg', '',
      { en: { name: 'Waterfront District', line: 'A coastal destination of promenades, residences and leisure.', location: 'Coastal city', type: 'Mixed-use waterfront', masterplanner: 'Approved partner', overview: 'A waterfront district designed around the sea: public promenades, beaches and a marina, with homes, hospitality and retail set back behind generous landscape.\n\nThe district is planned as a destination for residents and visitors alike, connecting the city to its coastline.' },
        ar: { name: 'حي الواجهة البحرية', line: 'وجهة ساحلية تجمع الممشى والمساكن والترفيه.', location: 'مدينة ساحلية', type: 'واجهة بحرية متعددة الاستخدامات', masterplanner: 'شريك معتمد', overview: 'حي على الواجهة البحرية مصمم حول البحر: ممشى عام وشواطئ ومرسى، مع مساكن وفنادق ومتاجر تحيط بها مساحات خضراء واسعة.\n\nخُطط الحي ليكون وجهة للسكان والزوار على حد سواء، تربط المدينة بساحلها.' } },
      [{ image: '/img/boat.jpg', t: { en: { title: 'Life by the sea', text: 'Every street leads to the water, with shaded walks and open views.' }, ar: { title: 'حياة على البحر', text: 'كل شارع يقود إلى الماء، مع ممرات مظللة وإطلالات مفتوحة.' } } }],
      [['waterfront', 'Render'], ['lagoon', 'Render'], ['marina', 'Lifestyle'], ['boat', 'Lifestyle'], ['kayak', 'Lifestyle'], ['balcony', 'Render']]],
    ['garden-community', 2, true, '/img/community.jpg', '',
      { en: { name: 'Garden Community', line: 'A masterplanned neighbourhood of homes, parks and schools.', location: 'Approved city', type: 'Masterplanned community', masterplanner: 'Approved partner', overview: 'A residential community planned around parks and everyday amenities, where families can walk to school, sport and shops.\n\nStreets are shaded and calm, with community facilities at the heart of each neighbourhood.' },
        ar: { name: 'المجتمع الأخضر', line: 'حي مخطط يضم مساكن وحدائق ومدارس.', location: 'مدينة معتمدة', type: 'مجتمع سكني مخطط', masterplanner: 'شريك معتمد', overview: 'مجتمع سكني مخطط حول الحدائق والخدمات اليومية، حيث يمكن للعائلات الوصول سيرًا إلى المدرسة والرياضة والمتاجر.\n\nشوارع هادئة ومظللة، ومرافق مجتمعية في قلب كل حي.' } },
      [{ image: '/img/family.jpg', t: { en: { title: 'Made for families', text: 'Parks, schools and daily needs within a short walk of every home.' }, ar: { title: 'مصمم للعائلات', text: 'حدائق ومدارس واحتياجات يومية على بُعد خطوات من كل منزل.' } } }],
      [['community', 'Render'], ['villas', 'Render'], ['golf', 'Lifestyle'], ['family', 'Lifestyle'], ['aerial-green', 'Render']]],
    ['harbour-residences', 3, false, '/img/residences.jpg', '',
      { en: { name: 'Harbour Residences', line: 'Residences overlooking the harbour.', location: 'Coastal city', type: 'Residential', masterplanner: 'Approved partner', overview: 'A collection of residences with terraces facing the harbour, designed for light, views and privacy.' },
        ar: { name: 'مساكن الميناء', line: 'مساكن تطل على الميناء.', location: 'مدينة ساحلية', type: 'سكني', masterplanner: 'شريك معتمد', overview: 'مجموعة من المساكن بشرفات تطل على الميناء، صُممت للضوء والإطلالة والخصوصية.' } },
      [], [['residences', 'Render'], ['balcony', 'Render'], ['interior', 'Lifestyle'], ['sunrise', 'Render']]],
    ['central-business-district', 4, false, '/img/commercial.jpg', '',
      { en: { name: 'Central Business District', line: 'A commercial district for business and enterprise.', location: 'Approved city', type: 'Commercial district', masterplanner: 'Approved partner', overview: 'A commercial district of offices, hotels and public spaces, planned to attract regional and international business.' },
        ar: { name: 'حي الأعمال المركزي', line: 'حي تجاري للأعمال والمؤسسات.', location: 'مدينة معتمدة', type: 'حي تجاري', masterplanner: 'شريك معتمد', overview: 'حي تجاري يضم مكاتب وفنادق ومساحات عامة، مخطط لاستقطاب الأعمال الإقليمية والدولية.' } },
      [], [['commercial', 'Render'], ['sunset-city', 'Render'], ['tower', 'Render'], ['dining', 'Lifestyle']]],
    ['lagoon-resort', 5, false, '/img/lagoon.jpg', '',
      { en: { name: 'Lagoon Resort', line: 'Hospitality and leisure around a protected lagoon.', location: 'Coastal city', type: 'Hospitality', masterplanner: 'Approved partner', overview: 'A resort destination built around a calm lagoon, with hotels, villas and beach clubs.' },
        ar: { name: 'منتجع البحيرة', line: 'ضيافة وترفيه حول بحيرة محمية.', location: 'مدينة ساحلية', type: 'ضيافة', masterplanner: 'شريك معتمد', overview: 'وجهة سياحية حول بحيرة هادئة، تضم فنادق وفلل ونوادي شاطئية.' } },
      [], [['lagoon', 'Render'], ['waterfront', 'Render'], ['kayak', 'Lifestyle']]],
    ['city-park-quarter', 6, false, '/img/mixed.jpg', '',
      { en: { name: 'City Park Quarter', line: 'A mixed-use quarter around a central park.', location: 'Approved city', type: 'Mixed-use', masterplanner: 'Approved partner', overview: 'Homes, offices and shops arranged around a new city park.' },
        ar: { name: 'حي حديقة المدينة', line: 'حي متعدد الاستخدامات حول حديقة مركزية.', location: 'مدينة معتمدة', type: 'متعدد الاستخدامات', masterplanner: 'شريك معتمد', overview: 'مساكن ومكاتب ومتاجر حول حديقة جديدة في قلب المدينة.' } },
      [], [['mixed', 'Render'], ['aerial-green', 'Render'], ['family', 'Lifestyle']]],
  ];
  for (const [slug, sort, featured, hero, area, t, chapters, g] of projects) {
    await run('INSERT INTO projects (slug, sort, featured, hero_image, site_area, t, chapters, gallery) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [slug, sort, featured, hero, area, JSON.stringify(t), JSON.stringify(chapters), gal(g)]);
  }

  const news = [
    ['enmaa-brand-launch', '2026-10-20', '/img/flags.jpg', {
      en: { title: 'Sample headline: ENMAA introduces its new brand identity', category: 'Company', summary: 'Sample summary — replace from the dashboard.', body: 'This is sample news content. Replace it with approved news from the dashboard before launch.' },
      ar: { title: 'عنوان تجريبي: إنماء تطلق هويتها الجديدة', category: 'الشركة', summary: 'ملخص تجريبي — يُستبدل من لوحة التحكم.', body: 'هذا محتوى إخباري تجريبي. يُستبدل بالأخبار المعتمدة من لوحة التحكم قبل الإطلاق.' } }],
    ['waterfront-design-update', '2026-10-05', '/img/sunrise.jpg', {
      en: { title: 'Sample headline: design update on a coastal district', category: 'Developments', summary: 'Sample summary — replace from the dashboard.', body: 'This is sample news content. Replace it with approved news from the dashboard before launch.' },
      ar: { title: 'عنوان تجريبي: تحديث التصميم لحي ساحلي', category: 'المشاريع', summary: 'ملخص تجريبي — يُستبدل من لوحة التحكم.', body: 'هذا محتوى إخباري تجريبي. يُستبدل بالأخبار المعتمدة من لوحة التحكم قبل الإطلاق.' } }],
    ['new-strategic-partnership', '2026-09-18', '/img/dining.jpg', {
      en: { title: 'Sample headline: a new strategic partnership announced', category: 'Partnerships', summary: 'Sample summary — replace from the dashboard.', body: 'This is sample news content. Replace it with approved news from the dashboard before launch.' },
      ar: { title: 'عنوان تجريبي: الإعلان عن شراكة استراتيجية جديدة', category: 'الشراكات', summary: 'ملخص تجريبي — يُستبدل من لوحة التحكم.', body: 'هذا محتوى إخباري تجريبي. يُستبدل بالأخبار المعتمدة من لوحة التحكم قبل الإطلاق.' } }],
  ];
  for (const [slug, date, image, t] of news) {
    await run('INSERT INTO news (slug, date, image, t) VALUES ($1,$2,$3,$4)', [slug, date, image, JSON.stringify(t)]);
  }

  const vacancies = [
    ['2026-10-28', { en: { title: 'Senior Urban Planner', department: 'Planning & Design', city: 'Tripoli', description: 'Sample vacancy — replace from the dashboard.' }, ar: { title: 'مخطط عمراني أول', department: 'التخطيط والتصميم', city: 'طرابلس', description: 'وظيفة تجريبية — تُستبدل من لوحة التحكم.' } }],
    ['2026-10-21', { en: { title: 'Project Manager', department: 'Projects', city: 'Benghazi', description: 'Sample vacancy — replace from the dashboard.' }, ar: { title: 'مدير مشروع', department: 'المشاريع', city: 'بنغازي', description: 'وظيفة تجريبية — تُستبدل من لوحة التحكم.' } }],
    ['2026-10-14', { en: { title: 'Marketing Specialist', department: 'Marketing', city: 'Tripoli', description: 'Sample vacancy — replace from the dashboard.' }, ar: { title: 'أخصائي تسويق', department: 'التسويق', city: 'طرابلس', description: 'وظيفة تجريبية — تُستبدل من لوحة التحكم.' } }],
  ];
  for (const [date, t] of vacancies) {
    await run('INSERT INTO vacancies (posted_date, t) VALUES ($1,$2)', [date, JSON.stringify(t)]);
  }
}

// Create tables; on an empty database, import the earlier SQLite data if present, otherwise seed samples.
// City for the developments filter; sample projects get sample values once.
async function migrateProjects() {
  await run("ALTER TABLE projects ADD COLUMN IF NOT EXISTS scale TEXT NOT NULL DEFAULT 'mixed'");
  const samples = {
    'waterfront-district': ['mixed', 'Tripoli', 'طرابلس'],
    'garden-community': ['low', 'Benghazi', 'بنغازي'],
    'harbour-residences': ['high', 'Tripoli', 'طرابلس'],
    'central-business-district': ['high', 'Tripoli', 'طرابلس'],
    'lagoon-resort': ['low', 'Misrata', 'مصراتة'],
    'city-park-quarter': ['mixed', 'Benghazi', 'بنغازي'],
  };
  for (const [slug, [scale, en, ar]] of Object.entries(samples)) {
    await run(`UPDATE projects SET scale = $2,
      t = jsonb_set(jsonb_set(t, '{en,city}', to_jsonb($3::text), true), '{ar,city}', to_jsonb($4::text), true)
      WHERE slug = $1 AND COALESCE(t->'en'->>'city', '') = ''`, [slug, scale, en, ar]);
  }
  // Example development showing the four "What we do" photos.
  await run(`UPDATE projects SET hero_image = '/img/mixed.jpg', gallery = $1
    WHERE slug = 'city-park-quarter' AND jsonb_array_length(gallery) = 3 AND gallery->0->>'src' = '/img/mixed.jpg'`,
  [JSON.stringify(['community', 'commercial', 'waterfront', 'mixed'].map((n) => ({ src: `/img/${n}.jpg`, label: 'Render', credit: '' })))]);

  // Development keywords ("By the sea", "High-rise towers", ...): the buttons on Our Developments.
  // Each keyword shows one element in the 3D model (items.extra.scene) and is ticked on each project
  // (projects.categories holds the keyword ids). Mock keywords and assignments are added once.
  await run("ALTER TABLE projects ADD COLUMN IF NOT EXISTS categories JSONB NOT NULL DEFAULT '[]'");
  await run("ALTER TABLE items ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'");
  const { n } = await one("SELECT COUNT(*)::int AS n FROM items WHERE kind = 'dev_keyword'");
  if (n > 0) return;
  await run("DELETE FROM items WHERE kind = 'dev_category'"); // replaced by keywords
  const keywords = [
    ['sea', 'By the sea', 'على البحر', 'Coastline, beach and sea views.', 'ساحل وشاطئ وإطلالات بحرية.'],
    ['centre', 'City centre', 'وسط المدينة', 'Streets, squares and everything close by.', 'شوارع وساحات وكل شيء قريب.'],
    ['park', 'Parks & green', 'حدائق ومساحات خضراء', 'Trees, gardens and open green space.', 'أشجار وحدائق ومساحات خضراء مفتوحة.'],
    ['towers', 'High-rise towers', 'أبراج عالية', 'Apartments and offices high above the city.', 'شقق ومكاتب في أبراج تعلو المدينة.'],
    ['villas', 'Villas & low-rise', 'فلل ومبانٍ منخفضة', 'Family homes and low-rise neighbourhoods.', 'منازل عائلية وأحياء منخفضة الارتفاع.'],
    ['resort', 'Resort & leisure', 'منتجع وترفيه', 'Hotels, pools and places to unwind.', 'فنادق ومسابح وأماكن للاسترخاء.'],
    ['offices', 'Offices & business', 'مكاتب وأعمال', 'Workplaces and commercial buildings.', 'أماكن عمل ومبانٍ تجارية.'],
  ];
  const ids = {};
  for (let i = 0; i < keywords.length; i++) {
    const [scene, en, ar, enText, arText] = keywords[i];
    const row = await one('INSERT INTO items (kind, sort, t, extra) VALUES ($1, $2, $3, $4) RETURNING id',
      ['dev_keyword', i + 1, JSON.stringify({ en: { title: en, text: enText }, ar: { title: ar, text: arText } }), JSON.stringify({ scene })]);
    ids[scene] = row.id;
  }
  const assign = {
    'waterfront-district': ['sea', 'towers', 'resort'],
    'garden-community': ['park', 'villas'],
    'harbour-residences': ['sea', 'towers'],
    'central-business-district': ['centre', 'towers', 'offices'],
    'lagoon-resort': ['sea', 'resort', 'villas'],
    'city-park-quarter': ['centre', 'park', 'towers', 'offices'],
  };
  for (const [slug, keys] of Object.entries(assign)) {
    await run('UPDATE projects SET categories = $2 WHERE slug = $1', [slug, JSON.stringify(keys.map((k) => ids[k]))]);
  }
}

// Mock data, round 2: every sample development gets its own photos (no photo shared between
// developments) and every keyword button gets a photo. Runs once.
async function mockPhotosV2() {
  if (await one("SELECT 1 FROM settings WHERE key = 'migration_mock_photos_v2'")) return;
  const sets = {
    'waterfront-district': ['waterfront', 'marina', 'boat', 'kayak'],
    'garden-community': ['community', 'villas', 'golf', 'family'],
    'harbour-residences': ['residences', 'balcony', 'interior', 'sunrise'],
    'central-business-district': ['commercial', 'sunset-city', 'tower', 'hq'],
    'lagoon-resort': ['lagoon', 'dining', 'silhouette', 'celebrate'],
    'city-park-quarter': ['mixed', 'aerial-green', 'hero', 'suit'],
  };
  const labels = ['Render', 'Render', 'Lifestyle', 'Lifestyle'];
  for (const [slug, imgs] of Object.entries(sets)) {
    const gallery = imgs.map((n, i) => ({ src: `/img/${n}.jpg`, label: labels[i], credit: '' }));
    await run('UPDATE projects SET hero_image = $2, gallery = $3 WHERE slug = $1', [slug, `/img/${imgs[0]}.jpg`, JSON.stringify(gallery)]);
  }
  const kwImages = { sea: 'boat', centre: 'sunset-city', park: 'aerial-green', towers: 'tower', villas: 'villas', resort: 'lagoon', offices: 'hq', desert: 'desert' };
  for (const [scene, img] of Object.entries(kwImages)) {
    await run("UPDATE items SET image = $2 WHERE kind = 'dev_keyword' AND extra->>'scene' = $1 AND COALESCE(image, '') = ''", [scene, `/img/${img}.jpg`]);
  }
  await run("INSERT INTO settings (key, value) VALUES ('migration_mock_photos_v2', '1') ON CONFLICT (key) DO NOTHING");
}

// More sample news so the home-page news ring has enough stories (editable / removable in the dashboard).
async function mockNewsV1() {
  if (await one("SELECT 1 FROM settings WHERE key = 'migration_mock_news_v1'")) return;
  const body = { en: 'This is sample news content. Replace it with approved news from the dashboard before launch.', ar: 'هذا محتوى إخباري تجريبي. يُستبدل بالأخبار المعتمدة من لوحة التحكم قبل الإطلاق.' };
  const news = [
    ['marina-promenade-opens', '2026-10-28', '/img/kayak.jpg', ['Sample headline: the marina promenade welcomes its first visitors', 'Developments', 'A first look at the waterfront walk, cafés and boat moorings.'],
      ['عنوان تجريبي: ممشى المرسى يستقبل أول زوّاره', 'المشاريع', 'نظرة أولى على الممشى البحري والمقاهي ومراسي القوارب.']],
    ['community-masterplan-approved', '2026-10-12', '/img/community.jpg', ['Sample headline: masterplan approved for a new garden community', 'Planning', 'Homes, schools and parks planned around walkable streets.'],
      ['عنوان تجريبي: اعتماد المخطط العام لحيّ سكني جديد', 'التخطيط', 'مساكن ومدارس وحدائق حول شوارع مريحة للمشي.']],
    ['enmaa-new-headquarters', '2026-09-30', '/img/hq.jpg', ['Sample headline: ENMAA moves into its new headquarters', 'Company', 'A new home for our growing planning and delivery teams.'],
      ['عنوان تجريبي: إنماء تنتقل إلى مقرّها الجديد', 'الشركة', 'مقرّ جديد لفرق التخطيط والتنفيذ المتنامية.']],
    ['golf-district-design-competition', '2026-09-08', '/img/golf.jpg', ['Sample headline: international design competition for a golf district', 'Design', 'Leading studios invited to shape a new leisure destination.'],
      ['عنوان تجريبي: مسابقة تصميم دولية لحيّ الغولف', 'التصميم', 'دعوة نخبة من المكاتب لتصميم وجهة ترفيهية جديدة.']],
    ['lagoon-resort-partners', '2026-08-21', '/img/lagoon.jpg', ['Sample headline: hospitality partners named for the lagoon resort', 'Partnerships', 'World-class operators join the coastal resort project.'],
      ['عنوان تجريبي: الإعلان عن شركاء الضيافة لمنتجع البحيرة', 'الشراكات', 'مشغّلون عالميون ينضمّون إلى مشروع المنتجع الساحلي.']],
  ];
  for (const [slug, date, image, en, ar] of news) {
    const t = { en: { title: en[0], category: en[1], summary: en[2], body: body.en }, ar: { title: ar[0], category: ar[1], summary: ar[2], body: body.ar } };
    await run('INSERT INTO news (slug, date, image, t) VALUES ($1,$2,$3,$4) ON CONFLICT (slug) DO NOTHING', [slug, date, image, JSON.stringify(t)]);
  }
  await run("INSERT INTO settings (key, value) VALUES ('migration_mock_news_v1', '1') ON CONFLICT (key) DO NOTHING");
}

// Lists (hero slides, values, sectors, ...) were seeded in English and Arabic only. Fill in the
// Italian / Turkish / Chinese wording for every entry still showing an original text. Runs once;
// entries already given a text in that language are left alone.
async function listLanguagesV1() {
  if (await one("SELECT 1 FROM settings WHERE key = 'migration_list_langs_v1'")) return;
  const { DICT, LANGS } = require('./i18n');
  const extra = LANGS.filter((l) => l !== 'en' && l !== 'ar' && Object.keys(DICT[l]).length);
  const keyOf = new Map(Object.entries(DICT.en).map(([k, v]) => [v, k]));
  for (const it of await all('SELECT id, t FROM items')) {
    const t = it.t || {};
    let changed = false;
    for (const l of extra) {
      for (const field of ['title', 'text']) {
        const key = keyOf.get(t.en?.[field]);
        if (!key || !DICT[l][key] || (t[l]?.[field] || '').trim()) continue;
        t[l] = { ...(t[l] || {}), [field]: DICT[l][key] };
        changed = true;
      }
    }
    if (changed) await run('UPDATE items SET t = $2 WHERE id = $1', [it.id, JSON.stringify(t)]);
  }
  await run("INSERT INTO settings (key, value) VALUES ('migration_list_langs_v1', '1') ON CONFLICT (key) DO NOTHING");
}

async function init() {
  await pool.query(SCHEMA);
  const { n } = await one('SELECT COUNT(*)::int AS n FROM projects');
  if (n === 0) {
    const sqliteFile = path.join(DATA_DIR, 'enmaa.db');
    if (fs.existsSync(sqliteFile)) {
      const imported = await require('./import-sqlite')(sqliteFile, pool);
      if (imported) console.log(`Imported existing content from ${sqliteFile}`);
    }
    await seed();
  }
  await seedItems();
  await migrateProjects();
  await mockPhotosV2();
  await mockNewsV1();
  await listLanguagesV1();
  // Developments banner: the old default photo becomes the skyline (a photo chosen in the dashboard is kept)
  await run("UPDATE settings SET value = '/img/commercial.jpg' WHERE key = 'img_hero_developments' AND value = '/img/aerial-green.jpg'");
  await loadTexts();
  return ensureAdmin();
}

module.exports = { pool, all, one, run, init, getSettings, saveSettings, DEFAULT_SETTINGS, ITEM_KINDS, SCENES, getItems, loadTexts, hashPassword, verifyPassword };
