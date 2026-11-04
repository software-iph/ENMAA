// Responsive images: /r/<width>/img/<file> or /r/<width>/uploads/images/<file>
// returns a sharpened WebP at that width, generated once and cached in data/img-cache.
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const CACHE = path.join(ROOT, 'data', 'img-cache');
fs.mkdirSync(CACHE, { recursive: true });

const WIDTHS = [480, 800, 1200, 1600, 2000];
const SOURCES = { img: path.join(ROOT, 'public', 'img'), 'uploads/images': path.join(ROOT, 'uploads', 'images') };
const RESPONSIVE = /^\/(img|uploads\/images)\/([^/?#]+\.(?:jpe?g|png|webp|avif))$/i;

const pending = new Map(); // avoid generating the same file twice at once

function srcsetFor(src, sizes = '100vw') {
  if (!RESPONSIVE.test(src || '')) return null;
  return {
    src: `/r/1200${src}`,
    srcset: WIDTHS.map((w) => `/r/${w}${src} ${w}w`).join(', '),
    sizes,
  };
}
// Largest version, for the gallery lightbox.
const largest = (src) => (RESPONSIVE.test(src || '') ? `/r/2000${src}` : src);

// Make one size of one photo (shared by visitors and the background warm-up).
function generate(source, out, width) {
  if (!pending.has(out)) {
    pending.set(out, sharp(source)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .sharpen({ sigma: 0.6 })
      .webp({ quality: 80, effort: 4 })
      .toFile(out + '.tmp')
      .then(() => fs.renameSync(out + '.tmp', out))
      .finally(() => pending.delete(out)));
  }
  return pending.get(out);
}
const cacheFile = (folder, file, width) => path.join(CACHE, `${folder.replace('/', '_')}__${width}__${file}.webp`);
const isFresh = (out, mtime) => fs.existsSync(out) && fs.statSync(out).mtimeMs >= mtime;

// Prepare all sizes of the given photos one at a time, in the background
// (one at a time keeps the server responsive for other sites on the same machine).
async function warm(list) {
  for (const [folder, file] of list) {
    const source = path.join(SOURCES[folder], file);
    let stat;
    try { stat = fs.statSync(source); } catch { continue; }
    for (const width of WIDTHS) {
      const out = cacheFile(folder, file, width);
      if (isFresh(out, stat.mtimeMs)) continue;
      try { await generate(source, out, width); } catch (e) { console.error('image warm-up:', file, e.message); }
    }
  }
}
function warmAll() {
  const list = Object.entries(SOURCES).flatMap(([folder, dir]) => {
    try { return fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).map((f) => [folder, f]); } catch { return []; }
  });
  const started = Date.now();
  warm(list).then(() => console.log(`Photos ready: ${list.length} photos x ${WIDTHS.length} sizes (${Math.round((Date.now() - started) / 1000)}s)`));
}
// Right after an upload in the dashboard.
const warmUploads = (files) => warm(files.map((f) => ['uploads/images', f])).catch(() => {});

async function handler(req, res, next) {
  const m = /^\/r\/(\d+)(\/.+)$/.exec(req.path);
  if (!m) return next();
  const width = Number(m[1]);
  const parts = RESPONSIVE.exec(m[2]);
  if (!WIDTHS.includes(width) || !parts) return res.status(404).end();
  const file = path.basename(parts[2]);
  const source = path.join(SOURCES[parts[1]], file);
  let stat;
  try { stat = fs.statSync(source); } catch { return res.status(404).end(); }

  const out = cacheFile(parts[1], file, width);
  if (!isFresh(out, stat.mtimeMs)) {
    try { await generate(source, out, width); } catch (e) { return next(e); }
  }
  res.set('Cache-Control', parts[1] === 'img' ? 'public, max-age=604800' : 'public, max-age=2592000, immutable');
  res.type('image/webp').sendFile(out);
}

module.exports = { handler, srcsetFor, largest, WIDTHS, warmAll, warmUploads };
