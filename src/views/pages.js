const { layout, esc, paras, eIcon, arrow, sectionHeader, formatDate, V: ASSET_V } = require('./layout');
const forms = require('./forms');
const { srcsetFor, largest } = require('../images');

// Responsive <img>: the browser picks a sharp WebP at the right width for the screen.
// `sizes` describes how wide the image is shown. Non-hero images fade in once loaded.
const img = (src, alt, cls = '', lazy = true, sizes = '100vw') => {
  const r = srcsetFor(src, sizes);
  const fade = !/\b(hero-img|values-img|story-photo)\b/.test(cls);
  const classes = [cls, fade ? 'fade' : ''].filter(Boolean).join(' ');
  return `<img src="${esc(r ? r.src : src)}"${r ? ` srcset="${r.srcset}" sizes="${r.sizes}"` : ''} alt="${esc(alt)}"${classes ? ` class="${classes}"` : ''}${lazy ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"'}>`;
};
const S = {
  half: '(max-width: 767px) 100vw, 50vw',
  third: '(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw',
  quarter: '(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 25vw',
};

function facts(t, p, cls = 'facts') {
  const rows = [
    ['fact_type', p.type],
    ['fact_area', p.site_area ? `${p.site_area} m²` : ''],
    ['fact_masterplanner', p.masterplanner],
  ].filter(([, v]) => v && String(v).trim());
  return `<dl class="${cls}">${rows.map(([k, v]) => `<div><dt>${esc(t(k))}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}

function imageLabel(t, label) {
  const key = { Render: 'label_render', Lifestyle: 'label_lifestyle', Photo: 'label_photo' }[label];
  return key ? `<span class="img-label">${esc(t(key))}</span>` : '';
}

function pageHero(ctx, { eyebrow, title, text, image, actions = '', small = false }) {
  return `<section class="hero${small ? ' hero--small' : ''}">
    <div class="hero-media" data-parallax="0.25">${img(image, '', 'hero-img', false)}</div>
    <div class="hero-shade"></div>
    <div class="wrap hero-content" data-hero-fade>
      ${eyebrow ? `<p class="eyebrow reveal"><span class="eyebrow-line"></span>${esc(eyebrow)}</p>` : ''}
      <h1 class="h1" data-split="chars">${esc(title)}</h1>
      ${text ? `<p class="hero-text reveal">${esc(text)}</p>` : ''}
      ${actions ? `<div class="hero-actions reveal">${actions}</div>` : ''}
    </div>
  </section>`;
}

// ---------------- HOME ----------------
const pad = (n) => String(n).padStart(2, '0');
const chevron = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

function home(ctx, { featured, news, slides, services, values, partners }) {
  const { t, lang, settings } = ctx;

  const body = `
  <section class="hero hero--home" data-slideshow>
    <div class="hero-media" data-parallax="0.3">
      ${slides.map((sl, i) => `<div class="hero-slide${i === 0 ? ' is-active' : ''}" data-slide="${i}">${img(sl.image, '', 'hero-img', i > 0)}</div>`).join('')}
    </div>
    <div class="hero-shade"></div>
    <div class="wrap hero-content hero-center" data-hero-fade>
      <p class="hero-kicker reveal">${esc(t('hero_eyebrow'))}</p>
      <h1 class="hero-tagline"><span class="tl-line" aria-hidden="true"></span><span data-split="chars">${esc(t('hero_title'))}</span><span class="tl-line" aria-hidden="true"></span></h1>
      <p class="hero-text reveal">${esc(t('hero_text'))}</p>
    </div>
    ${slides.length > 1 ? `<button type="button" class="hero-arrow hero-arrow--prev" data-step="-1" aria-label="${esc(t('prev_slide'))}">${chevron}</button>
    <button type="button" class="hero-arrow hero-arrow--next" data-step="1" aria-label="${esc(t('next_slide'))}">${chevron}</button>` : ''}
    <div class="hero-base"><div class="wrap hero-base-inner">
      <div class="hero-actions reveal">
        <a class="btn btn-hero" href="/${lang}/developments">${esc(t('hero_explore'))} ${arrow}</a>
        <a class="text-link text-link--light" href="#story">${esc(t('hero_story'))} ${arrow}</a>
      </div>
      <ul class="hero-tabs" style="--tabs:${Math.max(1, slides.length)}" data-stagger>${slides.map((sl, i) => `<li class="reveal"><button type="button" class="hero-tab${i === 0 ? ' is-active' : ''}" data-goto="${i}" aria-pressed="${i === 0}">
        <span class="hero-tab-num">${pad(i + 1)}</span><span class="hero-tab-label">${esc(sl.title)}</span><span class="hero-tab-bar"><b></b></span></button></li>`).join('')}</ul>
      <span class="hero-current" data-current aria-hidden="true">${esc(slides[0] ? slides[0].title : '')}</span>
      ${slides.length > 1 ? `<button type="button" class="hero-pause reveal" data-pause aria-label="${esc(t('pause_slideshow'))}" data-label-pause="${esc(t('pause_slideshow'))}" data-label-play="${esc(t('play_slideshow'))}"><span aria-hidden="true"></span></button>` : ''}
    </div></div>
  </section>

  <section class="story" id="story">
    <div class="wrap story-inner">
      <div class="sec-rule sec-rule--center"><span class="rule"></span>${eIcon()}<span class="sec-label">${esc(t('label_we_are'))}</span><span class="rule"></span></div>
      <p class="story-statement" data-scrub>${esc(t('we_are_title'))}</p>
      <div class="story-foot reveal">
        <p class="lead">${esc(t('we_are_text'))}</p>
        <a class="text-link" href="/${lang}/developments">${esc(t('hero_cta'))} ${arrow}</a>
      </div>
    </div>
  </section>

  ${featured.length ? `<section class="chapter chapter--tight">
    <div class="wrap">
      <div class="row-head">${sectionHeader(t('label_developments'))}<a class="text-link" href="/${lang}/developments">${esc(t('all_developments'))} ${arrow}</a></div>
      ${featured.map((p, i) => `<article class="feature${i % 2 ? ' feature--rev' : ''}">
        <a class="feature-media img-zoom" href="/${lang}/developments/${esc(p.slug)}" tabindex="-1" aria-hidden="true"><span class="pimg" data-parallax="0.12">${img(p.hero_image, p.name, '', true, '(max-width: 767px) 100vw, 60vw')}</span></a>
        <div class="feature-body reveal">
          <h3 class="h3">${esc(p.name)}</h3>
          <p class="muted">${esc(p.location)}</p>
          <p>${esc(p.line)}</p>
          ${facts(t, p)}
          <a class="btn btn-primary" href="/${lang}/developments/${esc(p.slug)}">${esc(t('view_project'))}</a>
        </div>
      </article>`).join('')}
    </div>
  </section>` : ''}

  <section class="chapter chapter--grey what-we-do">
    <div class="wrap">
      <div class="row-head">${sectionHeader(t('label_what_we_do'), t('what_we_do_title'))}
        <div class="panel-count" aria-hidden="true"><span data-panel-index>01</span><i></i><span>${pad(services.length)}</span></div></div>
      <div class="panels" data-panels>${services.map((sv, i) => `<article class="panel${i === 0 ? ' is-active' : ''}" data-panel="${i}" tabindex="0" aria-label="${esc(sv.title)}">
        <div class="panel-media">${img(sv.image, sv.title, '', true, '(max-width: 767px) 100vw, 62vw')}</div>
        <div class="panel-shade"></div>
        <span class="panel-num">${pad(i + 1)}</span>
        <h3 class="panel-vtitle" aria-hidden="true">${esc(sv.title)}</h3>
        <div class="panel-body">
          <h3 class="h3">${esc(sv.title)}</h3>
          <p>${esc(sv.text)}</p>
          <a class="text-link text-link--light" href="${esc(sv.link || `/${lang}/developments`)}">${esc(t('all_developments'))} ${arrow}</a>
        </div>
        <span class="panel-bar"><b></b></span>
      </article>`).join('')}</div>
    </div>
  </section>

  <section class="chapter values-section">
    <div class="wrap"><div class="values-card">
      <div class="values-side">
        ${sectionHeader(t('label_values'), t('values_title'))}
        <div class="values-media">${values.map((v, i) => img(v.image, '', `values-img${i === 0 ? ' is-on' : ''}`, true, '(max-width: 767px) 100vw, 45vw')).join('')}
          <div class="values-badge" aria-hidden="true"><b data-value-num>01</b><span data-value-title>${esc(values[0] ? values[0].title : '')}</span></div></div>
      </div>
      <ol class="values" data-stagger>${values.map((v, i) => `<li data-value="${i}" tabindex="0"><span class="num">${pad(i + 1)}</span><div><h3 class="h5">${esc(v.title)}</h3><p>${esc(v.text)}</p></div></li>`).join('')}</ol>
    </div></div>
  </section>

  <section class="band">
    <div class="band-media" data-parallax="0.35">${img(settings.img_band, '')}</div>
    <div class="band-shade"></div>
    <div class="wrap band-content">
      <div class="sec-rule sec-rule--light">${eIcon()}<span class="rule"></span><span class="sec-label">${esc(t('purpose_label'))}</span></div>
      <p class="band-title" data-split="words">${esc(t('purpose_title'))}</p>
      <a class="text-link text-link--light reveal" href="/${lang}/investors">${esc(t('path_invest_cta'))} ${arrow}</a>
    </div>
  </section>

  ${newsOrbit(ctx, news)}

  ${partners.length ? `<section class="partners" aria-label="${esc(t('label_partners'))}">
    <div class="wrap">${sectionHeader(t('label_partners'))}</div>
    <div class="partners-strip"><div class="partners-track">${[0, 1].map((dup) => `<ul${dup ? ' aria-hidden="true"' : ''}>${partners.map((pt) => `<li>${pt.link
      ? `<a href="${esc(pt.link)}" target="_blank" rel="noopener"${dup ? ' tabindex="-1"' : ''}>${img(pt.image, pt.title, '', true, '180px')}</a>`
      : img(pt.image, pt.title, '', true, '180px')}</li>`).join('')}</ul>`).join('')}</div></div>
  </section>` : ''}

  <section class="chapter chapter--plum">
    <div class="wrap">
      ${sectionHeader(t('label_find_way'), t('find_way_title'), { light: true })}
      <div class="paths" data-stagger>
        ${[['invest', 'investors'], ['vendors', 'vendors'], ['careers', 'careers']].map(([k, href]) => `<a class="path-card" href="/${lang}/${href}">
          <span class="eyebrow">${esc(t(`path_${k}_eyebrow`))}</span>
          <h3 class="h3">${esc(t(`path_${k}`))}</h3>
          <p>${esc(t(`path_${k}_text`))}</p>
          <span class="text-link">${esc(t(`path_${k}_cta`))} ${arrow}</span>
        </a>`).join('')}
      </div>
    </div>
  </section>`;
  return layout({ ...ctx, active: 'home' }, body);
}

// Home: news cards standing on the inside of a slowly turning ring.
// Fewer than 8 stories are repeated (as hidden copies) so the ring stays full.
function newsOrbit(ctx, news) {
  const { t, lang } = ctx;
  if (!news.length) return `<section class="chapter chapter--tight"><div class="wrap">${sectionHeader(t('label_news'), t('news_title'))}<p class="muted">${esc(t('no_news'))}</p></div></section>`;
  const total = Math.max(8, news.length);
  const ring = Array.from({ length: total }, (_, i) => news[i % news.length]);
  const chev = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
  return `<section class="news-orbit" id="news" aria-roledescription="carousel" aria-label="${esc(t('news_title'))}">
    <div class="wrap news-orbit-head reveal">
      <span class="news-pill"><i></i>${esc(t('label_news'))}</span>
      <h2 class="h2">${esc(t('news_title'))}</h2>
      <p class="news-hint">${esc(t('news_drag'))}</p>
    </div>
    <div class="orbit-stage" data-orbit tabindex="0" aria-label="${esc(t('news_drag'))}">
      <div class="orbit-floor" aria-hidden="true"></div>
      <div class="orbit-ring">${ring.map((n, i) => `<a class="orbit-card" href="/${lang}/#news=${esc(n.slug)}" data-real="${i % news.length}"${i >= news.length ? ' aria-hidden="true" tabindex="-1"' : ''} draggable="false">
          <span class="orbit-img">${img(n.image, '', '', true, '360px')}</span>
          <span class="orbit-meta"><i></i>${n.category ? `${esc(n.category)} · ` : ''}<time datetime="${esc(n.date)}">${formatDate(n.date, lang)}</time></span>
          <span class="orbit-title">${esc(n.title)}</span>
          ${n.summary ? `<span class="orbit-sum">${esc(n.summary)}</span>` : ''}
          <span class="orbit-more">${esc(t('read_more'))} ${arrow}</span>
        </a>`).join('')}</div>
    </div>
    <div class="wrap orbit-controls">
      <button type="button" class="orbit-btn" data-orbit-step="-1" aria-label="${esc(t('news_prev'))}">${chev('M15 5l-7 7 7 7')}</button>
      <span class="orbit-count"><b data-orbit-n>01</b><i></i><span>${pad(news.length)}</span></span>
      <button type="button" class="orbit-btn" data-orbit-step="1" aria-label="${esc(t('news_next'))}">${chev('M9 5l7 7-7 7')}</button>
    </div>
    <p class="sr-only" aria-live="polite" data-orbit-live></p>
    ${news.map((n, i) => `<template data-story="${i}">
      <div class="story-media">${n.image ? img(n.image, n.title, 'story-photo', false, '(max-width: 767px) 100vw, 920px') : ''}<div class="story-media-shade"></div>
        <p class="story-meta">${n.category ? `<span class="story-cat">${esc(n.category)}</span>` : ''}<time datetime="${esc(n.date)}">${formatDate(n.date, lang)}</time></p></div>
      <div class="story-body">
        <h2 class="story-title" id="story-title">${esc(n.title)}</h2>
        ${n.summary ? `<p class="story-lead">${esc(n.summary)}</p>` : ''}
        <div class="story-text">${paras(n.body)}</div>
      </div>
      <a data-story-href data-slug="${esc(n.slug)}" href="/${lang}/#news=${esc(n.slug)}" hidden></a>
    </template>`).join('')}
    <dialog class="story-modal" aria-labelledby="story-title" data-story-modal>
      <div class="story-scrim" data-story-close></div>
      <div class="story-panel" role="document">
        <div class="story-progress" aria-hidden="true"><i data-story-progress></i></div>
        <button type="button" class="story-close" data-story-close aria-label="${esc(t('close'))}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>
        <div class="story-content" data-story-content></div>
        <div class="story-bar">
          <button type="button" class="story-nav" data-story-step="-1">${chev('M15 5l-7 7 7 7')}<span>${esc(t('news_prev'))}</span></button>
          <div class="story-actions">
            <button type="button" class="story-copy" data-story-copy data-done="${esc(t('link_copied'))}">${esc(t('copy_link'))}</button>
          </div>
          <button type="button" class="story-nav story-nav--next" data-story-step="1"><span>${esc(t('news_next'))}</span>${chev('M9 5l7 7-7 7')}</button>
        </div>
      </div>
    </dialog>
    <script src="/js/news-orbit.js?v=${ASSET_V}" defer></script>
  </section>`;
}


// ---------------- DEVELOPMENTS ----------------
function projectCard(ctx, p, catNames = {}) {
  const { t, lang } = ctx;
  const thumbs = p.gallery.filter((g) => g.src !== p.hero_image).slice(0, 3);
  const extra = Math.max(0, p.gallery.length - 1 - thumbs.length);
  const tags = p.categories.map((id) => catNames[id]).filter(Boolean).slice(0, 2);
  return `<article class="p-card" data-slug="${esc(p.slug)}" data-cats="${esc(p.categories.join(','))}" data-city="${esc(p.cityKey || '')}">
    <a href="/${lang}/developments/${esc(p.slug)}" class="p-card-link">
      <div class="p-main img-zoom">${img(p.hero_image, p.name, '', true, S.third)}</div>
      ${thumbs.length ? `<div class="p-thumbs">${thumbs.map((g, i) => `<div class="p-thumb">${img(g.src, '', '', true, '(max-width: 767px) 33vw, 12vw')}${i === thumbs.length - 1 && extra > 0 ? `<span class="p-more">+${extra}</span>` : ''}</div>`).join('')}</div>` : ''}
      ${tags.length ? `<p class="p-tags">${tags.map((tg) => `<span class="tag">${esc(tg)}</span>`).join('')}</p>` : ''}
      <h2 class="h4 p-title"><span>${esc(p.name)}</span></h2>
      <p class="p-loc">${esc(p.city || p.location)}</p>
      ${facts(t, p, 'facts facts--rows')}
    </a>
  </article>`;
}

// Small line icons for the keyword buttons, one per 3D element.
const SCENE_ICONS = {
  sea: '<path d="M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 20c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M12 3v6M9 6l3-3 3 3"/>',
  centre: '<path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/>',
  park: '<path d="M12 21v-6M7 15h10l-5-11z"/><path d="M4 21h16"/>',
  towers: '<path d="M4 21V9h5v12M9 21V3h6v18M15 21v-9h5v9M2 21h20"/>',
  villas: '<path d="M3 11l9-7 9 7M5 10v11h14V10M10 21v-6h4v6"/>',
  resort: '<path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9zM12 12v9M8 21h8"/>',
  offices: '<path d="M4 21V5h16v16M8 9h2M14 9h2M8 13h2M14 13h2M8 17h2M14 17h2M2 21h20"/>',
  desert: '<path d="M2 18c4-6 8-6 12 0M10 18c3-4 7-5 12-2M2 21h20M17 5a2 2 0 1 0 0 .1"/>',
};
const sceneIcon = (scene) => `<svg class="kw-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${SCENE_ICONS[scene] || SCENE_ICONS.centre}</svg>`;

function developments(ctx, { projects, keywords = [] }) {
  const { t, settings, lang } = ctx;
  const kwNames = Object.fromEntries(keywords.map((k) => [k.id, k.title]));
  const countFor = (id) => projects.filter((p) => p.categories.includes(id)).length;
  const photo = (src) => (srcsetFor(src) ? `/r/800${src}` : src);
  const firstPara = (txt) => String(txt || '').split(/\n\s*\n/)[0].slice(0, 420);
  // Everything the keyword explorer needs, including the detail panel content.
  const data = {
    keywords: keywords.map((k) => ({ id: k.id, title: k.title, scenes: k.scenes && k.scenes.length ? k.scenes : ['centre'] })),
    projects: projects.map((p) => ({
      slug: p.slug, name: p.name, city: p.city, line: p.line, type: p.type, overview: firstPara(p.overview),
      facts: [[t('fact_location'), p.location], [t('fact_type'), p.type], [t('fact_area'), p.site_area ? `${p.site_area} m²` : ''], [t('fact_masterplanner'), p.masterplanner]].filter(([, v]) => v),
      url: `/${lang}/developments/${p.slug}`, keywords: p.categories,
      photos: [...new Set([p.hero_image, ...p.gallery.map((g) => g.src)])].slice(0, 6).map(photo),
    })),
    text: {
      start: t('kw_start'), matches: t.forms('kw_matches'), none: t('kw_none'), open: t('kw_open'), lang: ctx.lang,
      full: t('kw_full'), interest: t('register_interest'), close: t('close'), count: t.forms('developments_count'),
    },
  };
  const body = `
  ${pageHero(ctx, { title: t('dev_hero_title'), text: t('dev_hero_text'), image: settings.img_hero_developments, small: true })}
  <section class="kw-explorer" data-kw>
    <div class="kw-layout">
      <div class="kw-panel">
        ${sectionHeader(t('kw_label'), t('kw_title'))}
        <p class="kw-intro">${esc(t('kw_intro'))}</p>
        <div class="kw-buttons" role="group" aria-label="${esc(t('kw_title'))}">${keywords.map((k) => `<button type="button" class="kw-btn" data-kw-id="${k.id}" aria-pressed="false">
          <span class="kw-photo">${k.image ? img(k.image, '', '', true, '120px') : ''}<span class="kw-badge">${sceneIcon(k.scene)}</span></span>
          <span class="kw-txt"><b>${esc(k.title)}</b>${k.text ? `<small>${esc(k.text)}</small>` : ''}
            <span class="kw-count">${esc(t.plural('developments_count', countFor(k.id)))}</span></span>
          <span class="kw-tick" aria-hidden="true"></span>
        </button>`).join('')}</div>
        <div class="kw-status">
          <p data-kw-status aria-live="polite">${esc(t('kw_start'))}</p>
          <button type="button" class="text-link" data-kw-clear hidden>${esc(t('kw_clear'))}</button>
        </div>
      </div>
      <div class="kw-right">
        <div class="kw-stage" data-kw-stage aria-hidden="true">
          <div class="kw-pins" data-kw-pins></div>
          <p class="kw-hint">${esc(t('kw_hint'))}</p>
          <div class="kw-loading"><span></span></div>
        </div>
        <div class="kw-matches" data-kw-matches aria-live="polite"></div>
      </div>
    </div>
    <div class="wrap kw-list" id="results">
      <p class="kw-list-count" data-kw-count>${esc(t.plural('developments_count', projects.length))}</p>
      <div class="p-grid" data-stagger>${projects.map((p) => projectCard(ctx, p, kwNames)).join('')}</div>
      <p class="dev-empty lead" data-empty hidden>${esc(t('kw_none'))}</p>
    </div>
  </section>
  <div class="kw-drawer" data-kw-drawer hidden>
    <div class="kw-drawer-backdrop" data-kw-close></div>
    <div class="kw-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="kw-drawer-title" tabindex="-1">
      <button type="button" class="kw-drawer-close" data-kw-close aria-label="${esc(t('close'))}">×</button>
      <div class="kw-drawer-body"></div>
    </div>
  </div>
  <script type="application/json" id="kw-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
  <script type="module" src="/js/dev3d.min.js?v=${ASSET_V}"></script>`;
  return layout({ ...ctx, active: 'developments' }, body);
}

function project(ctx, { p, others }) {
  const { t, lang } = ctx;
  const tabs = [['overview', t('tab_overview')]];
  if (p.chapters.length) tabs.push(['experience', t('tab_story')]);
  if (p.gallery.length) tabs.push(['gallery', t('tab_gallery')]);
  tabs.push(['enquire', t('tab_enquire')]);

  const body = `
  ${pageHero(ctx, {
    eyebrow: p.location, title: p.name, text: p.line, image: p.hero_image,
    actions: `${p.brochure ? `<a class="btn btn-light" href="${esc(p.brochure)}" download>${esc(t('download_brochure'))}</a>` : ''}
      <a class="${p.brochure ? 'text-link text-link--light' : 'btn btn-light'}" href="#enquire">${esc(t('register_interest'))}${p.brochure ? ` ${arrow}` : ''}</a>`,
  })}
  <nav class="tabs" aria-label="${esc(p.name)}"><div class="wrap"><ul>${tabs.map(([id, l]) => `<li><a href="#${id}">${esc(l)}</a></li>`).join('')}</ul></div></nav>

  <section class="fact-strip"><div class="wrap">
    <dl>${[['fact_location', p.location], ['fact_type', p.type], ['fact_area', p.site_area ? `${p.site_area} m²` : ''], ['fact_masterplanner', p.masterplanner]]
      .filter(([, v]) => v).map(([k, v]) => `<div><dt>${esc(t(k))}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  </div></section>

  <section class="chapter" id="overview">
    <div class="wrap split-intro">
      <div>${sectionHeader(t('tab_overview'))}</div>
      <div class="prose reveal"><p class="statement">${esc(p.line)}</p>${paras(p.overview)}</div>
    </div>
  </section>

  ${p.chapters.length ? `<section id="experience">${p.chapters.map((c, i) => `<div class="exp${i % 2 ? ' exp--rev' : ''}">
      <div class="exp-media img-zoom"><span class="pimg" data-parallax="0.12">${img(c.image, c.title, '', true, S.half)}</span></div>
      <div class="exp-body reveal"><h2 class="h3">${esc(c.title)}</h2>${paras(c.text)}</div>
    </div>`).join('')}</section>` : ''}

  ${p.gallery.length ? `<section class="chapter" id="gallery">
    <div class="wrap">
      ${sectionHeader(t('gallery'))}
      <div class="gallery" data-stagger>${p.gallery.map((g, i) => `<button class="g-item img-zoom" type="button" data-lightbox="${i}" data-src="${esc(largest(g.src))}" data-caption="${esc([g.label && t({ Render: 'label_render', Lifestyle: 'label_lifestyle', Photo: 'label_photo' }[g.label] || ''), g.credit].filter(Boolean).join(' · '))}">
        ${img(g.src, `${p.name} — ${i + 1}`, '', true, i === 0 ? '(max-width: 767px) 100vw, 66vw' : '(max-width: 767px) 50vw, 33vw')}${imageLabel(t, g.label)}</button>`).join('')}</div>
    </div>
  </section>` : ''}

  <section class="chapter chapter--grey" id="enquire">
    <div class="wrap split-form">
      <div>${sectionHeader(t('tab_enquire'), t('project_enquiry_title'))}<p class="lead">${esc(t('project_enquiry_text'))}</p></div>
      ${forms.projectEnquiryForm(ctx, p)}
    </div>
  </section>

  ${others.length ? `<section class="chapter chapter--tight">
    <div class="wrap">
      <div class="row-head">${sectionHeader(t('other_developments'))}<a class="text-link" href="/${lang}/developments">${esc(t('all_developments_link'))} ${arrow}</a></div>
      <div class="p-grid" data-stagger>${others.map((o) => projectCard(ctx, o)).join('')}</div>
    </div>
  </section>` : ''}
  <div class="lightbox" hidden role="dialog" aria-modal="true" aria-label="${esc(t('gallery'))}">
    <button class="lb-close" type="button" aria-label="${esc(t('close'))}">×</button>
    <button class="lb-prev" type="button" aria-label="Previous">‹</button>
    <figure><img alt=""><figcaption></figcaption></figure>
    <button class="lb-next" type="button" aria-label="Next">›</button>
  </div>`;
  return layout({ ...ctx, active: 'developments', title: p.name, description: p.line, ogImage: p.hero_image }, body);
}

// ---------------- CAREERS ----------------
function careers(ctx, { vacancies, photos }) {
  const { t, lang, settings } = ctx;
  const depts = [...new Set(vacancies.map((v) => v.department).filter(Boolean))];
  const cities = [...new Set(vacancies.map((v) => v.city).filter(Boolean))];
  const body = `
  ${pageHero(ctx, {
    eyebrow: t('careers_eyebrow'), title: t('careers_title'), text: t('careers_text'), image: settings.img_hero_careers,
    actions: `<a class="btn btn-light" href="#vacancies">${esc(t('view_vacancies'))}</a><a class="text-link text-link--light" href="#join">${esc(t('join_team'))} ${arrow}</a>`,
  })}
  <section class="chapter">
    <div class="wrap split-intro">
      <div>${sectionHeader(t('commitment_label'))}</div>
      <p class="statement" data-split="words">${esc(t('commitment_text'))}</p>
    </div>
    ${photos.length ? `<div class="wrap photo-strip" data-stagger>${photos.map((ph) => `<div class="img-zoom">${img(ph.image, ph.title, '', true, '(max-width: 767px) 50vw, 25vw')}</div>`).join('')}</div>` : ''}
  </section>

  <section class="chapter chapter--grey" id="vacancies">
    <div class="wrap">
      ${sectionHeader(t('vacancies_label'), t('vacancies_title'))}
      ${vacancies.length ? `<div class="vac-filters">
        <label class="sr-only" for="vac-q">${esc(t('search_roles'))}</label>
        <input id="vac-q" type="search" placeholder="${esc(t('search_roles'))}" data-vac-q>
        <label class="sr-only" for="vac-d">${esc(t('col_department'))}</label>
        <select id="vac-d" data-vac-d><option value="">${esc(t('all_departments'))}</option>${depts.map((d) => `<option>${esc(d)}</option>`).join('')}</select>
        <label class="sr-only" for="vac-c">${esc(t('col_city'))}</label>
        <select id="vac-c" data-vac-c><option value="">${esc(t('all_cities'))}</option>${cities.map((c) => `<option>${esc(c)}</option>`).join('')}</select>
      </div>
      <table class="vac-table">
        <thead><tr><th scope="col">${esc(t('col_position'))}</th><th scope="col">${esc(t('col_department'))}</th><th scope="col">${esc(t('col_city'))}</th><th scope="col">${esc(t('col_posted'))}</th><th scope="col"><span class="sr-only">${esc(t('apply'))}</span></th></tr></thead>
        <tbody>${vacancies.map((v) => `<tr data-dept="${esc(v.department)}" data-city="${esc(v.city)}" data-text="${esc(`${v.title} ${v.department} ${v.city}`.toLowerCase())}">
          <th scope="row"><span class="vac-title">${esc(v.title)}</span>${v.description ? `<span class="vac-desc">${esc(v.description)}</span>` : ''}</th>
          <td data-label="${esc(t('col_department'))}">${esc(v.department)}</td>
          <td data-label="${esc(t('col_city'))}">${esc(v.city)}</td>
          <td data-label="${esc(t('col_posted'))}"><time datetime="${esc(v.posted_date)}">${formatDate(v.posted_date, lang)}</time></td>
          <td><a class="text-link" href="#join" data-apply="${v.id}">${esc(t('apply'))} ${arrow}</a></td>
        </tr>`).join('')}</tbody>
      </table>
      <p class="muted vac-empty" hidden>${esc(t('no_match'))}</p>` : `<p class="lead">${esc(t('no_vacancies'))}</p>`}
    </div>
  </section>

  <section class="chapter" id="join">
    <div class="wrap split-form">
      <div>${sectionHeader(t('join_team'), t('join_title'))}<p class="lead">${esc(t('join_text'))}</p></div>
      ${forms.careerForm(ctx, vacancies)}
    </div>
  </section>`;
  return layout({ ...ctx, active: 'careers', title: t('nav_careers') }, body);
}

// ---------------- VENDORS ----------------
function vendors(ctx, { disciplines, documents }) {
  const { t, settings } = ctx;
  const formBtn = (cls) => `<a class="btn ${cls}" href="${esc(settings.vendor_form_url)}" target="_blank" rel="noopener">${esc(t('vendor_form_btn'))} <span aria-hidden="true">↗</span></a>`;
  const body = `
  ${pageHero(ctx, { eyebrow: t('vendors_eyebrow'), title: t('vendors_title'), text: t('vendors_text'), image: settings.img_hero_vendors, actions: formBtn('btn-light') })}
  <section class="chapter">
    <div class="wrap">
      ${sectionHeader(t('who_label'), t('who_title'))}
      <ol class="disc-grid" style="--cols:${Math.min(5, Math.max(1, disciplines.length))}" data-stagger>${disciplines.map((d, i) => `<li class="disc reveal"><span class="num">${pad(i + 1)}</span><h3 class="h5">${esc(d.title)}</h3><p>${esc(d.text)}</p></li>`).join('')}</ol>
    </div>
  </section>
  <section class="chapter chapter--grey">
    <div class="wrap split-intro">
      <div>${sectionHeader(t('prepare_label'), t('prepare_title'))}</div>
      <ul class="checklist" data-stagger>${documents.map((d) => `<li>${esc(d.title)}</li>`).join('')}</ul>
    </div>
  </section>
  <section class="chapter chapter--plum">
    <div class="wrap split-intro">
      <div>${sectionHeader(t('register_label'), t('register_title'), { light: true })}</div>
      <div>
        <p class="lead">${esc(t('vendors_text'))}</p>
        <ol class="steps" data-stagger>${[1, 2, 3].map((i) => `<li><span class="dot">${i}</span><p>${esc(t(`step_${i}`))}</p></li>`).join('')}</ol>
        <p class="muted-light">${esc(t('register_text'))}</p>
        ${formBtn('btn-light')}
      </div>
    </div>
  </section>`;
  return layout({ ...ctx, active: 'vendors', title: t('nav_vendors') }, body);
}

// ---------------- INVESTORS ----------------
function investors(ctx, { sectors }) {
  const { t, lang, settings } = ctx;
  const body = `
  ${pageHero(ctx, {
    eyebrow: t('inv_eyebrow'), title: t('inv_title'), text: t('inv_text'), image: settings.img_hero_investors,
    actions: `<a class="btn btn-light" href="#interest">${esc(t('register_interest'))}</a><a class="text-link text-link--light" href="/${lang}/developments">${esc(t('nav_developments'))} ${arrow}</a>`,
  })}
  <section class="chapter">
    <div class="wrap split-intro">
      <div>${sectionHeader(t('purpose_label'))}</div>
      <div><h2 class="h2 reveal">${esc(t('purpose_title'))}</h2><p class="lead reveal">${esc(t('purpose_text'))}</p></div>
    </div>
  </section>
  <section class="chapter chapter--grey">
    <div class="wrap">
      ${sectionHeader(t('sectors_label'), t('sectors_title'))}
      <div class="sectors" data-stagger>${sectors.map((sc) => `<a class="sector-card" href="#interest" data-sector="${esc(sc.key)}">
        <div class="img-zoom ratio-43">${img(sc.image, sc.title, '', true, S.quarter)}</div>
        <h3 class="h4">${esc(sc.title)}</h3><p>${esc(sc.text)}</p>
        <span class="text-link">${esc(t('sector_cta'))} ${arrow}</span></a>`).join('')}</div>
    </div>
  </section>
  <section class="chapter" id="interest">
    <div class="wrap split-form">
      <div>${sectionHeader(t('register_interest'), t('interest_title'))}<p class="lead">${esc(t('interest_text'))}</p></div>
      ${forms.investorForm(ctx, sectors)}
    </div>
  </section>`;
  return layout({ ...ctx, active: 'investors', title: t('nav_investors') }, body);
}

// ---------------- CONTACT / LEGAL / 404 ----------------
function contact(ctx) {
  const { t, lang, settings } = ctx;
  const address = settings[`contact_address_${lang}`] || settings.contact_address_en;
  const body = `
  ${pageHero(ctx, { eyebrow: t('contact_eyebrow'), title: t('contact_title'), text: t('contact_text'), image: settings.img_hero_contact, small: true })}
  <section class="chapter">
    <div class="wrap split-form">
      <div>
        ${sectionHeader(t('contact_details'))}
        <dl class="contact-list">
          ${address ? `<div><dt>${esc(t('address'))}</dt><dd>${esc(address)}</dd></div>` : ''}
          ${settings.contact_email ? `<div><dt>${esc(t('email'))}</dt><dd><a href="mailto:${esc(settings.contact_email)}">${esc(settings.contact_email)}</a></dd></div>` : ''}
          ${settings.contact_phone ? `<div><dt>${esc(t('phone'))}</dt><dd dir="ltr">${esc(settings.contact_phone)}</dd></div>` : ''}
        </dl>
      </div>
      ${forms.contactForm(ctx)}
    </div>
  </section>`;
  return layout({ ...ctx, active: 'contact', title: t('contact_title') }, body);
}

function legal(ctx, { key }) {
  const { t, lang, settings } = ctx;
  const title = t(`legal_${key}`);
  const text = settings[`legal_${key}_${lang}`] || settings[`legal_${key}_en`];
  const body = `<article class="article"><div class="wrap narrow prose"><h1 class="h2">${esc(title)}</h1>${paras(text)}</div></article>`;
  return layout({ ...ctx, active: 'legal', title, solidNav: true }, body);
}

function notFound(ctx) {
  const { t, lang } = ctx;
  const body = `<section class="article"><div class="wrap narrow"><h1 class="h2">${esc(t('not_found_title'))}</h1><p class="lead">${esc(t('not_found_text'))}</p><a class="btn btn-primary" href="/${lang}/">${esc(t('go_home'))}</a></div></section>`;
  return layout({ ...ctx, active: '404', title: t('not_found_title'), solidNav: true }, body);
}

module.exports = { home, developments, project, careers, vendors, investors, contact, legal, notFound };
