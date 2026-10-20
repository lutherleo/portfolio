/* ══════════════════════════════════════════════════
   hero3d.js — home hero wireframe sphere (three.js, loaded on demand)

   The static SVG poster in .hero-right is the default. three.js is only
   imported when the visitor has a fine pointer, hasn't asked for reduced
   motion, can see the hero, and the browser is idle. Rendering stops when
   the hero is off-screen or the tab is hidden, and the pause button
   (WCAG 2.2.2) stops it for the rest of the session.
══════════════════════════════════════════════════ */

const root = document.querySelector('.hero-right');
const canvas = document.getElementById('heroCanvas');
const pauseBtn = document.querySelector('.hero-pause');
const PAUSE_KEY = 'hero3d-paused';

const canAnimate =
  root && canvas && pauseBtn &&
  root.offsetParent !== null &&
  window.matchMedia('(pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canAnimate) {
  const whenVisible = new Promise(resolve => {
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { io.disconnect(); resolve(); }
    });
    io.observe(root);
  });
  const whenIdle = () => new Promise(resolve => {
    if ('requestIdleCallback' in window) requestIdleCallback(() => resolve(), { timeout: 2500 });
    else setTimeout(resolve, 400);
  });
  whenVisible
    .then(whenIdle)
    .then(() => import('three'))
    .then(start)
    .catch(() => { /* network or WebGL failure: the poster stays */ });
}

function readPaused() {
  try { return sessionStorage.getItem(PAUSE_KEY) === '1'; } catch { return false; }
}

function savePaused(paused) {
  try { sessionStorage.setItem(PAUSE_KEY, paused ? '1' : '0'); } catch { /* storage blocked */ }
}

function start(THREE) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.z = 5.2;
  const group = new THREE.Group();
  scene.add(group);

  // Unlit materials, coloured from the CSS tokens ('accent' / 'hover').
  const materials = [];
  const material = (Kind, options, token) => {
    const m = new Kind({ transparent: true, ...options });
    m.userData.token = token;
    materials.push(m);
    return m;
  };

  const ico = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.35, 1),
    material(THREE.MeshBasicMaterial, { wireframe: true, opacity: 0.72 }, 'accent'),
  );
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(2.15, 18, 13),
    material(THREE.MeshBasicMaterial, { wireframe: true, opacity: 0.09 }, 'hover'),
  );
  group.add(ico, shell);

  const ringMaterial = material(THREE.MeshBasicMaterial, { opacity: 0.28 }, 'accent');
  const rings = [[Math.PI / 2, 0], [Math.PI / 5, Math.PI / 3.2], [-Math.PI / 4.5, -Math.PI / 4.8]].map(([rx, rz]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.006, 4, 90), ringMaterial);
    ring.rotation.x = rx;
    ring.rotation.z = rz;
    group.add(ring);
    return ring;
  });

  const dotGeometry = new THREE.SphereGeometry(0.052, 8, 8);
  const dotMaterial = material(THREE.MeshBasicMaterial, { opacity: 1 }, 'hover');
  const dots = Array.from({ length: 5 }, (_, i) => {
    const mesh = new THREE.Mesh(dotGeometry, dotMaterial);
    group.add(mesh);
    return { mesh, phase: (i / 5) * Math.PI * 2, speed: 0.47 + i * 0.09, y: (i - 2) * 0.32 };
  });

  const count = 130;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 2.6 + Math.random() * 1.6;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const particles = new THREE.BufferGeometry();
  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  group.add(new THREE.Points(particles, material(THREE.PointsMaterial, { size: 0.026, opacity: 0.52 }, 'accent')));

  let running = false;
  const applyColours = () => {
    const css = getComputedStyle(document.documentElement);
    const colours = { accent: css.getPropertyValue('--accent').trim(), hover: css.getPropertyValue('--accent-hover').trim() };
    materials.forEach(m => m.color.setStyle(colours[m.userData.token]));
    if (!running) renderer.render(scene, camera);
  };

  const resize = () => {
    const { width, height } = root.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (!running) renderer.render(scene, camera);
  };

  // Gentle parallax towards the pointer.
  let targetX = 0, targetY = 0, tiltX = 0, tiltY = 0;
  root.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    targetX = (e.clientX - r.left) / r.width * 2 - 1;
    targetY = -((e.clientY - r.top) / r.height * 2 - 1);
  });
  root.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; });

  const clock = new THREE.Clock();
  let t = 0;
  let raf = 0;
  const frame = () => {
    t += Math.min(clock.getDelta(), 0.05);
    ico.rotation.x = t * 0.19;
    ico.rotation.y = t * 0.27;
    shell.rotation.y = t * 0.055;
    rings[0].rotation.z = t * 0.28;
    rings[1].rotation.z = -t * 0.19;
    rings[2].rotation.z = t * 0.16;
    for (const d of dots) {
      const a = d.phase + t * d.speed;
      d.mesh.position.set(Math.cos(a) * 2.1, d.y, Math.sin(a) * 2.1);
    }
    tiltX += (targetY * 0.3 - tiltX) * 0.055;
    tiltY += (targetX * 0.4 - tiltY) * 0.055;
    group.rotation.x = tiltX;
    group.rotation.y = tiltY;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };

  let onScreen = true;
  let userPaused = readPaused();
  const update = () => {
    const shouldRun = onScreen && !userPaused && !document.hidden;
    if (shouldRun && !running) {
      running = true;
      clock.getDelta();
      raf = requestAnimationFrame(frame);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
    root.dataset.state = running ? 'running' : userPaused ? 'paused' : 'idle';
    pauseBtn.setAttribute('aria-pressed', String(userPaused));
  };

  new ResizeObserver(resize).observe(root);
  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; update(); }).observe(root);
  document.addEventListener('visibilitychange', update);
  window.addEventListener('themechange', applyColours);
  pauseBtn.addEventListener('click', () => {
    userPaused = !userPaused;
    savePaused(userPaused);
    update();
  });

  applyColours();
  resize();
  pauseBtn.hidden = false;
  root.classList.add('is-live');
  update();
}
