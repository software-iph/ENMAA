# ENMAA website

Corporate website (English + Arabic, right-to-left) with a dashboard for messages and content.
Built from the *ENMAA Website Developer Handoff v1.0*. The GIS Explorer is intentionally left out.

## Requirements

- Node.js 22.13 or newer
- PostgreSQL (tested with PostgreSQL 18)

## Setup

1. Create the database (once):

   ```bash
   psql -U postgres -c "CREATE DATABASE enmaa ENCODING 'UTF8' TEMPLATE template0;"
   ```

2. Copy `.env.example` to `.env` and set the connection string:

   ```
   DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/enmaa
   ```

3. Install and start:

   ```bash
   npm install
   npm start
   ```

Tables are created automatically on first start. If the database is empty and an older
`data/enmaa.db` (SQLite) file exists, its content and dashboard users are imported once;
otherwise sample content is added.

- Website: http://localhost:3000 (redirects to `/en/` or `/ar/`)
- Dashboard: http://localhost:3000/admin

If there is no dashboard user yet, one called `admin` is created with a random password saved in
`data/initial-admin.txt`. Sign in, change it under **Users & password**, then delete that file.
To choose the first login yourself, set `ADMIN_USER` and `ADMIN_PASSWORD` in `.env` before the first start.

Other settings in `.env`: `PORT` (default 3000), `BASE_URL` (public address, used for canonical/hreflang links and the sitemap).

## Dashboard

Everything on the website can be edited here, in English and Arabic, without code:

- **Home page** — Hero slides (photo + tab label), What we do panels, Values, Partner logos ("Working with" strip, hidden until a logo is added). Add, edit, hide, delete and reorder.
- **Content** — Developments (facts, main image, brochure PDF, gallery, story chapters, featured), News, Vacancies, Investor sectors (also fill the Register Interest form), Vendor disciplines, Vendor documents, Careers photos.
- **Site texts (EN / AR)** — every heading, button, label and form message, grouped by page with search. Empty = original wording.
- **Page images** — banner photos of each page, the home purpose band, the social share image.
- **Media library** — upload and reuse images/PDFs; every image field has "Choose from library".
- **Settings** — contact details, social links, vendor form URL, investment ranges, legal page texts.
- **Messages** — every website form lands here: Contact, Job application (with CV download), Investor interest, Project enquiry.
  Filter by form/status, search, mark New / In progress / Replied / Archived, add internal notes, reply by email, delete, export CSV.
- **Users & password** — change password, add or remove dashboard users.

## Our Developments — keyword explorer

Left: big keyword buttons ("By the sea", "City centre", "High-rise towers", …). Right: a 3D architectural
model (Three.js, `public/js/dev3d.js`, served from `node_modules/three`) that builds itself from the chosen
keywords. The model is a round city plan: every keyword owns its own slice (sea & beach at the front, then
resort, offices, city centre, towers, park, villas, desert), so elements never overlap. Developments that have **all** chosen keywords appear as pins on the model and in a
list; opening one shows a panel with its photos, keywords, description and facts. The cards below follow
the same rule. Choices are kept in the URL (`?k=3,5`). Without WebGL the model is hidden and everything
else still works.

Dashboard: **Development keywords** (title, short text, 3D element) and **Developments → edit → Keywords**
(tick everything that describes the development). The keywords and assignments shipped with the site are
mock data.

## Images

Photos are served through `/r/<width>/…` (see `src/images.js`): sharp WebP versions at 480–2000 px are made
on first request with `sharp` and cached in `data/img-cache/`, and each `<img>` lists them in `srcset` so phones
download small files and large screens get crisp ones. Upload the largest, best-quality original you have
(at least 2000 px wide for banners); the site handles the resizing.

## Animation

Motion lives in `public/css/motion.css` and `public/js/site.js`: intro screen (once per visit), split-text
headlines, image wipe reveals, parallax, a horizontal-scroll "What we do" section, marquee, scroll progress,
hide-on-scroll navigation, page fades and magnetic buttons.

Visitors whose system asks for reduced motion (on Windows: Settings → Accessibility → Visual effects →
**Animation effects** off) get gentle fades only, as the handoff requires. To preview full motion on such a
computer, open any page with `?motion=full`; `?motion=auto` switches back.

## Files

- `server.js` — public pages and form handling
- `src/admin.js` — dashboard API (login sessions, messages, content)
- `src/db.js` — PostgreSQL connection, schema and sample content
- `src/import-sqlite.js` — one-time import from the earlier SQLite file
- `src/i18n.js` — English and Arabic interface text
- `src/views/` — page templates
- `public/` — CSS, JS, brand fonts, logos, images
- `admin/` — dashboard front end
- `uploads/` — uploaded images and brochures (public), CVs in `uploads/cv` (only downloadable from the dashboard)

Back up the PostgreSQL database (`pg_dump enmaa`) and the `uploads/` folder.

## Before launch

- Replace the sample developments, news and vacancies (marked "Sample") and the brand-guideline mood photos with approved content.
- Web licences for Analogue, GE Dinar Two and GE SS Text.
- Legal texts (privacy, terms, consent wording) in **Settings**.
- Use a dedicated PostgreSQL user with a strong password instead of `postgres`.
- Run behind HTTPS (e.g. Nginx or a hosting platform) and set `BASE_URL`.
