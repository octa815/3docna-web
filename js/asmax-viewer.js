/* 3DOCNA — visor 3D del estuche para 2 intercom ASMAX F1 Pro.
   Base, tapa y puerta son los STL reales (exportados ya en su posición de montaje).
   La tapa gira sobre su tornillo M3×30 (hasta 110°) y la puerta de carga sobre el M3×20 (hasta 90°),
   con los ejes exactos del modelo de Fusion. El intercom, el fieltro, los imanes y los tornillos se
   reconstruyen aquí con las medidas tomadas con calibre.
   Igual que el visor del llavero NFC: solo se carga en su página, dibuja bajo demanda y se para fuera de pantalla. */
import * as THREE from "../vendor/three/three.module.min.js";
import { STLLoader } from "../vendor/three/STLLoader.js";

const BASE = "/models/estuche-asmax/";

// ---- Medidas (mm), las mismas de generar_fusion.py ----
const A = 86.13, B = 37.07, C = 20.11, DD = 25.0, G = 61.8, G1 = 45.0;     // intercom en planta
const PERFIL = [[0, 14.61], [8, 16.0], [28, 19.6], [44.8, 21.9], [50, 23.43], [58.8, 20.7], [72.7, 19.6], [A, 17.3]]; // grosor según X
const HOL = 0.8, SUELO = 1.6, ESP_B = 3.0, ESP_T = 4.0, COMPR = 0.5, Z_CORTE = 22.0;
const Z_DEV = SUELO + ESP_B;                       // donde apoya el intercom
const Z_TECHO = Z_DEV + 23.43 + ESP_T - COMPR;     // techo interior de la tapa
const X1 = A + HOL + 4.0;                          // cara exterior del lado USB
const SEP = B + 2 * HOL + 2.4, CENTROS = [-SEP / 2, SEP / 2];
const W2 = SEP / 2 + B / 2 + HOL + 2.4;
const TAPA_EJE = [-3.2 - 4.5 - 0.4, Z_CORTE];      // (x, z) del tornillo de la tapa
const PUERTA_EJE = [X1 + 0.3 + 3.5, 3.5];          // (x, z) del tornillo de la puerta
const TAPA_MAX = (110 * Math.PI) / 180, PUERTA_MAX = (90 * Math.PI) / 180;
const IMANES = [[X1 - 4.3, -(W2 - 4.3), 6], [X1 - 4.3, W2 - 4.3, 6], [X1 - 10.2 / 2 - 1.2, 0, 10]];
const IMAN_P = [[-34, 13.5], [34, 13.5]];          // imanes de la puerta (y, z)

const lerpTab = (tab, x) => {
  for (let i = 1; i < tab.length; i++) if (x <= tab[i][0]) {
    const [x0, y0] = tab[i - 1], [x1, y1] = tab[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return tab[tab.length - 1][1];
};
// Ancho del intercom en planta según X (contorno de 8 puntos de la funda)
const ancho = (x) => lerpTab([[0, C], [G1, B], [G, B], [A, DD]], x);

// Intercom: rebanadas a lo largo de X con sección de «diamante» (lados, aristas y cumbrera), como sus facetas
function intercomGeo() {
  const xs = [0, 8, 20, 28, 36, 44.8, 50, 54, 58.8, 61.8, 66, 72.7, 80, A];
  const ring = (x) => {
    const w = ancho(x) / 2, h = lerpTab(PERFIL, x);
    return [[0, -w, 0], [0, -w, h * 0.42], [0, -w * 0.55, h * 0.86], [0, 0, h], [0, w * 0.55, h * 0.86], [0, w, h * 0.42], [0, w, 0]];
  };
  const pos = [], idx = [];
  xs.forEach((x) => ring(x).forEach(([, y, z]) => pos.push(x, y, z)));
  const n = 7;
  for (let i = 0; i < xs.length - 1; i++) for (let k = 0; k < n; k++) {
    const a = i * n + k, b = i * n + ((k + 1) % n), c2 = (i + 1) * n + k, d = (i + 1) * n + ((k + 1) % n);
    idx.push(a, c2, b, b, c2, d);
  }
  // Tapas de los extremos
  for (const i of [0, xs.length - 1]) for (let k = 1; k < n - 1; k++) {
    const o = i * n;
    if (i === 0) idx.push(o, o + k, o + k + 1); else idx.push(o, o + k + 1, o + k);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}
function plantaShape(off) {
  const s = new THREE.Shape();
  const pts = [[0, -C / 2], [G1, -B / 2], [G, -B / 2], [A, -DD / 2], [A, DD / 2], [G, B / 2], [G1, B / 2], [0, C / 2]];
  // Contorno de la funda (holgura incluida): se agranda un poco hacia fuera
  const cx = A / 2;
  pts.forEach(([x, y], i) => {
    const px = x + Math.sign(x - cx) * off, py = y + Math.sign(y) * off;
    i ? s.lineTo(px, py) : s.moveTo(px, py);
  });
  s.closePath();
  return s;
}

export async function createAsmaxViewer(host, { colors, reduced = false } = {}) {
  const loader = new STLLoader();
  const [gBase, gTapa, gPuerta] = await Promise.all(["base", "tapa", "puerta"].map(async (f) => {
    const g = await loader.loadAsync(BASE + f + ".stl");
    g.computeVertexNormals();
    return g;
  }));

  let raf = 0, visible = true; // estado del bucle (antes de cualquier kick())
  const small = matchMedia("(max-width: 700px)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 4000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3340, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.3);
  sun.position.set(160, 280, 140);
  sun.castShadow = !small;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, near: 10, far: 900 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xf5a3c8, 0.4);
  rim.position.set(-200, 120, -180);
  scene.add(rim);

  // Suelo: disco con rejilla
  const floor = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(150, 96), new THREE.MeshStandardMaterial({ color: 0x1d1a22, roughness: 0.9 }));
  disc.rotation.x = -Math.PI / 2;
  disc.receiveShadow = true;
  floor.add(disc);
  const grid = new THREE.GridHelper(300, 30, 0x4a4352, 0x2d2934);
  grid.position.y = 0.05;
  floor.add(grid);
  scene.add(floor);

  const mats = {
    base: new THREE.MeshStandardMaterial({ roughness: 0.55 }),
    tapa: new THREE.MeshStandardMaterial({ roughness: 0.55 }),
    fieltro: new THREE.MeshStandardMaterial({ color: 0x77777f, roughness: 1 }),
    intercom: new THREE.MeshStandardMaterial({ color: 0x1c2233, roughness: 0.15, metalness: 0.45, flatShading: true }),
    iman: new THREE.MeshStandardMaterial({ color: 0xd9dbe0, roughness: 0.25, metalness: 0.9 }),
    tornillo: new THREE.MeshStandardMaterial({ color: 0xbfc3ca, roughness: 0.35, metalness: 0.85 }),
  };
  const setColors = (c) => { if (c.base) mats.base.color.set(c.base); if (c.tapa) mats.tapa.color.set(c.tapa); kick(); };
  const shadow = (m) => { m.castShadow = m.receiveShadow = true; return m; };

  // Todo se monta en coordenadas del modelo (Z hacia arriba) y se gira al final
  const model = new THREE.Group();
  model.rotation.x = -Math.PI / 2;
  const world = new THREE.Group();
  world.add(model);
  scene.add(world);

  model.add(shadow(new THREE.Mesh(gBase, mats.base)));

  // Fieltro del fondo e intercom en cada funda
  const intercoms = new THREE.Group();
  const geoI = intercomGeo();
  for (const cy of CENTROS) {
    const f = new THREE.Mesh(new THREE.ExtrudeGeometry(plantaShape(HOL * 0.6), { depth: ESP_B, bevelEnabled: false }), mats.fieltro);
    f.position.set(0, cy, SUELO);
    model.add(shadow(f));
    const it = new THREE.Mesh(geoI, mats.intercom);
    it.position.set(0, cy, Z_DEV);
    intercoms.add(shadow(it));
  }
  model.add(intercoms);

  // Imanes de cierre de la base
  const disco = (d, h) => new THREE.CylinderGeometry(d / 2, d / 2, h, 28);
  for (const [x, y, d] of IMANES) {
    const m = new THREE.Mesh(disco(d, 2), mats.iman);
    m.rotation.x = Math.PI / 2;
    m.position.set(x, y, Z_CORTE - 1.05);
    model.add(m);
  }
  for (const [y, z] of IMAN_P) {
    const m = new THREE.Mesh(disco(6, 2), mats.iman);
    m.rotation.z = Math.PI / 2;
    m.position.set(X1 - 1.05, y, z);
    model.add(m);
  }

  // Tapa: gira sobre su eje (pivote en el tornillo)
  const pivTapa = new THREE.Group();
  pivTapa.position.set(TAPA_EJE[0], 0, TAPA_EJE[1]);
  const tapa = new THREE.Group();
  tapa.position.set(-TAPA_EJE[0], 0, -TAPA_EJE[1]);
  tapa.add(shadow(new THREE.Mesh(gTapa, mats.tapa)));
  for (const cy of CENTROS) {
    const f = new THREE.Mesh(new THREE.ExtrudeGeometry(plantaShape(HOL * 0.6), { depth: ESP_T, bevelEnabled: false }), mats.fieltro);
    f.position.set(0, cy, Z_TECHO - ESP_T);
    tapa.add(f);
  }
  for (const [x, y, d] of IMANES) {
    const m = new THREE.Mesh(disco(d, 2), mats.iman);
    m.rotation.x = Math.PI / 2;
    m.position.set(x, y, Z_CORTE + 1.05);
    tapa.add(m);
  }
  pivTapa.add(tapa);
  model.add(pivTapa);
  const tornilloTapa = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 30, 16), mats.tornillo);
  tornilloTapa.position.set(TAPA_EJE[0], 0, TAPA_EJE[1]);
  model.add(tornilloTapa);

  // Puerta de carga: gira hacia fuera sobre el tornillo de abajo
  const pivPuerta = new THREE.Group();
  pivPuerta.position.set(PUERTA_EJE[0], 0, PUERTA_EJE[1]);
  const puerta = new THREE.Group();
  puerta.position.set(-PUERTA_EJE[0], 0, -PUERTA_EJE[1]);
  puerta.add(shadow(new THREE.Mesh(gPuerta, mats.tapa)));
  for (const [y, z] of IMAN_P) {
    const m = new THREE.Mesh(disco(6, 2), mats.iman);
    m.rotation.z = Math.PI / 2;
    m.position.set(X1 + 0.3 + 1.05, y, z);
    puerta.add(m);
  }
  pivPuerta.add(puerta);
  model.add(pivPuerta);
  const tornilloPuerta = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 20, 16), mats.tornillo);
  tornilloPuerta.position.set(PUERTA_EJE[0], 0, PUERTA_EJE[1]);
  model.add(tornilloPuerta);

  // Centrar el conjunto sobre el suelo
  world.position.set(-(98.23 - 12.6) / 2, 0, 0); // del borde de la bisagra (−12,6) al de la puerta (98,2)

  setColors(colors || { base: "#e8742f", tapa: "#e85fc4" });

  /* ---------- Estado: tapa y puerta (0 cerrada · 1 abierta) ---------- */
  const st = { tapa: 0, puerta: 0, tapaT: 0, puertaT: 0, intercom: true };
  let demo = !reduced, demoT0 = performance.now(), onState = () => {};

  /* ---------- Cámara ---------- */
  let az = 0.75, el = 0.55, dist = 420, azVel = 0, dragging = false, lastX = 0, lastY = 0, idle = 0;
  const AZ0 = 0.75, SWAY = 0.45;
  let swayT = 0;
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    kick();
  }
  new ResizeObserver(resize).observe(host);

  const cv = renderer.domElement;
  cv.style.touchAction = "pan-y";
  cv.addEventListener("pointerdown", (e) => {
    dragging = true; demo = false; lastX = e.clientX; lastY = e.clientY; azVel = 0;
    cv.setPointerCapture(e.pointerId); host.classList.add("is-grabbing"); kick();
  });
  cv.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    azVel = -dx * 0.008; az += azVel;
    if (e.pointerType === "mouse") el = Math.min(1.3, Math.max(0.1, el + dy * 0.005));
    kick();
  });
  const up = () => { if (!dragging) return; dragging = false; idle = performance.now(); host.classList.remove("is-grabbing"); kick(); };
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);

  // Demostración automática: abre la tapa, la cierra, baja la puerta, la sube… (solo si nadie toca)
  const DEMO = [[0, 0, 1400], [1, 0, 2600], [0, 0, 1600], [0, 1, 2400], [0, 0, 1400]];
  const DEMO_LEN = DEMO.reduce((s, d) => s + d[2], 0);

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function frame(now) {
    raf = 0;
    let busy = false;
    if (demo && visible) {
      let t = (now - demoT0) % DEMO_LEN, k = 0;
      while (t > DEMO[k][2]) { t -= DEMO[k][2]; k++; }
      if (st.tapaT !== DEMO[k][0] || st.puertaT !== DEMO[k][1]) { st.tapaT = DEMO[k][0]; st.puertaT = DEMO[k][1]; onState(st); }
      busy = true;
    }
    // Tapa y puerta se mueven con suavidad hacia su objetivo
    const sp = reduced ? 1 : 0.06;
    for (const k of ["tapa", "puerta"]) {
      const d = st[k + "T"] - st[k];
      if (Math.abs(d) > 0.001) { st[k] += Math.sign(d) * Math.min(Math.abs(d), sp); busy = true; } else st[k] = st[k + "T"];
    }
    pivTapa.rotation.y = -ease(st.tapa) * TAPA_MAX;
    pivPuerta.rotation.y = ease(st.puerta) * PUERTA_MAX;

    if (!dragging) {
      if (Math.abs(azVel) > 0.0004) { az += azVel; azVel *= 0.93; busy = true; }
      else if (!reduced && now - idle > 5000) {
        swayT += 0.005; az += (AZ0 + Math.sin(swayT) * SWAY - az) * 0.04; busy = true;
      }
    } else busy = true;

    // Encuadre: un poco más lejos con la tapa abierta
    const fov = (camera.fov * Math.PI) / 180;
    const r = 78 + ease(st.tapa) * 34;
    const target = (r * 1.05) / Math.sin(fov / 2) / Math.min(1, camera.aspect * 0.95);
    dist += (target - dist) * 0.12;
    if (Math.abs(target - dist) > 0.5) busy = true;

    camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(0, 18 + ease(st.tapa) * 10, 0);
    renderer.render(scene, camera);
    if (busy && visible) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(host);
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) kick(); });
  resize();

  return {
    setColors,
    // Abre o cierra a mano (la demostración se para)
    set(k, open) { demo = false; st[k + "T"] = open ? 1 : 0; onState(st); kick(); },
    toggle(k) { this.set(k, st[k + "T"] < 0.5); },
    showIntercom(v) { intercoms.visible = v; kick(); },
    state: () => ({ tapa: st.tapaT, puerta: st.puertaT }),
    onState(fn) { onState = fn; },
  };
}
