/* 3DOCNA — visor 3D del llavero NFC.
   Carga los STL reales de cada pieza (los mismos con los que se imprime) y los coloca
   sobre una cama de impresión según lo que el cliente va eligiendo.
   - Solo se carga en la página del producto (la portada sigue sin librerías 3D).
   - Dibuja bajo demanda: cuando no hay nada que mover, no gasta batería.
   - Arrastrar en horizontal gira la escena; en vertical, la página sigue haciendo scroll. */
import * as THREE from "../vendor/three/three.module.min.js";
import { STLLoader } from "../vendor/three/STLLoader.js";

const BASE = "/models/llavero-nfc/";
// Cada pieza está hecha de cuerpos que se imprimen en colores distintos (grupo de color de cada uno)
const PARTS = {
  carcasa: [["carcasa-carcasa", "marco"]],
  frontal: [["frontal-nfc-placa-frontal", "piezas"], ["frontal-nfc-icono-nfc", "iconos"]],
  cajonContacto: [["cajon-contacto-cajon", "piezas"], ["cajon-contacto-icono-contacto", "iconos"]],
  cajonRedes: [["cajon-redes-cajon", "piezas"], ["cajon-redes-icono-arroba", "iconos"]],
  estacion: [["estacion-estacion", "piezas"]],
  clip: [["clip-mochila-clip", "piezas"]],
};

// Medidas en mm (las del modelo). El eje Z del STL es la altura de impresión.
const KEY_T = 8; // grosor del llavero montado

export async function createViewer(host, { colors, reduced = false } = {}) {
  const loader = new STLLoader();
  const files = [...new Set(Object.values(PARTS).flat().map(([f]) => f))];
  const geos = {};
  await Promise.all(files.map(async (f) => {
    const g = await loader.loadAsync(BASE + f + ".stl");
    g.computeVertexNormals();
    geos[f] = g;
  }));

  // Estado del bucle y de la cámara (declarado antes de usarlo)
  let raf = 0, visible = true;
  let az = -0.45, el = 0.62, dist = 300, bedR = 90, bedTarget = 90, fitTarget = 60;
  const small = matchMedia("(max-width: 700px)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 4000);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3340, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(120, 260, 160);
  sun.castShadow = !small;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -220, right: 220, top: 220, bottom: -220, near: 10, far: 900 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xf5a3c8, 0.45);
  rim.position.set(-200, 120, -180);
  scene.add(rim);

  // Cama de impresión: disco con rejilla
  const bed = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshStandardMaterial({ color: 0x1d1a22, roughness: 0.9 }));
  plate.rotation.x = -Math.PI / 2;
  plate.receiveShadow = true;
  bed.add(plate);
  const grid = new THREE.GridHelper(2, 24, 0x4a4352, 0x2d2934);
  grid.position.y = 0.002; // la cama se escala por su radio: esto son 0,2 mm
  bed.add(grid);
  scene.add(bed);

  const mats = {
    marco: new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0 }),
    piezas: new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0 }),
    iconos: new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0 }),
  };
  const setColors = (c) => { for (const k in mats) if (c[k]) mats[k].color.set(c[k]); requestDraw(); };
  setColors(colors || { marco: "#1b1b1f", piezas: "#f1efe9", iconos: "#e8742f" });

  const mesh = (file, group) => {
    const m = new THREE.Mesh(geos[file], mats[group]);
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  // Pasa de «Z hacia arriba» (STL) a «Y hacia arriba» (three)
  const zUp = (obj) => { const g = new THREE.Group(); obj.rotation.x = -Math.PI / 2; g.add(obj); return g; };

  const builders = {
    // Llavero montado: carcasa + frontal (dado la vuelta, cara decorada arriba) + cajón Contacto metido
    llavero: () => {
      const g = new THREE.Group();
      for (const [f, c] of PARTS.carcasa) g.add(mesh(f, c));
      const fr = new THREE.Group();
      for (const [f, c] of PARTS.frontal) fr.add(mesh(f, c));
      fr.rotation.x = Math.PI; // boca arriba
      fr.position.set(0, -3.82, KEY_T - 0.04); // un pelo por debajo: el labio negro de la carcasa queda a la vista
      g.add(fr);
      const cj = new THREE.Group();
      for (const [f, c] of PARTS.cajonContacto) cj.add(mesh(f, c));
      cj.position.set(0, 4.2, KEY_T - 5);
      g.add(cj);
      return { obj: zUp(g), w: 32.1, d: 53.3 };
    },
    cajonContacto: () => { const g = new THREE.Group(); for (const [f, c] of PARTS.cajonContacto) g.add(mesh(f, c)); return { obj: zUp(g), w: 32.1, d: 44.9 }; },
    cajonRedes: () => { const g = new THREE.Group(); for (const [f, c] of PARTS.cajonRedes) g.add(mesh(f, c)); return { obj: zUp(g), w: 32.1, d: 44.9 }; },
    estacion: () => { const g = new THREE.Group(); for (const [f, c] of PARTS.estacion) g.add(mesh(f, c)); return { obj: zUp(g), w: 72.8, d: 24.2, h: 56, back: true }; },
    clip: () => { const g = new THREE.Group(); for (const [f, c] of PARTS.clip) g.add(mesh(f, c)); return { obj: zUp(g), w: 53.9, d: 7.4 }; },
  };

  const world = new THREE.Group();
  scene.add(world);
  let items = []; // { key, obj, w, d, back, target: Vector3, t0, leaving }

  /* ---------- Colocación ---------- */
  function layout() {
    const GAP = 10;
    const live = items.filter((i) => !i.leaving);
    const back = live.filter((i) => i.back), front = live.filter((i) => !i.back);
    const rowW = Math.max(150, ...back.map((i) => i.w));
    // Filas de delante: se van llenando hasta el ancho de la fila
    const rows = [];
    let row = [], w = 0;
    for (const it of front) {
      if (row.length && w + GAP + it.w > rowW + 40) { rows.push(row); row = []; w = 0; }
      w += (row.length ? GAP : 0) + it.w; row.push(it);
    }
    if (row.length) rows.push(row);
    let z = 0;
    const place = (r) => {
      const total = r.reduce((s, i) => s + i.w, 0) + GAP * (r.length - 1);
      let x = -total / 2;
      const depth = Math.max(...r.map((i) => i.d));
      for (const it of r) { it.target.set(x + it.w / 2, 0, z + depth / 2); x += it.w + GAP; }
      z += depth + GAP * 1.6;
    };
    if (back.length) {
      // Las estaciones, detrás y en fila
      const total = back.reduce((s, i) => s + i.w, 0) + GAP * (back.length - 1);
      let x = -total / 2;
      for (const it of back) { it.target.set(x + it.w / 2, 0, z + it.d / 2); x += it.w + GAP * 1.5; }
      z += Math.max(...back.map((i) => i.d)) + GAP * 2;
    }
    rows.forEach(place);
    const depthAll = Math.max(z - GAP * 1.6, 1);
    for (const it of live) it.target.z -= depthAll / 2;
    // Tamaño de la cama y del encuadre
    let r = 40;
    for (const it of live) r = Math.max(r, Math.hypot(Math.abs(it.target.x) + it.w / 2, Math.abs(it.target.z) + it.d / 2), (it.h || 0) * 0.95);
    bedTarget = r + 26;
    fitTarget = r;
  }

  /* ---------- Estado pedido → escena ---------- */
  function set(counts) {
    // counts: { llavero, cajonContacto, cajonRedes, estacion, clip } (máximo 6 de cada para que se vea bien)
    const now = performance.now();
    for (const key of Object.keys(builders)) {
      const want = Math.min(counts[key] || 0, 6);
      const have = items.filter((i) => i.key === key && !i.leaving);
      for (let k = have.length; k < want; k++) {
        const b = builders[key]();
        const it = { key, ...b, target: new THREE.Vector3(), t0: reduced ? -1e9 : now, leaving: 0 };
        world.add(it.obj);
        items.push(it);
      }
      for (let k = have.length - 1; k >= want; k--) have[k].leaving = reduced ? -1e9 : now;
    }
    layout();
    // Las nuevas aparecen ya en su sitio, cayendo desde arriba
    for (const it of items) if (it.t0 === now || it.t0 < 0) { it.obj.position.copy(it.target); }
    kick();
  }

  /* ---------- Cámara y giro ---------- */
  let azVel = 0, auto = !reduced, dragging = false, lastX = 0, lastY = 0, idleSince = 0;
  const el0 = 0.62, AZ0 = -0.45, SWAY = 0.55;
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
    dragging = true; auto = false; lastX = e.clientX; lastY = e.clientY; azVel = 0;
    cv.setPointerCapture(e.pointerId); host.classList.add("is-grabbing"); kick();
  });
  cv.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    azVel = -dx * 0.008;
    az += azVel;
    if (e.pointerType === "mouse") el = Math.min(1.25, Math.max(0.18, el + dy * 0.005));
    kick();
  });
  const up = () => { if (!dragging) return; dragging = false; idleSince = performance.now(); host.classList.remove("is-grabbing"); kick(); };
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);

  /* ---------- Bucle: solo mientras algo se mueve ---------- */
  const ease = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
  function frame(now) {
    raf = 0;
    let busy = false;
    // Cama y encuadre se ajustan suavemente a lo que hay encima
    bedR += (bedTarget - bedR) * 0.12;
    if (Math.abs(bedTarget - bedR) > 0.2) busy = true;
    bed.scale.setScalar(bedR);
    grid.scale.setScalar(1);
    const fov = (camera.fov * Math.PI) / 180;
    const fitDist = (fitTarget * 1.02) / Math.sin(fov / 2) / Math.min(1, camera.aspect * 0.95);
    dist += (fitDist - dist) * 0.1;
    if (Math.abs(fitDist - dist) > 0.5) busy = true;

    // Inercia al soltar y giro automático suave
    if (!dragging) {
      if (Math.abs(azVel) > 0.0004) { az += azVel; azVel *= 0.93; busy = true; }
      else if (!auto && !reduced && now - idleSince > 4000) { auto = true; swayT = Math.asin(Math.max(-1, Math.min(1, (az - AZ0) / SWAY))); }
      // Vaivén suave alrededor de la vista de frente: lo de delante nunca queda tapado por la estación
      if (auto && visible) { swayT += 0.006; az += (AZ0 + Math.sin(swayT) * SWAY - az) * 0.08; busy = true; }
      el += (el0 - el) * 0.05;
      if (Math.abs(el0 - el) > 0.001) busy = true;
    } else busy = true;

    // Piezas: caen al llegar, se encogen al irse
    for (const it of items) {
      const p = it.obj.position;
      p.x += (it.target.x - p.x) * 0.16;
      p.z += (it.target.z - p.z) * 0.16;
      if (Math.abs(it.target.x - p.x) + Math.abs(it.target.z - p.z) > 0.05) busy = true;
      if (it.leaving) {
        const k = ease((now - it.leaving) / 280);
        it.obj.scale.setScalar(1 - k);
        if (k >= 1) { world.remove(it.obj); it.dead = true; } else busy = true;
      } else {
        const k = ease((now - it.t0) / 650);
        p.y = (1 - k) * 70;
        it.obj.scale.setScalar(0.6 + 0.4 * k);
        if (k < 1) busy = true;
      }
    }
    if (items.some((i) => i.dead)) items = items.filter((i) => !i.dead);

    camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(0, 10, 0);
    renderer.render(scene, camera);
    if (busy && visible) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }
  function requestDraw() { kick(); }

  // Fuera de pantalla, quieto
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(host);
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) kick(); });

  resize();
  return {
    set, setColors,
    // Para sacar una imagen de una sola pieza (fichas de la página)
    snapshot() { renderer.render(scene, camera); return renderer.domElement.toDataURL("image/png"); },
  };
}
