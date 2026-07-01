/* ══════════════════════════════════════════════════
   site.js — shared across all pages
   Cursor · Nav · Mobile menu · Reveal · Card glow ·
   Magnetic buttons · Footer year
══════════════════════════════════════════════════ */

(() => {
  'use strict';

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!finePointer) document.documentElement.classList.add('touch');

  // Fade the page in (the index preloader overlays this until it finishes)
  document.body.classList.add('loaded');

  /* ── CUSTOM CURSOR ─────────────────────────────── */
  const cursor = document.getElementById('cursor');
  const ring   = document.getElementById('cursorRing');

  if (finePointer && cursor && ring) {
    let mx = -100, my = -100;      // mouse target
    let rxp = -100, ryp = -100;    // ring lerped position
    let seen = false;

    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      if (!seen) { seen = true; rxp = mx; ryp = my; document.body.classList.add('cursor-on'); }
    }, { passive: true });

    document.addEventListener('mousedown', () => document.body.classList.add('cursor-down'));
    document.addEventListener('mouseup',   () => document.body.classList.remove('cursor-down'));
    document.addEventListener('mouseleave', () => document.body.classList.remove('cursor-on'));
    document.addEventListener('mouseenter', () => { if (seen) document.body.classList.add('cursor-on'); });

    // Hover states via delegation — works for elements added later
    const HOVER_SEL = 'a, button, input, textarea, select, label, .dpad-btn, .na-keys span, [data-cursor]';
    const TEXT_SEL  = 'input[type="text"], input[type="email"], textarea';
    document.addEventListener('mouseover', e => {
      const t = e.target.closest(HOVER_SEL);
      document.body.classList.toggle('cursor-hover', !!t);
      document.body.classList.toggle('cursor-text', !!(t && t.matches(TEXT_SEL)));
    }, { passive: true });

    (function loop() {
      rxp += (mx - rxp) * 0.16;
      ryp += (my - ryp) * 0.16;
      cursor.style.setProperty('--x', mx + 'px');
      cursor.style.setProperty('--y', my + 'px');
      ring.style.setProperty('--x', rxp.toFixed(1) + 'px');
      ring.style.setProperty('--y', ryp.toFixed(1) + 'px');
      requestAnimationFrame(loop);
    })();
  }

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
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  function reveal(selector) {
    document.querySelectorAll(selector).forEach((el, i) => {
      if (el.classList.contains('reveal')) return;
      el.classList.add('reveal');
      el.style.setProperty('--d', (i % 5) * 70 + 'ms');
      revealObs.observe(el);
    });
  }
  window.LKP = { reveal };
  reveal('.page-hero-inner, .sec-label, .neu-card, .footer-inner');

  /* ── CARD GLOW (all neumorphic cards) ──────────── */
  if (finePointer && !reducedMotion) {
    document.querySelectorAll('.neu-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width  * 100).toFixed(1);
        const y = ((e.clientY - r.top)  / r.height * 100).toFixed(1);
        card.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(34,197,94,0.06) 0%, var(--surface) 60%)`;
      });
      card.addEventListener('mouseleave', () => { card.style.background = ''; });
    });
  }

  /* ── MAGNETIC BUTTONS ──────────────────────────── */
  if (finePointer && !reducedMotion) {
    document.querySelectorAll('.btn-resume, .btn-copy, .game-btn').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${dx * 0.15}px, ${dy * 0.25 - 2}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  /* ── FOOTER YEAR ───────────────────────────────── */
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
})();
