/* ══════════════════════════════════════════════════
   script.js — home page only
   Hero (three.js) · Active nav · Contact clipboard
   (shared behaviour lives in site.js)
══════════════════════════════════════════════════ */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── THREE.JS HERO SCENE ─────────────────────────── */
function initHeroScene() {
  const canvas = document.getElementById('heroCanvas');
  // Skip when the 3D panel is hidden (narrow screens) or motion is reduced.
  if (!canvas || !canvas.offsetParent || typeof THREE === 'undefined' || reducedMotion) return;

  const parent = canvas.parentElement;
  const W = parent.clientWidth  || 420;
  const H = parent.clientHeight || 420;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(W, H, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 100);
  camera.position.z = 5.2;

  const G1 = 0x22c55e, G2 = 0x4ade80;

  const group = new THREE.Group();
  scene.add(group);

  const ico = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.35, 1),
    new THREE.MeshBasicMaterial({ color: G1, wireframe: true, transparent: true, opacity: 0.72 })
  );
  group.add(ico);

  const sph = new THREE.Mesh(
    new THREE.SphereGeometry(2.15, 18, 13),
    new THREE.MeshBasicMaterial({ color: G2, wireframe: true, transparent: true, opacity: 0.09 })
  );
  group.add(sph);

  function ring(r, rx, rz) {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.006, 4, 90),
      new THREE.MeshBasicMaterial({ color: G1, transparent: true, opacity: 0.28 })
    );
    m.rotation.x = rx; m.rotation.z = rz;
    group.add(m); return m;
  }
  const r1 = ring(2.1, Math.PI / 2, 0);
  const r2 = ring(2.1, Math.PI / 5, Math.PI / 3.2);
  const r3 = ring(2.1, -Math.PI / 4.5, -Math.PI / 4.8);

  const dotTemplate = new THREE.Mesh(
    new THREE.SphereGeometry(0.052, 7, 7),
    new THREE.MeshBasicMaterial({ color: G2 })
  );
  const dots = Array.from({ length: 5 }, (_, i) => {
    const d = { mesh: dotTemplate.clone(), angle: (i / 5) * Math.PI * 2, speed: 0.36 + i * 0.07, radius: 2.1, yOff: (i - 2) * 0.32 };
    group.add(d.mesh); return d;
  });

  const pCount = 130;
  const pPos   = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const rad   = 2.6 + Math.random() * 1.6;
    pPos[i*3]   = rad * Math.sin(phi) * Math.cos(theta);
    pPos[i*3+1] = rad * Math.sin(phi) * Math.sin(theta);
    pPos[i*3+2] = rad * Math.cos(phi);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  group.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: G1, size: 0.026, transparent: true, opacity: 0.52 })));

  let mx = 0, my = 0, rotX = 0, rotY = 0;
  parent.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mx = (e.clientX - rect.left) / rect.width  * 2 - 1;
    my = -((e.clientY - rect.top)  / rect.height * 2 - 1);
  });

  const clock = new THREE.Clock();
  (function loop() {
    const t = clock.getElapsedTime();
    ico.rotation.x = t * 0.19; ico.rotation.y = t * 0.27;
    sph.rotation.y = t * 0.055;
    r1.rotation.z  = t * 0.28;
    r2.rotation.z  = -t * 0.19;
    r3.rotation.z  = t * 0.16;
    dots.forEach(d => {
      d.angle += d.speed * 0.013;
      d.mesh.position.set(Math.cos(d.angle) * d.radius, d.yOff, Math.sin(d.angle) * d.radius);
    });
    rotX += (my * 0.30 - rotX) * 0.055;
    rotY += (mx * 0.40 - rotY) * 0.055;
    group.rotation.x = rotX; group.rotation.y = rotY;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();

  const ro = new ResizeObserver(() => {
    const nW = parent.clientWidth, nH = parent.clientHeight;
    renderer.setSize(nW, nH, false);
    camera.aspect = nW / nH; camera.updateProjectionMatrix();
  });
  ro.observe(parent);
}
window.addEventListener('load', () => setTimeout(initHeroScene, 500));

/* ── SCROLL REVEAL (home-specific elements) ──────── */
LKP.reveal([
  '.now-strip', '.section-head', '.section-lead', '.work-row',
  '.research-item', '.post-row', '.about-photo', '.about-body',
  '.tl-item', '.contact-inner'
].join(','));

/* ── ACTIVE NAV LINK ─────────────────────────────── */
// Highlights the in-page nav link whose section crosses the middle of the
// viewport (works for sections of any height).
const navAs = document.querySelectorAll('.nav-links a');
const sectionObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    navAs.forEach(a => a.classList.remove('active'));
    document.querySelector(`.nav-links a[href="#${e.target.id}"]`)?.classList.add('active');
  });
}, { rootMargin: '-50% 0px -50% 0px' });
document.querySelectorAll('main section[id]').forEach(s => sectionObs.observe(s));

/* ── COPY EMAIL TO CLIPBOARD ─────────────────────── */
const copyBtn = document.getElementById('copyEmail');
if (copyBtn) {
  const label = copyBtn.querySelector('span');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('lp2989@nyu.edu');
      copyBtn.classList.add('copied');
      label.textContent = 'Copied ✓';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        label.textContent = 'Copy address';
      }, 2000);
    } catch {
      location.href = 'mailto:lp2989@nyu.edu';
    }
  });
}
