// Visitor statistics without cookies or personal data.
// Each page view stores the page, language, device type, where the visit came from, and an
// anonymous visitor id = hash(daily secret + IP + browser). The secret changes every day and
// the IP itself is never stored, so a person counts once per day and cannot be traced.
const crypto = require('crypto');
const { one, run } = require('./db');

const TZ = process.env.ANALYTICS_TZ || 'Africa/Tripoli';
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const today = () => dayFmt.format(new Date()); // YYYY-MM-DD in Libya time

const BOTS = /bot|crawl|spider|slurp|archiver|facebookexternalhit|embedly|whatsapp|telegram|skype|slack|discord|preview|headless|lighthouse|pagespeed|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|undici|go-http|java\/|okhttp|httpclient|scrapy|semrush|ahrefs|mj12|dotbot|petal|yandex|baidu|bytespider|gptbot|claudebot|ccbot|perplexity/i;

function device(ua) {
  if (/iPad|Tablet|PlayBook|Silk|Kindle|(Android(?!.*Mobile))/i.test(ua)) return 'tablet';
  if (/Mobi|iPhone|iPod|Android|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

const SOURCES = [
  [/(^|\.)google\./, 'Google'], [/(^|\.)bing\.com$/, 'Bing'], [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'], [/(^|\.)yahoo\./, 'Yahoo'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'LinkedIn'], [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'Facebook'], [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)(twitter\.com|x\.com|t\.co)$/, 'X (Twitter)'], [/(^|\.)whatsapp\.(com|net)$/, 'WhatsApp'], [/(^|\.)youtube\.com$/, 'YouTube'],
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, 'ChatGPT'],
];
const SOURCE_NAMES = { google: 'Google', bing: 'Bing', linkedin: 'LinkedIn', facebook: 'Facebook', fb: 'Facebook', instagram: 'Instagram', twitter: 'X (Twitter)', x: 'X (Twitter)', whatsapp: 'WhatsApp', youtube: 'YouTube', newsletter: 'Newsletter', email: 'Email' };

// Where the visit came from. Returns null for clicks inside our own site.
function source(req) {
  const utm = String(req.query.utm_source || '').trim().toLowerCase().slice(0, 60);
  if (utm) return SOURCE_NAMES[utm] || utm;
  const ref = req.get('referer');
  if (!ref) return 'Direct';
  let host;
  try {
    const u = new URL(ref);
    if (u.protocol === 'android-app:') return u.hostname || 'Android app';
    host = u.hostname.toLowerCase().replace(/^www\./, '');
  } catch { return 'Direct'; }
  if (host === String(req.hostname || '').toLowerCase().replace(/^www\./, '')) return null;
  const hit = SOURCES.find(([re]) => re.test(host));
  return hit ? hit[1] : host;
}

// The daily secret lives in the database only for the current day, so restarts keep counting correctly.
let secret = { day: '', value: '' };
let loading = null;
function dailySecret(day) {
  if (secret.day === day) return Promise.resolve(secret.value);
  loading = loading || loadSecret(day).finally(() => { loading = null; });
  return loading;
}
async function loadSecret(day) {
  const row = await one("SELECT value FROM settings WHERE key = 'analytics_secret'");
  let saved = null;
  try { saved = row && JSON.parse(row.value); } catch { saved = null; }
  if (saved && saved.day === day) secret = saved;
  else {
    secret = { day, value: crypto.randomBytes(24).toString('hex') };
    await run("INSERT INTO settings (key, value) VALUES ('analytics_secret', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [JSON.stringify(secret)]);
  }
  return secret.value;
}

// Express middleware for the public pages (mounted on the /:lang router).
function track(req, res, next) {
  if (req.method !== 'GET') return next();
  const ua = req.get('user-agent') || '';
  const purpose = `${req.get('purpose') || ''} ${req.get('sec-purpose') || ''}`;
  if (!ua || BOTS.test(ua) || /prefetch|prerender/i.test(purpose)) return next();
  // read these now: the router changes req.path / req.params once the request moves on
  const page = req.path === '/' ? '/' : req.path.replace(/\/+$/, '');
  const lang = req.params.lang;
  const from = source(req);
  res.on('finish', () => {
    if (res.statusCode !== 200 || !/html/.test(res.get('content-type') || '')) return;
    const day = today();
    dailySecret(day).then((s) => {
      const visitor = crypto.createHash('sha256').update(`${s}|${req.ip}|${ua}`).digest('hex').slice(0, 32);
      return run('INSERT INTO page_views (day, path, lang, device, source, visitor) VALUES ($1, $2, $3, $4, $5, $6)',
        [day, page.slice(0, 300), lang, device(ua), from, visitor]);
    }).catch((err) => console.error('analytics:', err.message));
  });
  next();
}

module.exports = { track, today, TZ };
