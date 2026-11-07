/**
 * ATELIER ÉLAN – Main Application Entry
 * Initializes global features: theme, text orientation (RTL/LTR), navigation,
 * scroll-to-top, and page-specific editorial interactive components.
 */

import { initTheme } from './theme.js';
import { initTextOrientation } from './direction.js';
import { initNavigation } from './navigation.js';
import { initEnquiryForm, initContactMap } from './contact.js';
import { initGallery } from './gallery.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Core Systems
  initTheme();
  initTextOrientation();
  initNavigation();
  initEnquiryForm();
  initContactMap();
  initGallery();

  // Global Image Error Fallback Handler
  initImageFallback();

  // Scroll to Top Interaction
  initScrollToTop();

  // Learning Journey Interactive Highlight
  initJourneySteps();
});

/**
 * Scroll To Top Controller
 */
function initScrollToTop() {
  const scrollTopBtn = document.getElementById('scroll-to-top-btn');
  if (!scrollTopBtn) return;

  function handleScroll() {
    if (window.scrollY > 450) {
      scrollTopBtn.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
      scrollTopBtn.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
    } else {
      scrollTopBtn.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
      scrollTopBtn.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/**
 * Learning Journey: step buttons swap the preview image (aria-pressed marks the active step).
 */
function initJourneySteps() {
  const steps = document.querySelectorAll(".journey-step-btn");
  const previews = document.querySelectorAll(".journey-preview-img");
  if (!steps.length) return;

  steps.forEach((step) => {
    step.addEventListener("click", () => {
      const id = step.getAttribute("data-step");
      steps.forEach((s) => s.setAttribute("aria-pressed", String(s === step)));
      previews.forEach((img) => {
        const on = img.getAttribute("data-step-preview") === id;
        img.classList.toggle("opacity-100", on);
        img.classList.toggle("opacity-0", !on);
      });
    });
  });
}

/**
 * Global Image Fallback Handler
 * Gracefully replaces any failed images with a branded Atelier Élan SVG placeholder.
 */
function initImageFallback() {
  window.addEventListener('error', (event) => {
    if (event.target && event.target.tagName === 'IMG') {
      const img = event.target;
      if (img.dataset.fallbackApplied) return;
      img.dataset.fallbackApplied = 'true';
      img.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20600%22%20width%3D%22800%22%20height%3D%22600%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23242220%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%23FAF8F5%22%20font-family%3D%22sans-serif%22%20font-size%3D%2220%22%20letter-spacing%3D%224%22%3EATELIER%20%C3%89LAN%20%E2%80%A2%20STUDIO%20ARCHIVE%3C%2Ftext%3E%3C%2Fsvg%3E';
    }
  }, true);
}
