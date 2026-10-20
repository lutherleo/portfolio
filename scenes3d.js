/* ══════════════════════════════════════════════════
   scenes3d.js — live 3D scenes in the home "Selected work" rows

   Each .term[data-scene] terminal window gets a small scene that illustrates
   the project. One shared, off-screen WebGL renderer draws each visible
   scene and copies the frame into that window's canvas, so the page only
   ever holds one extra WebGL context. Loading, pausing and colours follow
   motion3d.js (the terminal windows keep the dark palette in both themes).
══════════════════════════════════════════════════ */

import { motionAllowed, whenVisibleAndIdle, motionPaused, showPauseButton, tokens } from './motion3d.js';

const figures = [...document.querySelectorAll('.term[data-scene]')]
  .filter(fig => fig.querySelector('.term-scene'));

if (figures.length && motionAllowed() && figures[0].offsetParent !== null) {
  whenVisibleAndIdle(figures[0])
    .then(() => import('three'))
    .then(start)
    .catch(() => { /* network or WebGL failure: the text outline stays */ });
}

function start(THREE) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const dpr = Math.min(window.devicePixelRatio, 2);

  const items = figures.map(fig => {
    const holder = fig.querySelector('.term-scene');
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    holder.append(canvas);
    const built = BUILDERS[fig.dataset.scene](THREE, tokens(fig));
    return { fig, holder, canvas, ctx: canvas.getContext('2d'), visible: false, w: 1, h: 1, ...built };
  });

  // The shared buffer is sized to the largest scene and only grows, so it is
  // never reallocated per frame; each scene renders into its bottom-left corner.
  let bufW = 1, bufH = 1;
  const resize = item => {
    const r = item.holder.getBoundingClientRect();
    if (!r.width || !r.height) return;
    item.w = Math.round(r.width * dpr);
    item.h = Math.round(r.height * dpr);
    item.canvas.width = item.w;
    item.canvas.height = item.h;
    item.camera.aspect = r.width / r.height;
    item.camera.updateProjectionMatrix();
    if (item.w > bufW || item.h > bufH) {
      bufW = Math.max(bufW, item.w);
      bufH = Math.max(bufH, item.h);
      renderer.setSize(bufW, bufH, false);
    }
  };

  const draw = (item, time) => {
    item.update(time);
    renderer.setViewport(0, 0, item.w, item.h);
    renderer.render(item.scene, item.camera);
    item.ctx.clearRect(0, 0, item.w, item.h);
    item.ctx.drawImage(renderer.domElement, 0, bufH - item.h, item.w, item.h, 0, 0, item.w, item.h);
  };

  let t = 0, last = 0, raf = 0, running = false;
  const frame = now => {
    t += Math.min((now - last) / 1000, 0.05);
    last = now;
    for (const item of items) if (item.visible) draw(item, t);
    raf = requestAnimationFrame(frame);
  };

  const update = () => {
    const shouldRun = items.some(i => i.visible) && !motionPaused.get() && !document.hidden;
    if (shouldRun && !running) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  };

  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const item = items.find(i => i.fig === e.target);
      if (item) item.visible = e.isIntersecting;
    }
    update();
  });

  for (const item of items) {
    resize(item);
    draw(item, 0);
    new ResizeObserver(() => { resize(item); if (!running) draw(item, t); }).observe(item.holder);
    io.observe(item.fig);
    item.fig.classList.add('is-live');
    showPauseButton(item.fig.querySelector('.scene-pause'));
  }
  document.addEventListener('visibilitychange', update);
  window.addEventListener('motionpause', update);
}

/* ── Scene builders: each returns { scene, camera, update(t) } ── */

function baseScene(THREE, c, cameraPos) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(new THREE.Color().setStyle(c.bg), 5, 11);
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 50);
  camera.position.set(...cameraPos);
  camera.lookAt(0, 0, 0);
  const color = value => new THREE.Color().setStyle(value);
  return { scene, camera, color };
}

/* Kyber Crystals: Alice ↔ Bob through a tunnel of rings (two backends), packets both ways. */
function channel(THREE, c) {
  const { scene, camera, color } = baseScene(THREE, c, [0.4, 1.5, 6.2]);
  const group = new THREE.Group();
  scene.add(group);
  const endpoint = x => {
    const mesh = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.42)),
      new THREE.LineBasicMaterial({ color: color(c.accent2) }),
    );
    mesh.position.x = x;
    group.add(mesh);
    return mesh;
  };
  const alice = endpoint(-2.25), bob = endpoint(2.25);
  const rings = [];
  for (let i = 0; i < 11; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(i % 2 ? 0.74 : 0.6, 0.008, 6, 56),
      new THREE.MeshBasicMaterial({ color: color(i % 2 ? c.text3 : c.accent), transparent: true, opacity: 0.6 }),
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.x = -1.6 + i * 0.32;
    group.add(ring);
    rings.push(ring);
  }
  const packetGeo = new THREE.SphereGeometry(0.07, 12, 12);
  const packets = Array.from({ length: 6 }, (_, i) => {
    const mesh = new THREE.Mesh(packetGeo, new THREE.MeshBasicMaterial({ color: color(i % 2 ? c.text : c.accent2) }));
    group.add(mesh);
    return { mesh, dir: i % 2 ? -1 : 1, phase: i / 6 };
  });
  return {
    scene, camera,
    update(t) {
      group.rotation.y = Math.sin(t * 0.25) * 0.25;
      alice.rotation.y = t * 0.6;
      bob.rotation.y = -t * 0.6;
      rings.forEach((r, i) => { r.rotation.x = t * (i % 2 ? -0.45 : 0.45) + i * 0.3; });
      for (const p of packets) {
        const u = (t * 0.3 + p.phase) % 1;
        const x = p.dir > 0 ? -2.25 + u * 4.5 : 2.25 - u * 4.5;
        const a = u * Math.PI * 2 + p.phase * 6;
        p.mesh.position.set(x, Math.sin(a) * 0.24, Math.cos(a) * 0.24);
        p.mesh.scale.setScalar(0.25 + Math.sin(u * Math.PI));
      }
    },
  };
}

/* RaceFuzz: two CPU threads spiral around shared state; when both are inside the window, it's a race. */
function race(THREE, c) {
  const { scene, camera, color } = baseScene(THREE, c, [0, 1.1, 6.4]);
  const group = new THREE.Group();
  scene.add(group);
  const sharedMat = new THREE.LineBasicMaterial({ color: color(c.accent) });
  const shared = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.8, 0.8, 0.8)), sharedMat);
  group.add(shared);
  const thread = (phase, col) => {
    const pts = [];
    for (let i = 0; i <= 240; i++) {
      const s = i / 240;
      const a = s * Math.PI * 6 + phase;
      pts.push(new THREE.Vector3(Math.cos(a) * 1.5, -1.7 + s * 3.4, Math.sin(a) * 1.5));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: color(col), transparent: true, opacity: 0.4 })));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 14), new THREE.MeshBasicMaterial({ color: color(col) }));
    group.add(head);
    return { head, phase };
  };
  const cpu0 = thread(0, c.accent2), cpu1 = thread(Math.PI, c.text2);
  const spokePos = new Float32Array(12);
  const spokeGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(spokePos, 3));
  const spokeMat = new THREE.LineBasicMaterial({ color: color(c.danger), transparent: true, opacity: 0 });
  group.add(new THREE.LineSegments(spokeGeo, spokeMat));
  const calm = color(c.accent), alarm = color(c.danger);
  const place = (th, s) => {
    const a = s * Math.PI * 6 + th.phase;
    th.head.position.set(Math.cos(a) * 1.5, -1.7 + s * 3.4, Math.sin(a) * 1.5);
    return th.head.position;
  };
  return {
    scene, camera,
    update(t) {
      group.rotation.y = t * 0.18;
      shared.rotation.x = t * 0.4;
      shared.rotation.z = t * 0.25;
      const p0 = place(cpu0, (t * 0.11) % 1);
      const p1 = place(cpu1, (t * 0.083 + 0.42) % 1);
      const racing = Math.abs(p0.y) < 0.6 && Math.abs(p1.y) < 0.6;
      sharedMat.color.copy(racing ? alarm : calm);
      spokeMat.opacity = racing ? 0.9 : 0;
      p0.toArray(spokePos, 0);
      p1.toArray(spokePos, 6);
      spokeGeo.attributes.position.needsUpdate = true;
    },
  };
}

/* Adversarial ML: a perturbation pulse sweeps a small network and flips the prediction. */
function network(THREE, c) {
  const { scene, camera, color } = baseScene(THREE, c, [0.9, 1.0, 6.3]);
  const group = new THREE.Group();
  scene.add(group);
  const layers = [
    { x: -2.2, rows: 4, cols: 4 },
    { x: -0.75, rows: 6, cols: 1 },
    { x: 0.75, rows: 6, cols: 1 },
    { x: 2.2, rows: 3, cols: 1 },
  ].map(({ x, rows, cols }) => {
    const pts = [];
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < cols; k++) {
        pts.push(new THREE.Vector3(x, (r - (rows - 1) / 2) * 0.42, (k - (cols - 1) / 2) * 0.42));
      }
    }
    return pts;
  });
  const segs = [];
  for (let l = 0; l < layers.length - 1; l++) {
    for (const a of layers[l]) for (const b of layers[l + 1]) segs.push([a, b]);
  }
  const pos = new Float32Array(segs.length * 6);
  const col = new Float32Array(segs.length * 6);
  segs.forEach(([a, b], i) => { a.toArray(pos, i * 6); b.toArray(pos, i * 6 + 3); });
  const lineGeo = new THREE.BufferGeometry()
    .setAttribute('position', new THREE.BufferAttribute(pos, 3))
    .setAttribute('color', new THREE.BufferAttribute(col, 3));
  group.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7 })));

  const inputs = layers[0];
  const inputPos = new Float32Array(inputs.length * 3);
  const inputGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(inputPos, 3));
  group.add(new THREE.Points(inputGeo, new THREE.PointsMaterial({ color: color(c.text2), size: 0.11 })));
  const hiddenPts = [...layers[1], ...layers[2]];
  group.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(hiddenPts), new THREE.PointsMaterial({ color: color(c.text2), size: 0.09 })));
  const outputs = layers[3].map((p, i) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), new THREE.MeshBasicMaterial({ color: color(i === 0 ? c.accent : c.text3) }));
    mesh.position.copy(p);
    group.add(mesh);
    return mesh;
  });

  const base = color(c.text3), hot = color(c.danger), tmp = new THREE.Color();
  return {
    scene, camera,
    update(t) {
      group.rotation.y = Math.sin(t * 0.3) * 0.4 - 0.2;
      const wave = (t * 0.42) % 1;
      const wx = -2.4 + wave * 5.2;
      segs.forEach(([a, b], i) => {
        const mid = (a.x + b.x) / 2;
        const k = Math.exp(-((mid - wx) ** 2) / 0.12);
        tmp.copy(base).lerp(hot, k).toArray(col, i * 6);
        tmp.toArray(col, i * 6 + 3);
      });
      lineGeo.attributes.color.needsUpdate = true;
      inputs.forEach((p, i) => {
        inputPos[i * 3] = p.x;
        inputPos[i * 3 + 1] = p.y;
        inputPos[i * 3 + 2] = p.z + Math.sin(t * 7 + i * 1.7) * 0.035;
      });
      inputGeo.attributes.position.needsUpdate = true;
      const flipped = wave > 0.86;
      outputs[0].material.color.setStyle(flipped ? c.danger : c.accent);
      outputs[1].material.color.setStyle(flipped ? c.accent : c.text3);
    },
  };
}

const BUILDERS = { channel, race, network };
