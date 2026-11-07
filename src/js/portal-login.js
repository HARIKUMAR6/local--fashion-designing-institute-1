/**
 * ATELIER ÉLAN – Student login portal (frontend prototype).
 * Views: sign in / create account / forgot password, switched by #hash.
 * Nothing is sent anywhere and no password is ever stored. "Remember me" keeps the EMAIL only.
 * Google / Apple buttons are not connected and say so; a valid sign-in only opens the demo dashboard.
 */
const REMEMBER_KEY = 'atelier_portal_remember_email';
const DASHBOARD = './dashboard/index.html';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const RULES = {
  email: (v) => (!v ? 'Please enter your email address.' : !EMAIL_RE.test(v) ? 'Please enter a valid email address, for example name@example.com.' : ''),
  signinPw: (v) => (!v ? 'Please enter your password.' : v.length < 8 ? 'Your password must be at least 8 characters.' : ''),
  name: (v) => (v.length < 2 ? 'Please enter your full name (at least 2 characters).' : /[<>\d]/.test(v) ? 'Please use letters only in your name.' : ''),
  phone: (v) => {
    if (!v) return 'Please enter your phone number.';
    if (!/^[+()\d\s.-]+$/.test(v)) return 'Use digits only, with an optional + at the start.';
    const n = v.replace(/\D/g, '').length;
    return n < 7 || n > 15 ? 'Please enter a valid phone number (7 to 15 digits).' : '';
  },
};
const PW_TESTS = { len: (v) => v.length >= 8, up: (v) => /[A-Z]/.test(v), low: (v) => /[a-z]/.test(v), num: (v) => /\d/.test(v) };

export function initLogin() {
  const root = document.querySelector('.pl');
  if (!root) return;
  const views = [...root.querySelectorAll('[data-view]')];
  const $ = (id) => document.getElementById(id);

  /* ----- view switching -------------------------------------------------- */
  const TITLES = { signin: 'Student Login', create: 'Create Account', forgot: 'Forgot Password' };
  function go(name, focus = true) {
    if (!TITLES[name]) name = 'signin';
    views.forEach((v) => { v.hidden = v.dataset.view !== name; });
    document.title = `${TITLES[name]} – ATELIER ÉLAN Student Portal`;
    const target = `#${name === 'signin' ? '' : name}`;
    if (location.hash !== target && !(name === 'signin' && !location.hash)) history.replaceState(null, '', name === 'signin' ? location.pathname + location.search : target);
    if (focus) root.querySelector(`[data-view="${name}"] h1`)?.focus({ preventScroll: true });
  }
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });
  window.addEventListener('hashchange', () => go(location.hash.slice(1), false));
  go(location.hash.slice(1), false);

  /* ----- helpers --------------------------------------------------------- */
  const setErr = (input, msg) => {
    const err = $(`${input.id}-err`);
    input.setAttribute('aria-invalid', String(!!msg));
    if (err) { err.dataset.visible = String(!!msg); err.querySelector('span').textContent = msg; }
    return !msg;
  };
  const say = (box, state, text) => {
    box.dataset.state = state;
    box.querySelector('use').setAttribute('href', state === 'error' ? '#i-alert' : state === 'success' ? '#i-check-circle' : '#i-info');
    box.querySelector('p').textContent = text;
  };
  const clearSay = (box) => { delete box.dataset.state; };
  const bind = (input, rule) => {
    input.addEventListener('blur', () => { if (input.value || input.getAttribute('aria-invalid') === 'true') setErr(input, rule(input.value.trim())); });
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') setErr(input, rule(input.value.trim())); });
  };

  // Show / hide password
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-toggle-pw]');
    if (!b) return;
    const input = $(b.dataset.togglePw);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.setAttribute('aria-pressed', String(show));
    b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    b.querySelector('use').setAttribute('href', show ? '#i-eye-off' : '#i-eye');
  });

  /* ----- sign in --------------------------------------------------------- */
  const fSign = $('form-signin');
  const siEmail = $('si-email'), siPw = $('si-pw'), remember = $('si-remember'), alSign = $('al-signin');
  bind(siEmail, RULES.email); bind(siPw, RULES.signinPw);
  try { const saved = localStorage.getItem(REMEMBER_KEY); if (saved) { siEmail.value = saved; remember.checked = true; } } catch { /* storage blocked */ }

  fSign.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = [setErr(siEmail, RULES.email(siEmail.value.trim())), setErr(siPw, RULES.signinPw(siPw.value))];
    if (ok.includes(false)) {
      const n = ok.filter((x) => !x).length;
      say(alSign, 'error', `Please correct ${n} ${n === 1 ? 'field' : 'fields'} to continue.`);
      (!ok[0] ? siEmail : siPw).focus();
      return;
    }
    try { remember.checked ? localStorage.setItem(REMEMBER_KEY, siEmail.value.trim()) : localStorage.removeItem(REMEMBER_KEY); } catch { /* ignore */ }
    say(alSign, 'success', 'Prototype sign-in: your details look valid, but nothing was verified and no account was checked. Opening the demo dashboard…');
    $('si-submit').disabled = true;
    setTimeout(() => { location.href = DASHBOARD; }, 1400);
  });

  // Google / Apple: not connected. Never pretend to authenticate.
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-social]');
    if (!b) return;
    say(alSign, 'info', `Continue with ${b.dataset.social} is not connected yet. No ${b.dataset.social} sign-in took place and you have not been signed in. Please use your email and password in this prototype.`);
    alSign.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  /* ----- create account -------------------------------------------------- */
  const fCreate = $('form-create');
  const caName = $('ca-name'), caEmail = $('ca-email'), caPhone = $('ca-phone'), caPw = $('ca-pw'), caPw2 = $('ca-pw2'), caTerms = $('ca-terms'), alCreate = $('al-create');
  const pwRule = (v) => (!v ? 'Please create a password.' : Object.values(PW_TESTS).every((t) => t(v)) ? '' : 'Your password does not meet all the requirements below.');
  const matchRule = () => (!caPw2.value ? 'Please confirm your password.' : caPw2.value !== caPw.value ? 'The passwords do not match.' : '');
  const termsRule = () => (caTerms.checked ? '' : 'Please accept the Terms and Conditions to continue.');
  bind(caName, RULES.name); bind(caEmail, RULES.email); bind(caPhone, RULES.phone);
  caPw.addEventListener('input', () => {
    document.querySelectorAll('#ca-rules [data-rule]').forEach((li) => { li.dataset.ok = String(PW_TESTS[li.dataset.rule](caPw.value)); });
    if (caPw.getAttribute('aria-invalid') === 'true') setErr(caPw, pwRule(caPw.value));
    if (caPw2.value) setErr(caPw2, matchRule());
  });
  caPw.addEventListener('blur', () => { if (caPw.value) setErr(caPw, pwRule(caPw.value)); });
  caPw2.addEventListener('input', () => { if (caPw2.getAttribute('aria-invalid') === 'true' || caPw2.value) setErr(caPw2, matchRule()); });
  caPw2.addEventListener('blur', () => { if (caPw2.value) setErr(caPw2, matchRule()); });
  caTerms.addEventListener('change', () => setErr(caTerms, termsRule()));

  fCreate.addEventListener('submit', (e) => {
    e.preventDefault();
    const checks = [
      [caName, RULES.name(caName.value.trim())], [caEmail, RULES.email(caEmail.value.trim())], [caPhone, RULES.phone(caPhone.value.trim())],
      [caPw, pwRule(caPw.value)], [caPw2, matchRule()], [caTerms, termsRule()],
    ];
    const results = checks.map(([el, msg]) => setErr(el, msg));
    const bad = checks.filter((_, i) => !results[i]);
    if (bad.length) {
      say(alCreate, 'error', `Please correct ${bad.length} ${bad.length === 1 ? 'field' : 'fields'} before creating your account.`);
      bad[0][0].focus();
      return;
    }
    clearSay(alCreate);
    fCreate.hidden = true;
    $('create-done').hidden = false;
    $('create-done-text').textContent = `Thank you, ${caName.value.trim().split(/\s+/)[0]}. Your details passed the form check. This is a prototype: no account was created and nothing was sent or saved. You can return to sign in.`;
    siEmail.value = caEmail.value.trim();
    fCreate.reset();
    document.querySelectorAll('#ca-rules [data-rule]').forEach((li) => { li.dataset.ok = 'false'; });
  });
  // Returning to the form after the confirmation resets the view.
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-go="create"]')) { fCreate.hidden = false; $('create-done').hidden = true; }
  });

  /* ----- forgot password ------------------------------------------------- */
  const fForgot = $('form-forgot'), fpEmail = $('fp-email'), alForgot = $('al-forgot');
  bind(fpEmail, RULES.email);
  fForgot.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!setErr(fpEmail, RULES.email(fpEmail.value.trim()))) { say(alForgot, 'error', 'Please enter a valid email address.'); fpEmail.focus(); return; }
    say(alForgot, 'success', `Prototype only: no password reset email has been sent to ${fpEmail.value.trim()}, and no account was looked up. When the portal is connected, reset instructions would be sent from here.`);
  });
  fpEmail.addEventListener('input', () => clearSay(alForgot));

  /* ----- terms dialog ---------------------------------------------------- */
  const dlg = $('terms-dlg');
  $('open-terms').addEventListener('click', () => dlg.showModal());
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
}
