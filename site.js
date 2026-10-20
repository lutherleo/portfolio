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

  /* ── HAMBURGER / MOBILE MENU ───────────────────── */
  // Closed: invisible and inert. Open: everything outside the nav and the menu
  // is inert, focus moves into the menu, Escape closes it and returns focus.
  const hamburger = document.getElementById('hamburger');
  const mobMenu   = document.getElementById('mobMenu');
  if (hamburger && mobMenu) {
    hamburger.setAttribute('aria-controls', 'mobMenu');
    hamburger.setAttribute('aria-expanded', 'false');
    mobMenu.inert = true;
    const outside = () => [...document.body.children].filter(el =>
      el !== mobMenu && !el.contains(hamburger) && el.tagName !== 'SCRIPT');

    const setMenu = (open, returnFocus = false) => {
      hamburger.classList.toggle('open', open);
      mobMenu.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
      hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
      mobMenu.inert = !open;
      outside().forEach(el => { el.inert = open; });
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) mobMenu.querySelector('a')?.focus();
      else if (returnFocus) hamburger.focus();
    };

    hamburger.addEventListener('click', () => setMenu(!mobMenu.classList.contains('open')));
    mobMenu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mobMenu.classList.contains('open')) setMenu(false, true);
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
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

  /* ── PAGE TRANSITIONS ──────────────────────────── */
  // When a project card or work row opens a case study, name its title so the
  // cross-document View Transition morphs it into the case page's heading.
  window.addEventListener('pageswap', e => {
    const url = e.activation?.entry?.url;
    if (!e.viewTransition || !url || !url.includes('/projects/')) return;
    const link = [...document.querySelectorAll('a[href]')].find(a => a.href === url);
    const title = link?.closest('.proj-card, .work-row')?.querySelector('.proj-card-title, .work-title');
    if (title) title.style.viewTransitionName = 'case-title';
  });

  /* ── FOOTER YEAR ───────────────────────────────── */
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
})();
