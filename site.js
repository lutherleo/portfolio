/* ══════════════════════════════════════════════════
   site.js — shared across all pages
   Theme · Nav · Mobile menu · Reveal · Footer year
══════════════════════════════════════════════════ */

(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── THEME TOGGLE ──────────────────────────────── */
  // The inline <head> script sets data-theme before first paint; this keeps
  // the button in sync, saves an explicit choice, follows the system setting
  // until the visitor picks one, and tells canvases to recolour (themechange).
  const root = document.documentElement;
  const themeBtn = document.getElementById('themeToggle');
  const systemLight = window.matchMedia('(prefers-color-scheme: light)');
  const savedTheme = () => {
    try { return localStorage.getItem('theme'); } catch { return null; }
  };
  function applyTheme(theme, save) {
    root.dataset.theme = theme;
    if (themeBtn) themeBtn.setAttribute('aria-pressed', String(theme === 'dark'));
    if (save) {
      try { localStorage.setItem('theme', theme); } catch { /* storage blocked: theme lasts for this page only */ }
    }
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }
  applyTheme(root.dataset.theme === 'light' ? 'light' : 'dark', false);
  if (themeBtn) {
    themeBtn.addEventListener('click', () => applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true));
  }
  systemLight.addEventListener('change', e => {
    if (!savedTheme()) applyTheme(e.matches ? 'light' : 'dark', false);
  });

  /* ── NAV SCROLLED STATE ────────────────────────── */
  const nav = document.getElementById('nav');
  if (nav && !nav.hasAttribute('data-solid')) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── MORE ▾ DROPDOWN ───────────────────────────── */
  const moreBtn  = document.querySelector('.nav-more-btn');
  const moreItem = document.querySelector('.nav-more');
  if (moreBtn && moreItem) {
    moreBtn.addEventListener('click', () => {
      const open = moreItem.classList.toggle('open');
      moreBtn.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', e => {
      if (!moreItem.contains(e.target)) {
        moreItem.classList.remove('open');
        moreBtn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        moreItem.classList.remove('open');
        moreBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ── HAMBURGER / MOBILE MENU ───────────────────── */
  const hamburger = document.getElementById('hamburger');
  const mobMenu   = document.getElementById('mobMenu');
  if (hamburger && mobMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobMenu.classList.toggle('open');
      document.body.style.overflow = mobMenu.classList.contains('open') ? 'hidden' : '';
    });
    mobMenu.querySelectorAll('.mob-item').forEach(a => a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobMenu.classList.remove('open');
      document.body.style.overflow = '';
    }));
  }

  /* ── SCROLL REVEAL ─────────────────────────────── */
  // Content is visible without JS. With JS (and no reduced-motion preference)
  // html.reveal-on hides pending .reveal elements until they reach the
  // viewport. A scroll check rather than IntersectionObserver also catches
  // elements that were jumped past (anchor links, fast scrolls).
  const pending = new Set();
  let revealQueued = false;
  function revealInView() {
    revealQueued = false;
    const limit = window.innerHeight - 40;
    for (const el of pending) {
      if (el.getBoundingClientRect().top < limit) {
        el.classList.add('visible');
        pending.delete(el);
      }
    }
  }
  function queueReveal() {
    if (!revealQueued && pending.size) {
      revealQueued = true;
      requestAnimationFrame(revealInView);
    }
  }
  function reveal(selector) {
    document.querySelectorAll(selector).forEach((el, i) => {
      if (el.classList.contains('reveal')) return;
      el.classList.add('reveal');
      el.style.setProperty('--d', (i % 5) * 70 + 'ms');
      if (reducedMotion) el.classList.add('visible');
      else pending.add(el);
    });
    queueReveal();
  }
  if (!reducedMotion) {
    document.documentElement.classList.add('reveal-on');
    window.addEventListener('scroll', queueReveal, { passive: true });
    window.addEventListener('resize', queueReveal, { passive: true });
  }
  window.LKP = { reveal };
  reveal('.page-hero-inner, .sec-label, .neu-card, .footer-inner');

  /* ── FOOTER YEAR ───────────────────────────────── */
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
})();
