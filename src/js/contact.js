/**
 * ATELIER ÉLAN – Contact page behaviour: enquiry form validation and the map slot.
 * Both initialisers are no-ops on pages without the matching markup.
 *
 * The form has no backend. A valid submission is never reported as "sent": the page tells the visitor
 * their details are complete and offers a pre-filled email (mailto:) to actually send the enquiry.
 */
import { SITE, fullAddress, mapEmbedUrl, mapPageUrl, mapCaption } from './site-config.js';

const RULES = {
  name: (v) => (v.length < 2 ? 'Please enter your full name (at least 2 characters).' : /[<>]/.test(v) ? 'Please remove special characters from your name.' : ''),
  email: (v) => (!v ? 'Please enter your email address.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Please enter a valid email address, for example name@example.com.' : ''),
  phone: (v) => {
    if (!v) return 'Please enter your phone number.';
    if (!/^[+()\d\s.-]+$/.test(v)) return 'Use digits only, with an optional + at the start.';
    const digits = v.replace(/\D/g, '').length;
    return digits < 7 || digits > 15 ? 'Please enter a valid phone number (7 to 15 digits).' : '';
  },
  course: (v) => (v ? '' : 'Please choose a course of interest.'),
  message: (v) => (v.length < 15 ? 'Please tell us a little more (at least 15 characters).' : v.length > 1000 ? 'Please keep your message under 1000 characters.' : ''),
};

export function initEnquiryForm() {
  const form = document.getElementById('enquiry-form');
  if (!form) return;
  const status = document.getElementById('form-status');
  const statusText = document.getElementById('form-status-text');
  const statusAction = document.getElementById('form-status-action');
  const statusIconOk = document.getElementById('form-status-icon-ok');
  const statusIconErr = document.getElementById('form-status-icon-err');
  const counter = document.getElementById('message-count');
  const fields = Object.keys(RULES).map((name) => form.elements[name]);

  const show = (field, msg) => {
    const err = document.getElementById(`${field.name}-error`);
    field.setAttribute('aria-invalid', String(!!msg));
    if (err) { err.dataset.visible = String(!!msg); err.querySelector('[data-msg]').textContent = msg; }
    return !msg;
  };
  const check = (field) => show(field, RULES[field.name](field.value.trim()));

  const setStatus = (state, text, action) => {
    status.dataset.state = state;
    statusText.textContent = text;
    statusIconOk.hidden = state !== 'ready';
    statusIconErr.hidden = state !== 'error';
    if (action) { statusAction.hidden = false; statusAction.href = action; } else { statusAction.hidden = true; statusAction.removeAttribute('href'); }
  };
  const clearStatus = () => { delete status.dataset.state; };

  fields.forEach((f) => {
    f.addEventListener('blur', () => { if (f.value || f.getAttribute('aria-invalid') === 'true') check(f); });
    f.addEventListener('input', () => { if (f.getAttribute('aria-invalid') === 'true') check(f); clearStatus(); });
    f.addEventListener('change', () => { if (f.tagName === 'SELECT') check(f); });
  });
  form.elements.message.addEventListener('input', () => { if (counter) counter.textContent = `${form.elements.message.value.length} / 1000`; });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const results = fields.map(check);
    const firstBad = fields[results.indexOf(false)];
    if (firstBad) {
      const n = results.filter((r) => !r).length;
      setStatus('error', `Please correct ${n} ${n === 1 ? 'field' : 'fields'} before submitting.`);
      firstBad.focus();
      return;
    }
    const v = Object.fromEntries(fields.map((f) => [f.name, f.value.trim()]));
    const body = `Name: ${v.name}\nEmail: ${v.email}\nPhone: ${v.phone}\nCourse of interest: ${v.course}\n\n${v.message}`;
    const href = `mailto:${SITE.email}?subject=${encodeURIComponent(`Course enquiry – ${v.course}`)}&body=${encodeURIComponent(body)}`;
    setStatus('ready', 'Your details are complete. This website is not connected to a mail service, so your enquiry has not been sent yet. Use the button below to send it from your email app.', href);
    statusAction.focus();
  });

  // Preselect a course from ?course= (used by course links), only if it matches an option.
  const wanted = new URLSearchParams(location.search).get('course');
  if (wanted) [...form.elements.course.options].forEach((o) => { if (o.value.toLowerCase() === wanted.toLowerCase()) o.selected = true; });
}

export function initContactMap() {
  const slot = document.getElementById('map-slot');
  if (!slot) return;
  const pending = document.getElementById('map-pending');
  const confirmed = SITE.address.confirmed;
  const iframe = document.createElement('iframe');
  iframe.src = mapEmbedUrl();
  iframe.title = confirmed ? `Interactive map showing ${fullAddress()}` : `Interactive area map of ${SITE.area.label} (general area, not the institute’s exact location)`;
  iframe.loading = 'lazy';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  slot.appendChild(iframe);
  slot.dataset.state = confirmed ? 'live' : 'area';
  if (pending) pending.hidden = true;
  const caption = document.getElementById('map-caption');
  if (caption) caption.textContent = mapCaption();
  const link = document.getElementById('map-link');
  if (link) link.href = mapPageUrl();
}
