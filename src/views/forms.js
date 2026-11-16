const { esc } = require('./layout');

const COUNTRIES_EN = ['Libya', 'Algeria', 'Egypt', 'Tunisia', 'Morocco', 'Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Turkey', 'Italy', 'China', 'United Kingdom', 'France', 'Germany', 'United States', 'Other'];

let uid = 0;
function field(t, { name, label, type = 'text', required = true, options, value, autocomplete, full, hint, rows = 5, attrs = '', reqIf, accept, multiple, chooseLabel }) {
  const id = `f-${name}-${++uid}`;
  const req = required ? ' required aria-required="true"' : '';
  // reqIf: "applicant_kind=company" makes the field required only when that other field has that value
  const mark = required ? ' <span aria-hidden="true">*</span>' : reqIf ? ' <span class="req-if" aria-hidden="true" hidden>*</span>' : ` <span class="opt">(${esc(t('optional'))})</span>`;
  const lbl = `<label for="${id}">${esc(label)}${mark}</label>`;
  if (reqIf) attrs += ` data-req-if="${esc(reqIf)}"`;
  if (type === 'check') {
    return `<div class="field field--full decl"><label class="check"><input id="${id}" type="checkbox" name="${name}" value="yes"${req}> <span>${esc(label)}</span></label><p class="field-error" aria-live="polite"></p></div>`;
  }
  let control;
  if (type === 'select') {
    control = `<select id="${id}" name="${name}"${req} ${attrs}><option value="">${esc(t('choose'))}</option>${options.map((o) => {
      const [v, l] = Array.isArray(o) ? o : [o, o];
      return `<option value="${esc(v)}"${String(value) === String(v) ? ' selected' : ''}>${esc(l)}</option>`;
    }).join('')}</select>`;
  } else if (type === 'textarea') {
    control = `<textarea id="${id}" name="${name}" rows="${rows}"${req} ${attrs}>${esc(value)}</textarea>`;
  } else if (type === 'file') {
    const acc = accept || '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    control = `<div class="file-field"><input id="${id}" type="file" name="${name}"${req} accept="${acc}"${multiple ? ' multiple' : ''} ${attrs}><span class="file-ui" aria-hidden="true"><span class="file-btn">${esc(chooseLabel || t('cv_drop'))}</span><span class="file-name"></span></span></div>`;
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
  // Ranges are edited in Settings, one per line in each language. The English line is what gets saved,
  // so the dashboard always shows the same wording whatever language the visitor used.
  const lines = (v) => String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const enRanges = lines(settings.investment_ranges);
  const local = lines(settings[`investment_ranges_${ctx.lang}`]);
  const ranges = enRanges.map((en, i) => [en, (local.length === enRanges.length && local[i]) || en]);
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

// Vendor registration (replaces the old Microsoft Forms link). Saved in the dashboard with a reference number.
const COLLAB_TYPES = ['supplier', 'contractor', 'consultant', 'service', 'partner', 'other'];
const DOC_ACCEPT = '.pdf,.docx,.jpg,.jpeg,.png';
function vendorForm(ctx) {
  const { t, lang } = ctx;
  const sec = (key) => `<h3 class="form-sec field--full">${esc(t(key))}</h3>`;
  const fileOpts = { type: 'file', required: false, full: true, accept: DOC_ACCEPT, hint: t('files_hint'), chooseLabel: t('files_choose'), attrs: 'data-doc' };
  return formShell(ctx, {
    type: 'vendor',
    multipart: true,
    submitLabel: t('vendor_submit'),
    successKey: 'form_success_vendor',
    extraHidden: `<p class="form-note">${esc(t('vf_text'))}</p>`,
    inner: [
      sec('vf_sec_type'),
      field(t, { name: 'collab_type', label: t('collab_type'), type: 'select', options: COLLAB_TYPES.map((k) => [k, t(`ct_${k}`)]) }),
      field(t, { name: 'applicant_kind', label: t('applicant_kind'), type: 'select', options: [['company', t('ak_company')], ['individual', t('ak_individual')]], value: 'company' }),
      `<p class="hint field--full">${esc(t('vf_investor_hint'))}</p>`, // under the row, so both boxes stay level
      sec('vf_sec_applicant'),
      field(t, { name: 'organisation', label: t('legal_name'), autocomplete: 'organization', full: true }),
      field(t, { name: 'reg_no', label: t('reg_no'), required: false, reqIf: 'applicant_kind=company' }),
      countrySelect(t),
      field(t, { name: 'address', label: t('address'), autocomplete: 'street-address', full: true }),
      field(t, { name: 'company_website', label: t('website'), type: 'url', required: false, autocomplete: 'url', full: true, attrs: 'placeholder="https://"' }),
      sec('vf_sec_contact'),
      field(t, { name: 'name', label: t('contact_name'), autocomplete: 'name' }),
      field(t, { name: 'job_title', label: t('job_title'), autocomplete: 'organization-title' }),
      field(t, { name: 'email', label: t('email'), type: 'email', autocomplete: 'email' }),
      field(t, { name: 'phone', label: t('phone'), type: 'tel', autocomplete: 'tel' }),
      sec('vf_sec_activities'),
      field(t, { name: 'activities', label: t('activities'), type: 'textarea', full: true, rows: 4, hint: t('activities_hint') }),
      field(t, { name: 'coverage', label: t('coverage'), required: false, full: true }),
      field(t, { name: 'experience', label: t('experience'), type: 'textarea', full: true, rows: 4 }),
      field(t, { name: 'affiliations', label: t('affiliations'), required: false }),
      field(t, { name: 'software', label: t('software'), required: false }),
      field(t, { name: 'certifications', label: t('certifications'), type: 'textarea', required: false, full: true, rows: 3 }),
      sec('vf_sec_collab'),
      field(t, { name: 'collaboration', label: t('collaboration'), type: 'textarea', full: true, rows: 4 }),
      sec('vf_sec_files'),
      field(t, { name: 'company_profile', label: t('file_profile'), ...fileOpts }),
      field(t, { name: 'documents', label: t('file_docs'), multiple: true, ...fileOpts }),
      sec('vf_sec_decl'),
      field(t, { name: 'decl_accurate', label: t('decl_accurate'), type: 'check' }),
      field(t, { name: 'decl_authority', label: t('decl_authority'), type: 'check' }),
      field(t, { name: 'decl_legal', label: t('decl_legal'), type: 'check' }),
    ].join(''),
  });
}

module.exports = { contactForm, projectEnquiryForm, investorForm, careerForm, vendorForm, SECTORS };
