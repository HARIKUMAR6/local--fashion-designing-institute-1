/**
 * ATELIER ÉLAN – Student portal entry (login + dashboard).
 * Reuses the public site's theme and direction modules (same storage keys), so the preference carries
 * across both. Frontend prototype only: there is no backend, OAuth or real authentication anywhere.
 */
import { initTheme } from './theme.js';
import { initTextOrientation } from './direction.js';
import { initLogin } from './portal-login.js';
import { initDashboard } from './portal-dashboard.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTextOrientation();
  initLogin();
  initDashboard();
});
