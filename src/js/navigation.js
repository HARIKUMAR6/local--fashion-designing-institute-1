/**
 * ATELIER ÉLAN – Navigation
 * Shared header behaviour: scrolled state, Home dropdown, mobile drawer,
 * current-page marking. All state lives in data-open / aria-* attributes and is
 * styled from src/css/layout.css.
 */

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function initNavigation() {
  markCurrentPage();
  initScrolledHeader();
  initHomeDropdown();
  initMobileDrawer();
}

function markCurrentPage() {
  // Compare resolved paths (not file names): index.html and dashboard/index.html share a file name.
  const norm = (p) => {
    let s = p.endsWith("/index.html") ? p.slice(0, -"index.html".length) : p; // .../dashboard/index.html -> .../dashboard/
    if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
    return s || "/";
  };
  const here = norm(location.pathname);
  document.querySelectorAll(".site-dropdown__link, .mobile-drawer__link, .site-nav__link[href]").forEach((link) => {
    const url = new URL(link.getAttribute("href"), location.href);
    if (url.origin === location.origin || url.protocol === "file:") {
      if (norm(decodeURIComponent(url.pathname)) === norm(decodeURIComponent(here))) link.setAttribute("aria-current", "page");
    }
  });
  // The Home trigger is "current" on either home page.
  // (Marking the current page only highlights; it never opens a submenu.)
  if (document.querySelector("#home-dropdown-menu [aria-current=\"page\"]")) {
    document.getElementById("home-dropdown-trigger")?.setAttribute("data-current", "true");
    document.getElementById("mobile-home-trigger")?.setAttribute("data-current", "true");
  }
}

function initScrolledHeader() {
  const header = document.getElementById('main-header');
  if (!header) return;
  const update = () => header.classList.toggle('header-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initHomeDropdown() {
  const item = document.getElementById('home-dropdown-wrapper');
  const trigger = document.getElementById('home-dropdown-trigger');
  const menu = document.getElementById('home-dropdown-menu');
  if (!item || !trigger || !menu) return;

  const links = () => [...menu.querySelectorAll('a')];

  const setOpen = (open) => {
    item.dataset.open = String(open);
    trigger.setAttribute('aria-expanded', String(open));
  };

  // Always start closed (also when a page is restored from the back/forward cache).
  setOpen(false);
  window.addEventListener('pageshow', () => setOpen(false));

  // Click-only: the menu never opens from hover (a cursor already resting on "Home" when a page loads would
  // otherwise open it by itself). Click toggles; click outside, Escape, focus leaving, or any link closes it.
  trigger.addEventListener('click', () => setOpen(item.dataset.open !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });

  item.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && item.dataset.open === 'true') {
      setOpen(false);
      trigger.focus();
    } else if (e.key === 'ArrowDown' && e.target === trigger) {
      e.preventDefault();
      setOpen(true);
      links()[0]?.focus();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target !== trigger) {
      e.preventDefault();
      const all = links();
      const i = all.indexOf(document.activeElement);
      all[(i + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length].focus();
    }
  });

  item.addEventListener('focusout', (e) => {
    if (!item.contains(e.relatedTarget)) setOpen(false);
  });
  document.addEventListener('click', (e) => { if (!item.contains(e.target)) setOpen(false); });
  // Leaving the desktop layout must not leave a stale open state behind.
  window.matchMedia('(min-width: 1200px)').addEventListener('change', () => setOpen(false));
}

function initMobileDrawer() {
  const btn = document.getElementById('mobile-menu-btn');
  const drawer = document.getElementById('mobile-menu-drawer');
  const backdrop = document.getElementById('mobile-menu-backdrop');
  const closeBtn = document.getElementById('mobile-menu-close-btn');
  if (!btn || !drawer) return;

  const isOpen = () => drawer.dataset.open === 'true';

  // Home submenu inside the drawer: a disclosure that is ALWAYS closed until the user clicks "Home".
  // It is reset to closed whenever the drawer opens or closes (so opening the drawer never shows Home 1/2).
  const homeBtn = document.getElementById('mobile-home-trigger');
  const homeSub = document.getElementById('mobile-home-sub');
  const setHome = (open) => {
    if (!homeBtn || !homeSub) return;
    homeSub.dataset.open = String(open);
    homeBtn.setAttribute('aria-expanded', String(open));
  };
  setHome(false);
  window.addEventListener('pageshow', () => setHome(false));
  homeBtn?.addEventListener('click', () => setHome(homeSub.dataset.open !== 'true'));
  // Clicking anywhere in the drawer outside the Home group (other items, empty space) closes it.
  drawer.addEventListener('click', (e) => { if (!e.target.closest('#mobile-home-group')) setHome(false); });

  const setOpen = (open) => {
    setHome(false);
    drawer.dataset.open = String(open);
    if (backdrop) backdrop.dataset.open = String(open);
    drawer.setAttribute('aria-hidden', String(!open));
    btn.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) closeBtn?.focus();
  };

  btn.addEventListener('click', () => setOpen(!isOpen()));
  closeBtn?.addEventListener('click', () => { setOpen(false); btn.focus(); });
  backdrop?.addEventListener('click', () => { setOpen(false); btn.focus(); });
  drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));

  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { setOpen(false); btn.focus(); return; }
    if (e.key !== 'Tab') return;
    const items = [...drawer.querySelectorAll(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // Leaving the mobile breakpoint while open must not leave the page scroll-locked.
  window.matchMedia('(min-width: 1200px)').addEventListener('change', (m) => { if (m.matches && isOpen()) setOpen(false); });
}
