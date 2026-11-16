/* 3DOCNA — tarjeta de invitación A6 en 3D, con los datos que escribe el visitante.
   El dibujo es el mismo de tarjeta.scad (Invitaciones_Boda): marco doble con arco, ramas de olivo
   en las esquinas, textos en sus posiciones y tamaños, separador y aro del NFC. Se pinta en un canvas
   (10 px por mm) y se pone sobre una placa de 105 × 148 × 2,4 mm, como el texto incrustado a color.
   Igual que los otros visores: dibuja bajo demanda y se para fuera de pantalla. */
import * as THREE from "../vendor/three/three.module.min.js";

const ANCHO = 105, ALTO = 148, GROSOR = 2.4, R_ESQ = 4, LINEA = 0.8, MARGEN = 5;
const NFC_Y = -38, ARO_D = 28;
const S = 10; // px por mm en la textura
// Fuentes de la tarjeta impresa: Gabriola (nombres) y Segoe UI Bold (resto). Si no están, alternativas libres.
const F_GUION = '"Gabriola", "Cormorant Garamond", serif';
const F_TEXTO = '"Segoe UI", "Public Sans", system-ui, sans-serif';

/* ---------------- Dibujo (coordenadas en mm con el origen en el centro y la Y hacia arriba) ---------------- */
function lienzo() {
  const c = document.createElement("canvas");
  c.width = ANCHO * S; c.height = ALTO * S;
  return c;
}
const P = (x, y) => [c0x + x * S, c0y - y * S];
let c0x = (ANCHO * S) / 2, c0y = (ALTO * S) / 2;

function rrect(ctx, w, h, r) {
  const [x0, y0] = P(-w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x0, y0, w * S, h * S, r * S);
}
function arco(ctx, w, h) {   // rectángulo con la parte de arriba en medio punto (tarjeta.scad: arco())
  const r = w / 2;
  ctx.beginPath();
  ctx.moveTo(...P(-w / 2, -h / 2));
  ctx.lineTo(...P(-w / 2, h / 2 - r));
  const [cx, cy] = P(0, h / 2 - r);
  ctx.arc(cx, cy, r * S, Math.PI, 0);
  ctx.lineTo(...P(w / 2, -h / 2));
  ctx.closePath();
}
const bez = (p0, p1, p2, p3, t) => [0, 1].map((k) => (1 - t) ** 3 * p0[k] + 3 * (1 - t) ** 2 * t * p1[k] + 3 * (1 - t) * t * t * p2[k] + t ** 3 * p3[k]);
const rot = ([x, y], a) => { const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
// Rama de olivo que nace en una esquina (x0, y0); mismas transformaciones que rama_esquina()
function rama(ctx, x0, y0, ancho, lado) {
  const s = ancho / 130;
  const fin = ([x, y]) => { // rama → mirror Y → translate(-4s, -108s) → mirror X → esquina
    let px = x, py = -y;
    px -= 4 * s; py -= 108 * s;
    if (lado < 0) px = -px;
    return P(x0 + px, y0 + py);
  };
  const tallo = [];
  for (let t = 0; t <= 1.0001; t += 0.05) tallo.push(bez([4, 108], [30, 90], [52, 70], [70, 48], t));
  for (let t = 0.05; t <= 1.0001; t += 0.05) tallo.push(bez([70, 48], [88, 26], [104, 16], [126, 8], t));
  ctx.beginPath();
  tallo.forEach(([x, y], i) => { const q = fin([x * s, -y * s]); i ? ctx.lineTo(...q) : ctx.moveTo(...q); });
  ctx.lineWidth = LINEA * S; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.stroke();
  const hoja = [];
  for (let t = 0; t <= 1.0001; t += 0.1) hoja.push(bez([0, 0], [5, -6], [15, -6], [21, 0], t));
  for (let t = 0.1; t <= 0.9001; t += 0.1) hoja.push(bez([21, 0], [15, 6], [5, 6], [0, 0], t));
  const hojas = [[14, 96, -50], [26, 84, 30], [36, 72, -55], [50, 62, 25], [60, 50, -60], [74, 42, 20], [84, 30, -65], [98, 24, 10], [108, 14, -40]];
  for (const [hx, hy, ang] of hojas) {
    ctx.beginPath();
    hoja.forEach(([px, py], i) => {
      const [rx, ry] = rot([px, -py], (-ang * Math.PI) / 180);
      const q = fin([hx * s + rx * s, -hy * s + ry * s]);
      i ? ctx.lineTo(...q) : ctx.moveTo(...q);
    });
    ctx.closePath();
    ctx.fill();
  }
}

// Texto como text() de OpenSCAD: «tam» ≈ altura de la mayúscula, centrado vertical en su caja, espaciado multiplicador
const medidas = new Map();
function px(familia, peso, tam, guion) {
  const k = peso + familia;
  if (!medidas.has(k)) {
    const c = document.createElement("canvas").getContext("2d");
    c.font = `${peso} 100px ${familia}`;
    const h = c.measureText("H").actualBoundingBoxAscent;
    medidas.set(k, h > 20 ? h / 100 : 0.7);
  }
  return ((guion ? 0.77 : 1) * tam * S) / medidas.get(k);
}
function texto(ctx, txt, x, y, tam, { guion = false, esp = 1 } = {}) {
  if (!txt) return;
  const familia = guion ? F_GUION : F_TEXTO, peso = guion ? "400" : "700";
  ctx.font = `${peso} ${px(familia, peso, tam, guion)}px ${familia}`;
  const chars = [...txt];
  const ws = chars.map((ch) => ctx.measureText(ch).width);
  const total = ws.reduce((a, w) => a + w * esp, 0) - ws[ws.length - 1] * (esp - 1);
  // No puede salirse del arco: si es muy largo, se estrecha
  const max = (ANCHO - 2 * (MARGEN + 2.2 + LINEA + 3)) * S;
  const k = total > max ? max / total : 1;
  const m = ctx.measureText(txt);
  const [cx, cy] = P(x, y);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(k, 1);
  ctx.textBaseline = "alphabetic";
  const yb = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  let xx = -total / 2;
  ctx.textAlign = "left";
  chars.forEach((ch, i) => { ctx.fillText(ch, xx, yb); xx += ws[i] * esp; });
  ctx.restore();
}
function separador(ctx, w) {
  ctx.fillRect(...P(-w / 2, -6 + LINEA), (w / 2 - 4) * S, LINEA * S);
  ctx.fillRect(...P(4, -6 + LINEA), (w / 2 - 4) * S, LINEA * S);
  const [cx, cy] = P(0, -6 + LINEA / 2);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
  ctx.fillRect((-2.6 * S) / 2, (-2.6 * S) / 2, 2.6 * S, 2.6 * S);
  ctx.restore();
}
function zonaNfc(ctx) {
  const [cx, cy] = P(0, NFC_Y);
  ctx.lineWidth = LINEA * S;
  ctx.beginPath(); ctx.arc(cx, cy, ((ARO_D - LINEA) / 2) * S, 0, Math.PI * 2); ctx.stroke();
  const h = ARO_D * 0.42, ox = cx - ARO_D * 0.17 * S;
  const lim = Math.atan2(1.5, 2);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(ox, cy, h * (0.22 + 0.2 * i) * S, -lim, lim); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(ox, cy, ((h * 0.16) / 2) * S, 0, Math.PI * 2); ctx.fill();
}

export function dibujarTarjeta(canvas, d) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = d.fondo; ctx.fillRect(0, 0, W, H);
  ctx.save();
  rrect(ctx, ANCHO - 2, ALTO - 2, R_ESQ - 1); ctx.clip();   // intersection() { diseno(); offset(-1) contorno(); }
  ctx.fillStyle = ctx.strokeStyle = d.texto;
  ctx.lineWidth = LINEA * S;
  // marco exterior y arco interior
  rrect(ctx, ANCHO - 2 * MARGEN - LINEA, ALTO - 2 * MARGEN - LINEA, R_ESQ - 1 - LINEA / 2); ctx.stroke();
  const m2 = MARGEN + 2.2;
  arco(ctx, ANCHO - 2 * m2 - LINEA, ALTO - 2 * m2 - LINEA); ctx.stroke();
  const e = MARGEN + LINEA + 1.2;
  rama(ctx, -ANCHO / 2 + e, ALTO / 2 - e, 12, 1);
  rama(ctx, ANCHO / 2 - e, ALTO / 2 - e, 12, -1);
  texto(ctx, d.lema.toUpperCase(), 0, 53, 3.4, { esp: 1.35 });
  texto(ctx, d.uno, 0, 36, 16, { guion: true });
  texto(ctx, "&", 0, 21.5, 11, { guion: true });
  texto(ctx, d.dos, 0, 7, 16, { guion: true });
  separador(ctx, 54);
  texto(ctx, d.fechaCorta, 0, -13, 5);
  texto(ctx, d.ciudad.toUpperCase(), 0, -20, 3.2, { esp: 1.5 });
  zonaNfc(ctx);
  texto(ctx, "ACERCA EL MÓVIL", 0, NFC_Y - ARO_D / 2 - 5, 3, { esp: 1.25 });
  ctx.restore();
}

/* ---------------- Escena ---------------- */
export async function createInvitacionViewer(host, datos, { reduced = false } = {}) {
  let raf = 0, visible = true;
  // Las fuentes tienen que estar cargadas antes de dibujar
  await Promise.all([
    document.fonts.load(`700 40px ${F_TEXTO}`), document.fonts.load(`400 40px ${F_GUION}`),
  ].map((p) => p.catch(() => {})));

  const small = matchMedia("(max-width: 700px)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 4000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3340, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(120, 260, 220);
  sun.castShadow = !small;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -160, right: 160, top: 160, bottom: -160, near: 10, far: 900 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xf5d3c8, 0.5);
  rim.position.set(-180, 100, -160);
  scene.add(rim);

  const disc = new THREE.Mesh(new THREE.CircleGeometry(150, 96), new THREE.MeshStandardMaterial({ color: 0x1d1a22, roughness: 0.9 }));
  disc.rotation.x = -Math.PI / 2;
  disc.receiveShadow = true;
  scene.add(disc);
  const grid = new THREE.GridHelper(300, 30, 0x4a4352, 0x2d2934);
  grid.position.y = 0.05;
  scene.add(grid);

  // Placa
  const forma = new THREE.Shape();
  forma.moveTo(-ANCHO / 2 + R_ESQ, -ALTO / 2);
  forma.lineTo(ANCHO / 2 - R_ESQ, -ALTO / 2); forma.quadraticCurveTo(ANCHO / 2, -ALTO / 2, ANCHO / 2, -ALTO / 2 + R_ESQ);
  forma.lineTo(ANCHO / 2, ALTO / 2 - R_ESQ); forma.quadraticCurveTo(ANCHO / 2, ALTO / 2, ANCHO / 2 - R_ESQ, ALTO / 2);
  forma.lineTo(-ANCHO / 2 + R_ESQ, ALTO / 2); forma.quadraticCurveTo(-ANCHO / 2, ALTO / 2, -ANCHO / 2, ALTO / 2 - R_ESQ);
  forma.lineTo(-ANCHO / 2, -ALTO / 2 + R_ESQ); forma.quadraticCurveTo(-ANCHO / 2, -ALTO / 2, -ANCHO / 2 + R_ESQ, -ALTO / 2);
  const matPlaca = new THREE.MeshStandardMaterial({ roughness: 0.6, transparent: true });
  const placa = new THREE.Mesh(new THREE.ExtrudeGeometry(forma, { depth: GROSOR, bevelEnabled: false, curveSegments: 6 }), matPlaca);
  placa.castShadow = placa.receiveShadow = true;

  const canvas = lienzo();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.repeat.set(1 / ANCHO, 1 / ALTO);
  tex.offset.set(0.5, 0.5);
  const matCara = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, transparent: true });
  const cara = new THREE.Mesh(new THREE.ShapeGeometry(forma, 6), matCara);
  cara.position.z = GROSOR + 0.02;

  // La pegatina NFC, dentro de la placa (a 1 mm de la cara): se ve con «Ver el NFC»
  const nfc = new THREE.Group();
  const pegatina = new THREE.Mesh(new THREE.CylinderGeometry(12.5, 12.5, 0.5, 48), new THREE.MeshStandardMaterial({ color: 0xd8d8de, roughness: 0.4 }));
  pegatina.rotation.x = Math.PI / 2;
  nfc.add(pegatina);
  for (let i = 0; i < 4; i++) {
    const r = 10.5 - i * 1.6;
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(r, 0.35, 6, 48), new THREE.MeshStandardMaterial({ color: 0xc58b3a, metalness: 0.8, roughness: 0.3 }));
    anillo.position.z = 0.3;
    nfc.add(anillo);
  }
  nfc.position.set(0, NFC_Y, GROSOR - 1.0 - 0.25);
  nfc.visible = false;

  const tarjeta = new THREE.Group();
  tarjeta.add(placa, cara, nfc);
  // De pie, un poco inclinada hacia atrás, apoyada en el suelo
  const soporte = new THREE.Group();
  tarjeta.position.y = ALTO / 2;
  soporte.add(tarjeta);
  soporte.rotation.x = -0.18;
  scene.add(soporte);

  function aplicar(d) {
    matPlaca.color.set(d.fondo);
    dibujarTarjeta(canvas, d);
    tex.needsUpdate = true;
    kick();
  }
  aplicar(datos);

  /* ---------- Cámara: de frente, con vaivén suave; se gira arrastrando ---------- */
  let az = 0.32, el = 0.16, dist = 360, azVel = 0, dragging = false, lastX = 0, idle = 0, swayT = 0;
  const AZ0 = 0.0, SWAY = 0.38;
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
  cv.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; azVel = 0; cv.setPointerCapture(e.pointerId); host.classList.add("is-grabbing"); kick(); });
  cv.addEventListener("pointermove", (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; azVel = -dx * 0.008; az += azVel; kick(); });
  const up = () => { if (!dragging) return; dragging = false; idle = performance.now(); host.classList.remove("is-grabbing"); kick(); };
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);

  let verNfc = 0, verNfcT = 0;
  function frame(now) {
    raf = 0;
    let busy = false;
    if (!dragging) {
      if (Math.abs(azVel) > 0.0004) { az += azVel; azVel *= 0.93; busy = true; }
      else if (!reduced && now - idle > 4000) { swayT += 0.006; az += (AZ0 + Math.sin(swayT) * SWAY - az) * 0.04; busy = true; }
    } else busy = true;
    // «Ver el NFC»: la placa se vuelve translúcida
    verNfc += (verNfcT - verNfc) * (reduced ? 1 : 0.12);
    if (Math.abs(verNfcT - verNfc) > 0.003) busy = true; else verNfc = verNfcT;
    matPlaca.opacity = matCara.opacity = 1 - verNfc * 0.62;
    matPlaca.depthWrite = matCara.depthWrite = verNfc < 0.01;
    nfc.visible = verNfc > 0.01;

    const fov = (camera.fov * Math.PI) / 180;
    const target = (ALTO * 0.62) / Math.sin(fov / 2) / Math.min(1, camera.aspect * 1.25);
    dist += (target - dist) * 0.15;
    if (Math.abs(target - dist) > 0.5) busy = true;
    camera.position.set(Math.sin(az) * Math.cos(el) * dist, ALTO * 0.5 + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(0, ALTO * 0.47, 0);
    renderer.render(scene, camera);
    if (busy && visible) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(host);
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) kick(); });
  resize();

  return {
    set: aplicar,
    verNfc(v) { verNfcT = v ? 1 : 0; kick(); },
  };
}
