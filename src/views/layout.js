const { LANGS, DIR, LANG_NAMES } = require('../i18n');

// Changes on every server start so browsers fetch fresh CSS/JS after an update.
const V = Date.now().toString(36);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Paragraphs from plain text with blank-line separation.
const paras = (s) => String(s ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

// The brand "E" device: three forward strokes.
const eIcon = (cls = '') => `<svg class="e-icon ${cls}" viewBox="0 0 30 22" aria-hidden="true" focusable="false"><rect width="30" height="4"/><rect y="9" width="20" height="4"/><rect y="18" width="30" height="4"/></svg>`;
const arrow = `<span class="arr" aria-hidden="true">→</span>`;

function sectionHeader(label, title, opts = {}) {
  return `<div class="sec-head${opts.light ? ' sec-head--light' : ''}">
    <div class="sec-rule">${eIcon()}<span class="rule"></span><span class="sec-label">${esc(label)}</span></div>
    ${title ? `<h2 class="h2" data-split="words">${esc(title)}</h2>` : ''}
  </div>`;
}

function formatDate(iso, lang) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return esc(iso);
  return d.toLocaleDateString(lang === 'ar' ? 'ar-LY' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function nav(ctx) {
  const { t, lang, active, path } = ctx;
  const items = [
    ['home', '', t('nav_home')],
    ['developments', 'developments', t('nav_developments')],
    ['careers', 'careers', t('nav_careers')],
    ['vendors', 'vendors', t('nav_vendors')],
    ['investors', 'investors', t('nav_investors')],
  ];
  const links = items.map(([key, href, label]) =>
    `<li><a href="/${lang}/${href}" class="nav-link${active === key ? ' is-active' : ''}"${active === key ? ' aria-current="page"' : ''}>${esc(label)}</a></li>`).join('');
  const langLinks = LANGS.map((l) =>
    `<a href="/${l}${path}" hreflang="${l}" lang="${l}" class="lang-opt${l === lang ? ' is-current' : ''}"${l === lang ? ' aria-current="true"' : ''}>${LANG_NAMES[l]}</a>`).join('');
  const logo = lang === 'ar' ? '/logos/ar-white.png' : '/logos/en-white.png';
  return `<header class="site-nav${ctx.solidNav ? ' is-solid' : ''}" id="top">
  <a class="skip" href="#main">${esc(t('skip'))}</a>
  <div class="nav-inner">
    <a href="/${lang}/" class="nav-logo" aria-label="ENMAA — ${esc(t('nav_home'))}"><img src="${logo}" alt="ENMAA" width="186" height="26"></a>
    <nav aria-label="Main">
      <ul class="nav-list">${links}</ul>
    </nav>
    <a class="nav-cta" href="/${lang}/contact">${esc(t('footer_contact'))}</a>
    <div class="lang-switch" aria-label="${esc(t('language'))}">${langLinks}</div>
    <button class="menu-btn" aria-expanded="false" aria-controls="mobile-menu"><span class="sr-only">${esc(t('menu'))}</span><span class="menu-lines" aria-hidden="true"></span></button>
  </div>
  <div class="mobile-menu" id="mobile-menu" hidden>
    <ul>${items.map(([key, href, label]) => `<li><a href="/${lang}/${href}"${active === key ? ' aria-current="page"' : ''}>${esc(label)}</a></li>`).join('')}</ul>
    <div class="mobile-langs">${langLinks}</div>
  </div>
</header>`;
}

function footer(ctx) {
  const { t, lang, settings } = ctx;
  const year = new Date().getFullYear();
  const social = [['social_linkedin', 'LinkedIn'], ['social_instagram', 'Instagram'], ['social_x', 'X'], ['social_facebook', 'Facebook']]
    .filter(([k]) => settings[k]).map(([k, n]) => `<li><a href="${esc(settings[k])}" target="_blank" rel="noopener">${n}</a></li>`).join('');
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-brand">
      <img src="/logos/bil-white.png" alt="ENMAA إنماء" width="320" height="27" loading="lazy">
      ${settings.contact_email ? `<p><a href="mailto:${esc(settings.contact_email)}">${esc(settings.contact_email)}</a></p>` : ''}
      ${settings.contact_phone ? `<p dir="ltr">${esc(settings.contact_phone)}</p>` : ''}
      ${social ? `<ul class="social">${social}</ul>` : ''}
    </div>
    <div><h3 class="f-title">${esc(t('footer_company'))}</h3><ul>
      <li><a href="/${lang}/#story">${esc(t('footer_about'))}</a></li>
      <li><a href="/${lang}/#news">${esc(t('footer_news'))}</a></li>
      <li><a href="/${lang}/contact">${esc(t('footer_contact'))}</a></li></ul></div>
    <div><h3 class="f-title">${esc(t('footer_explore'))}</h3><ul>
      <li><a href="/${lang}/developments">${esc(t('nav_developments'))}</a></li>
      <li><a href="/${lang}/investors">${esc(t('nav_investors'))}</a></li></ul></div>
    <div><h3 class="f-title">${esc(t('footer_work'))}</h3><ul>
      <li><a href="/${lang}/careers">${esc(t('nav_careers'))}</a></li>
      <li><a href="/${lang}/vendors">${esc(t('nav_vendors'))}</a></li>
      <li><a href="${esc(settings.vendor_form_url)}" target="_blank" rel="noopener">${esc(t('footer_vendor_reg'))} ↗</a></li></ul></div>
    <div><h3 class="f-title">${esc(t('language'))}</h3><ul>
      ${LANGS.map((l) => `<li><a href="/${l}${ctx.path}" lang="${l}" hreflang="${l}">${l === 'ar' ? 'العربية' : 'English'}</a></li>`).join('')}</ul></div>
  </div>
  <div class="wrap footer-base">
    <span>© ${year} ENMAA. ${esc(t('rights'))}</span>
    <span class="legal-links"><a href="/${lang}/privacy">${esc(t('privacy'))}</a><a href="/${lang}/terms">${esc(t('terms'))}</a><a href="/${lang}/accessibility">${esc(t('accessibility'))}</a></span>
  </div>
</footer>`;
}

function layout(ctx, body) {
  const { lang, t, title, description, path, baseUrl } = ctx;
  const fullTitle = title ? `${title} · ENMAA` : `ENMAA — ${t('hero_title')}`;
  const alternates = LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${baseUrl}/${l}${path}">`).join('\n  ');
  return `<!doctype html>
<html lang="${lang}" dir="${DIR[lang]}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(description || t('meta_description'))}">
  ${alternates}
  <link rel="alternate" hreflang="x-default" href="${baseUrl}/en${path}">
  <link rel="canonical" href="${baseUrl}/${lang}${path}">
  <meta property="og:title" content="${esc(fullTitle)}">
  <meta property="og:description" content="${esc(description || t('meta_description'))}">
  <meta property="og:image" content="${baseUrl}${esc(ctx.ogImage || ctx.settings.img_share || '/img/hero.jpg')}">
  <meta name="theme-color" content="#2A162C">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/fonts/Analogue.otf" as="font" type="font/otf" crossorigin>
  <link rel="stylesheet" href="/css/site.css?v=${V}">
  <link rel="stylesheet" href="/css/motion.css?v=${V}">
  <link rel="stylesheet" href="/css/home.css?v=${V}">
  <link rel="stylesheet" href="/css/developments.css?v=${V}">
  <link rel="stylesheet" href="/css/responsive.css?v=${V}">
  <link rel="stylesheet" href="/css/theme.css?v=${V}">
  <link rel="stylesheet" href="/css/news.css?v=${V}">
  <script>(function(d){d.classList.add('js');try{
    var q=new URLSearchParams(location.search).get('motion');
    if(q==='full')localStorage.setItem('enmaa-motion','full');if(q==='auto')localStorage.removeItem('enmaa-motion');
    var reduce=localStorage.getItem('enmaa-motion')!=='full'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    d.classList.add(reduce?'reduce-motion':'full-motion');
    if(!reduce&&!sessionStorage.getItem('enmaa-intro')){d.classList.add('intro');sessionStorage.setItem('enmaa-intro','1')}
  }catch(e){}
    setTimeout(function(){if(!d.classList.contains('motion-ready'))d.classList.remove('js')},4000);
  })(document.documentElement)</script>
</head>
<body class="page-${esc(ctx.active || 'other')}${ctx.solidNav ? ' has-solid-nav' : ''}">
<div class="intro-screen" aria-hidden="true">
  <div class="intro-mark" dir="ltr">${eIcon('intro-e')}<span class="intro-word">${'ENMAA'.split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</span></div>
  <div class="intro-line"><i></i></div>
</div>
<div class="scroll-progress" aria-hidden="true"><i></i></div>
<div class="page-fade" aria-hidden="true"></div>
${nav(ctx)}
<main id="main">
${body}
</main>
${footer(ctx)}
<script>window.ENMAA=${JSON.stringify({ lang, i18n: { sending: t('sending'), err_required: t('err_required'), err_email: t('err_email'), err_consent: t('err_consent'), err_file: t('err_file'), form_error: t('form_error'), no_match: t('no_match') } }).replace(/</g, '\\u003c')}</script>
<script src="/js/site.js?v=${V}" defer></script>
</body>
</html>`;
}

module.exports = { layout, esc, paras, eIcon, arrow, sectionHeader, formatDate, V };
