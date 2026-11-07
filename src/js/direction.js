/**
 * ATELIER ÉLAN – Text Layout Orientation (LTR/RTL) Management
 * Text-only toggle displaying strictly 'RTL' or 'LTR' without icons or extra words.
 * Persists user preference via localStorage and applies dir attribute to <html>.
 */

const STORAGE_KEY = 'atelier_elan_dir_mode';

export function initTextOrientation() {
  const dirToggleBtn = document.getElementById('dir-toggle-btn');
  const savedDir = localStorage.getItem(STORAGE_KEY) || 'ltr';

  applyDir(savedDir);

  if (dirToggleBtn) {
    dirToggleBtn.addEventListener('click', () => {
      const currentDir = document.documentElement.getAttribute('dir') || 'ltr';
      const newDir = currentDir === 'ltr' ? 'rtl' : 'ltr';
      applyDir(newDir);
      localStorage.setItem(STORAGE_KEY, newDir);
    });
  }

  function applyDir(dir) {
    document.documentElement.setAttribute('dir', dir);
    if (dirToggleBtn) {
      // If currently LTR, the button allows switching to RTL (label: RTL).
      // If currently RTL, the button allows switching back to LTR (label: LTR).
      dirToggleBtn.textContent = dir === 'ltr' ? 'RTL' : 'LTR';
      dirToggleBtn.setAttribute('aria-label', dir === 'ltr' ? 'Switch to RTL' : 'Switch to LTR');
    }
  }
}
