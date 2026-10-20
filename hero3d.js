/* ══════════════════════════════════════════════════
   hero3d.js — the home hero's crystal lattice (three.js, loaded on demand)

   A lattice on a skewed basis (a nod to lattice cryptography / Kyber
   Crystals), trimmed to a sphere, with depth fog, data packets doing random
   walks along its edges, and a pulsing "shortest vector". The static SVG
   poster in .hero-right is the default; three.js is only imported when
   motion3d.js allows it. Rendering stops off-screen, in hidden tabs, and when
   the shared pause switch is on.
══════════════════════════════════════════════════ */

import { motionAllowed, whenVisibleAndIdle, motionPaused, showPauseButton, tokens, seeded } from './motion3d.js';

const root = document.querySelector('.hero-right');
const canvas = document.getElementById('heroCanvas');
const pauseBtn = document.querySelector('.hero-pause');

if (root && canvas && pauseBtn && root.offsetParent !== null && motionAllowed()) {
  whenVisibleAndIdle(root)
    .then(() => import('three'))
    .then(start)
    .catch(() => { /* network or WebGL failure: the poster stays */ });
}

function start(THREE) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 5, 9.2);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.set(0, 0, 7);
  const crystal = new THREE.Group();
  scene.add(crystal);

  // Lattice points on a skewed basis, kept inside a sphere of radius R.
  const basis = [
    new THREE.Vector3(0.62, 0.08, 0.02),
    new THREE.Vector3(0.12, 0.6, 0.1),
    new THREE.Vector3(0.06, 0.16, 0.62),
  ];
  const R = 2.05, N = 4;
  const index = new Map();
  const nodes = [];
  for (let i = -N; i <= N; i++) {
    for (let j = -N; j <= N; j++) {
      for (let k = -N; k <= N; k++) {
        const p = basis[0].clone().multiplyScalar(i)
          .addScaledVector(basis[1], j)
          .addScaledVector(basis[2], k);
        if (p.length() > R) continue;
        index.set(`${i},${j},${k}`, nodes.length);
        nodes.push({ p, ijk: [i, j, k] });
      }
    }
  }

  // Edges along the three basis directions, plus neighbour lists for packets.
  const edges = [];
  const neighbours = nodes.map(() => []);
  nodes.forEach((n, a) => {
    for (const [di, dj, dk] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      const b = index.get(`${n.ijk[0] + di},${n.ijk[1] + dj},${n.ijk[2] + dk}`);
      if (b === undefined) continue;
      edges.push([a, b]);
      neighbours[a].push(b);
      neighbours[b].push(a);
    }
  });

  const points = list => {
    const arr = new Float32Array(list.length * 3);
    list.forEach((v, i) => v.toArray(arr, i * 3));
    return new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(arr, 3));
  };
  const lineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.3, depthWrite: false });
  const nodeMat = new THREE.PointsMaterial({ size: 0.055, transparent: true, opacity: 0.9, depthWrite: false });
  const packetMat = new THREE.PointsMaterial({ size: 0.12, transparent: true, depthWrite: false });
  const vectorMat = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });
  const markMat = new THREE.PointsMaterial({ size: 0.17, transparent: true, depthWrite: false });
  const shellMat = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.06, depthWrite: false });

  crystal.add(new THREE.LineSegments(points(edges.flatMap(([a, b]) => [nodes[a].p, nodes[b].p])), lineMat));
  crystal.add(new THREE.Points(points(nodes.map(n => n.p)), nodeMat));

  // "Shortest vector": from the origin to a nearby lattice point.
  const origin = nodes[index.get('0,0,0')].p;
  const target = nodes[index.get('1,-1,1') ?? index.get('1,0,0')].p;
  crystal.add(new THREE.Line(points([origin, target]), vectorMat));
  crystal.add(new THREE.Points(points([origin, target]), markMat));

  // Packets walking the edges (seeded, so the layout is the same every visit).
  const random = seeded(7);
  const packets = Array.from({ length: 26 }, () => {
    const a = Math.floor(random() * nodes.length);
    const options = neighbours[a].length ? neighbours[a] : [a];
    return { prev: a, a, b: options[Math.floor(random() * options.length)], t: random(), speed: 0.9 + random() * 0.9 };
  });
  const packetPos = new Float32Array(packets.length * 3);
  const packetGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(packetPos, 3));
  crystal.add(new THREE.Points(packetGeo, packetMat));

  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(R + 0.25, 2), shellMat);
  scene.add(shell);

  const scratch = new THREE.Vector3();
  const stepPackets = dt => {
    packets.forEach((p, i) => {
      p.t += dt * p.speed;
      while (p.t >= 1) {
        p.t -= 1;
        const options = neighbours[p.b].filter(n => n !== p.a);
        const pool = options.length ? options : neighbours[p.b];
        p.a = p.b;
        p.b = pool[Math.floor(random() * pool.length)] ?? p.a;
      }
      const s = p.t * p.t * (3 - 2 * p.t);
      scratch.copy(nodes[p.a].p).lerp(nodes[p.b].p, s).toArray(packetPos, i * 3);
    });
    packetGeo.attributes.position.needsUpdate = true;
  };

  // Colours from tokens; additive glow on dark, normal blending on light.
  let running = false;
  const applyTheme = () => {
    const c = tokens();
    const dark = document.documentElement.dataset.theme !== 'light';
    scene.fog.color.setStyle(c.bg);
    lineMat.color.setStyle(c.accent);
    nodeMat.color.setStyle(c.accent2);
    packetMat.color.setStyle(dark ? c.accent2 : c.accent);
    vectorMat.color.setStyle(c.text);
    markMat.color.setStyle(c.text);
    shellMat.color.setStyle(c.accent);
    for (const m of [lineMat, nodeMat, packetMat, vectorMat, markMat, shellMat]) {
      m.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      m.needsUpdate = true;
    }
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

  // The camera drifts towards the pointer for parallax.
  let targetX = 0, targetY = 0;
  root.addEventListener('pointermove', e => {
    const r = root.getBoundingClientRect();
    targetX = ((e.clientX - r.left) / r.width - 0.5) * 2;
    targetY = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  root.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; });

  let t = 0, last = 0, raf = 0;
  const frame = now => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;
    crystal.rotation.y = t * 0.14;
    crystal.rotation.x = Math.sin(t * 0.23) * 0.18;
    shell.rotation.y = -t * 0.05;
    stepPackets(dt);
    vectorMat.opacity = 0.55 + 0.45 * Math.sin(t * 2.2);
    camera.position.x += (targetX * 0.9 - camera.position.x) * 0.05;
    camera.position.y += (-targetY * 0.6 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };

  let onScreen = true;
  const update = () => {
    const shouldRun = onScreen && !motionPaused.get() && !document.hidden;
    if (shouldRun && !running) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
    root.dataset.state = running ? 'running' : motionPaused.get() ? 'paused' : 'idle';
  };

  new ResizeObserver(resize).observe(root);
  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; update(); }).observe(root);
  document.addEventListener('visibilitychange', update);
  window.addEventListener('motionpause', update);
  window.addEventListener('themechange', applyTheme);

  stepPackets(0);
  applyTheme();
  resize();
  showPauseButton(pauseBtn);
  root.classList.add('is-live');
  update();
}
