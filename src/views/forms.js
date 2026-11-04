const { esc } = require('./layout');

const COUNTRIES_EN = ['Libya', 'Algeria', 'Egypt', 'Tunisia', 'Morocco', 'Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Turkey', 'Italy', 'China', 'United Kingdom', 'France', 'Germany', 'United States', 'Other'];

let uid = 0;
function field(t, { name, label, type = 'text', required = true, options, value, autocomplete, full, hint, rows = 5, attrs = '' }) {
  const id = `f-${name}-${++uid}`;
  const req = required ? ' required aria-required="true"' : '';
  const lbl = `<label for="${id}">${esc(label)}${required ? ' <span aria-hidden="true">*</span>' : ` <span class="opt">(${esc(t('optional'))})</span>`}</label>`;
  let control;
  if (type === 'select') {
    control = `<select id="${id}" name="${name}"${req} ${attrs}><option value="">${esc(t('choose'))}</option>${options.map((o) => {
      const [v, l] = Array.isArray(o) ? o : [o, o];
      return `<option value="${esc(v)}"${String(value) === String(v) ? ' selected' : ''}>${esc(l)}</option>`;
    }).join('')}</select>`;
  } else if (type === 'textarea') {
    control = `<textarea id="${id}" name="${name}" rows="${rows}"${req} ${attrs}>${esc(value)}</textarea>`;
  } else if (type === 'file') {
    control = `<div class="file-field"><input id="${id}" type="file" name="${name}"${req} accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" ${attrs}><span class="file-ui" aria-hidden="true"><span class="file-btn">${esc(t('cv_drop'))}</span><span class="file-name"></span></span></div>`;
  } else {
    control = `<input id="${id}" type="${type}" name="${name}"${value ? ` value="${esc(value)}"` : ''}${autocomplete ? ` autocomplete="${autocomplete}"` : ''}${req} ${attrs}>`;
  }
  return `<div class="field${full ? ' field--full' : ''}">${lbl}${control}${hint ? `<small class="hint">${esc(hint)}</small>` : ''}<p class="field-error" aria-live="polite"></p></div>`;
}

function formShell(ctx, { type, inner, submitLabel, extraHidden = '', multipart = false, successKey = 'form_success' }) {
  const { t, lang } = ctx;
  return `<form class="form" action="/api/forms/${type}" method="post" novalidate data-enhance${multipart ? ' enctype="multipart/form-data"' : ''} data-success="${esc(t(successKey))}">
    <input type="hidden" name="lang" value="${lang}">
    <input type="hidden" name="return_to" value="/${lang}${esc(ctx.path)}">
    ${extraHidden}
    <div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    <div class="form-grid">${inner}</div>
    <div class="field field--full consent">
      <label class="check"><input type="checkbox" name="consent" value="yes" required> <span>${esc(t('consent'))} <a href="/${lang}/privacy">${esc(t('legal_privacy'))}</a></span></label>
      <p class="field-error" aria-live="polite"></p>
    </div>
    <div class="form-foot">
      <button class="btn btn-primary" type="submit">${esc(submitLabel || t('send'))}</button>
      <p class="form-status" role="status" aria-live="polite"></p>
    </div>
  </form>`;
}

function countrySelect(t) {
  return field(t, { name: 'country', label: t('country'), type: 'select', options: COUNTRIES_EN, autocomplete: 'country-name' });
}

function contactForm(ctx) {
  const { t } = ctx;
  return formShell(ctx, {
    type: 'contact',
    inner: [
      field(t, { name: 'name', label: t('full_name'), autocomplete: 'name' }),
      field(t, { name: 'email', label: t('email'), type: 'email', autocomplete: 'email' }),
      field(t, { name: 'phone', label: t('phone'), type: 'tel', required: false, autocomplete: 'tel' }),
      field(t, { name: 'organisation', label: t('organisation'), required: false, autocomplete: 'organization' }),
      field(t, { name: 'subject', label: t('subject'), full: true }),
      field(t, { name: 'message', label: t('message'), type: 'textarea', full: true }),
    ].join(''),
  });
}

function projectEnquiryForm(ctx, project) {
  const { t } = ctx;
  return formShell(ctx, {
    type: 'project',
    extraHidden: `<input type="hidden" name="project" value="${esc(project.slug)}">`,
    inner: [
      field(t, { name: 'name', label: t('full_name'), autocomplete: 'name' }),
      field(t, { name: 'organisation', label: t('organisation'), required: false, autocomplete: 'organization' }),
      field(t, { name: 'email', label: t('email'), type: 'email', autocomplete: 'email' }),
      countrySelect(t),
      field(t, { name: 'message', label: t('message'), type: 'textarea', full: true, rows: 4 }),
    ].join(''),
  });
}

const SECTORS = ['residential', 'commercial', 'hospitality', 'mixed'];

function investorForm(ctx, sectors) {
  const { t, settings } = ctx;
  const ranges = String(settings.investment_ranges || '').split('\n').map((s) => s.trim()).filter(Boolean);
  return formShell(ctx, {
    type: 'investor',
    inner: [
      field(t, { name: 'name', label: t('full_name'), autocomplete: 'name' }),
      field(t, { name: 'organisation', label: t('organisation'), autocomplete: 'organization' }),
      field(t, { name: 'email', label: t('email'), type: 'email', autocomplete: 'email' }),
      countrySelect(t),
      field(t, { name: 'sector', label: t('sector'), type: 'select', options: sectors.map((sc) => [sc.key, sc.title]), attrs: 'data-sector-select' }),
      field(t, { name: 'investment_range', label: t('investment_range'), type: 'select', options: ranges }),
      field(t, { name: 'preferred_language', label: t('preferred_language'), type: 'select', options: [['ar', 'العربية'], ['en', 'English'], ['tr', 'Türkçe'], ['zh', '中文'], ['it', 'Italiano']], value: ctx.lang }),
      field(t, { name: 'message', label: t('message'), type: 'textarea', required: false, full: true, rows: 4 }),
    ].join(''),
  });
}

function careerForm(ctx, vacancies) {
  const { t } = ctx;
  const opts = vacancies.map((v) => [String(v.id), v.title]).concat([['general', t('general_application')]]);
  return formShell(ctx, {
    type: 'career',
    multipart: true,
    submitLabel: t('submit_application'),
    successKey: 'form_success_career',
    inner: [
      field(t, { name: 'first_name', label: t('first_name'), autocomplete: 'given-name' }),
      field(t, { name: 'last_name', label: t('last_name'), autocomplete: 'family-name' }),
      field(t, { name: 'email', label: t('email'), type: 'email', autocomplete: 'email', full: true }),
      field(t, { name: 'position', label: t('position'), type: 'select', options: opts, full: true, attrs: 'data-position-select' }),
      field(t, { name: 'cv', label: t('cv'), type: 'file', full: true, hint: t('cv_hint') }),
    ].join(''),
  });
}

module.exports = { contactForm, projectEnquiryForm, investorForm, careerForm, SECTORS };
