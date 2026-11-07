/**
 * ATELIER ÉLAN – Theme Management
 * Supports Light & Dark modes with persistence via localStorage.
 * Avoids layout shifts and conforms to strict design requirements.
 */

const THEME_STORAGE_KEY = 'atelier_elan_theme';

export function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIconSun = document.getElementById('theme-icon-sun');
  const themeIconMoon = document.getElementById('theme-icon-moon');

  // Determine initial theme: check localStorage first, then system preference
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme ? savedTheme : (systemPrefersDark ? 'dark' : 'light');

  applyTheme(initialTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      const newTheme = isDark ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    });
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      if (themeIconSun) themeIconSun.classList.remove('hidden');
      if (themeIconMoon) themeIconMoon.classList.add('hidden');
      if (themeToggleBtn) themeToggleBtn.setAttribute('aria-label', 'Switch to light mode');
    } else {
      document.documentElement.classList.remove('dark');
      if (themeIconSun) themeIconSun.classList.add('hidden');
      if (themeIconMoon) themeIconMoon.classList.remove('hidden');
      if (themeToggleBtn) themeToggleBtn.setAttribute('aria-label', 'Switch to dark mode');
    }
  }
}

