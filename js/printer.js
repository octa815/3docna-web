/* Impresora 3D (Three.js): la mascota de 3DOCNA se imprime capa a capa.
   Un solo lienzo fijo a pantalla completa. Quien lo usa decide posición, tamaño y progreso. */
import * as THREE from "three";
import { RoomEnvironment } from "../vendor/RoomEnvironment.js";

export const LAYERS = 96;          // capas de la pieza (lo que enseña el contador)
const H = 3.0;                      // alto del casco (la mascota de 3DOCNA es un casco de moto)
const R = 1.3;                      // radio máximo
const TOTAL_H = H + 0.9;            // alto total aproximado con cama y cabezal

// Perfil de casco integral: boca del cuello abierta abajo, lo más ancho a media altura y cúpula redonda arriba
const WIDE = 0.45;
const radiusAt = (t) => t <= WIDE
  ? R * (0.74 + 0.26 * Math.sin((Math.PI / 2) * (t / WIDE)))
  : R * Math.sqrt(Math.max(0, 1 - ((t - WIDE) / (1 - WIDE)) ** 2));
const VISOR = [0.34, 0.62];          // la visera va entre estas alturas, como en el logo

export function createPrinter(canvas) {
  // En móvil la pantalla ya es muy densa: menos píxeles y sin antialias = mucho menos trabajo por fotograma
  const coarse = matchMedia("(pointer: coarse)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.75);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !coarse, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200);
  camera.position.set(0, 0, 30);

  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(4, 8, 7);
  const warm = new THREE.DirectionalLight(0xffc7a8, 0.7);
  warm.position.set(-6, 2, 4);
  scene.add(key, warm);

  /* ---------- Materiales ---------- */
  // En móvil, material estándar: mismo aspecto a esta escala y un sombreado mucho más barato
  const M = (opts) => {
    if (!coarse) return new THREE.MeshPhysicalMaterial(opts);
    const { clearcoat, clearcoatRoughness, sheen, sheenColor, ...rest } = opts;
    return new THREE.MeshStandardMaterial(rest);
  };
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0); // deja ver solo lo que está por debajo de la capa actual
  const pla = M({
    vertexColors: true, roughness: 0.42, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.35,
    sheen: 0.4, sheenColor: new THREE.Color(0xffe0ec), side: THREE.DoubleSide, clippingPlanes: [clip],
  });
  const plaSolid = (hex) => M({ color: hex, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3, clippingPlanes: [clip] });
  const black = M({ color: 0x1a1518, roughness: 0.35, clearcoat: 0.8, clippingPlanes: [clip] });
  const hot = new THREE.MeshBasicMaterial({ color: 0xff8a4c, transparent: true, opacity: 0.9, toneMapped: false });
  const shell = M({ color: 0xf1eeea, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const darkPart = M({ color: 0x2a2a2e, roughness: 0.5, metalness: 0.2 });
  const brass = M({ color: 0xd9a441, metalness: 1, roughness: 0.22 });
  const pinkMat = M({ color: 0xf07bb0, roughness: 0.35, clearcoat: 0.6 });

  /* ---------- Pieza: la mascota (casco de moto) ---------- */
  const piece = new THREE.Group();
  {
    const pts = [];
    const N = LAYERS * (coarse ? 4 : 6);
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const layerBump = 0.014 * (1 - Math.abs(Math.cos(Math.PI * t * LAYERS))); // líneas de capa
      pts.push(new THREE.Vector2(radiusAt(t) + (radiusAt(t) > 0.05 ? layerBump : 0), t * H));
    }
    const geo = new THREE.LatheGeometry(pts, coarse ? 96 : 140);
    // Color jaspeado rosa y melocotón, como el logo
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const a = new THREE.Color(0xf6a3c6), b = new THREE.Color(0xf8b98e), c = new THREE.Color(0xfbd3df), tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const th = Math.atan2(z, x);
      const n1 = 0.5 + 0.5 * Math.sin(th * 2 + y * 1.7) * Math.cos(th * 3 - y * 2.3);
      const n2 = 0.5 + 0.5 * Math.sin(th * 5 + y * 3.1 + 1.3);
      tmp.copy(a).lerp(b, n1).lerp(c, n2 * 0.35);
      col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    piece.add(new THREE.Mesh(geo, pla));

    // Visera: franja oscura y brillante en la parte delantera, con «ON» como en el logo
    const visorTex = (() => {
      const cv = document.createElement("canvas");
      cv.width = 1024; cv.height = 256;
      const x = cv.getContext("2d");
      const g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, "#3a2a33"); g.addColorStop(0.45, "#1c1418"); g.addColorStop(1, "#2a1d24");
      x.fillStyle = g; x.fillRect(0, 0, 1024, 256);
      const shine = x.createLinearGradient(0, 0, 1024, 0);
      shine.addColorStop(0.15, "rgba(255,255,255,0)"); shine.addColorStop(0.3, "rgba(255,220,235,0.22)"); shine.addColorStop(0.42, "rgba(255,255,255,0)");
      x.fillStyle = shine; x.fillRect(0, 0, 1024, 120);
      // «ON» con trazo, como el logo: una O cuadrada y una N
      x.strokeStyle = "#f7a9c9"; x.lineWidth = 13; x.lineJoin = "miter";
      x.strokeRect(392, 66, 96, 124);
      x.beginPath(); x.moveTo(536, 190); x.lineTo(536, 66); x.lineTo(632, 190); x.lineTo(632, 66); x.stroke();
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      return t;
    })();
    const visorPts = [];
    for (let i = 0; i <= 40; i++) {
      const t = VISOR[0] + (VISOR[1] - VISOR[0]) * (i / 40);
      visorPts.push(new THREE.Vector2(radiusAt(t) + 0.03, t * H));
    }
    const visorGeo = new THREE.LatheGeometry(visorPts, 64, -1.05, 2.1);
    // La textura va a lo ancho de la visera (U) y a lo alto (V)
    const vmat = M({ map: visorTex, roughness: 0.08, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, clippingPlanes: [clip], side: THREE.DoubleSide });
    piece.add(new THREE.Mesh(visorGeo, vmat));

    // Las dos bandas negras que enmarcan la visera
    for (const t of VISOR) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(radiusAt(t) + 0.012, 0.028, 12, 140), black);
      band.rotation.x = Math.PI / 2;
      band.position.y = t * H;
      piece.add(band);
    }
    // Oreja redonda y cuerno
    // Bolita a un lado y cuernito al otro, como la mascota
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.36, 40, 24), plaSolid(0xf39cc2));
    ear.position.set(-0.78, H * 0.86, 0.05);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.5, 32), plaSolid(0xf6ac86));
    horn.position.set(0.86, H * 0.87, 0.05);
    horn.rotation.z = -0.75;
    piece.add(ear, horn);
  }

  /* ---------- Cama de impresión ---------- */
  const plateTex = (() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 512;
    const x = cv.getContext("2d");
    x.fillStyle = "#2c2a30"; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2200; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; x.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
    x.strokeStyle = "rgba(255,255,255,0.08)"; x.lineWidth = 1;
    for (let i = 0; i <= 512; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
    x.fillStyle = "rgba(240,123,176,0.55)"; x.font = "600 22px monospace"; x.fillText("3DOCNA · ELDA", 24, 488);
    const t = new THREE.CanvasTexture(x.canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  })();
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(3.7, 0.14, 3.7),
    [darkPart, darkPart, M({ map: plateTex, roughness: 0.6, clearcoat: 0.2 }), darkPart, darkPart, darkPart]
  );
  plate.position.y = -0.07;

  /* ---------- Capa caliente (la que se está extruyendo) ---------- */
  const hotRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 140), hot);
  hotRing.rotation.x = Math.PI / 2;

  /* ---------- Cabezal ---------- */
  function makeHead() {
    const g = new THREE.Group();
    const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 24), brass);
    nozzle.rotation.x = Math.PI; nozzle.position.y = 0.11;
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 6), brass);
    hex.position.y = 0.27;
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.36), darkPart);
    block.position.y = 0.45;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.9, 0.8), shell);
    body.position.set(0, 1.0, -0.05);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.08, 0.81), pinkMat);
    stripe.position.set(0, 0.72, -0.05);
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 32), darkPart);
    fan.rotation.x = Math.PI / 2; fan.position.set(0, 1.05, 0.36);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), hot);
    glow.position.y = -0.01;
    g.add(nozzle, hex, block, body, stripe, fan, glow);
    g.userData.glow = glow;
    return g;
  }
  const head = makeHead();
  head.scale.setScalar(0.7);
  const beadHead = makeHead();

  // Sombra suave
  const shadowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d"); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(0,0,0,0.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 });
  const plateShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
  const beadShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat.clone());

  const printer = new THREE.Group();   // cama + pieza + cabezal
  const tilt = new THREE.Group();      // inclinación de cámara
  printer.add(plate, piece, hotRing, head);
  tilt.add(printer);
  const heroHolder = new THREE.Group();
  heroHolder.add(tilt);
  const beadHolder = new THREE.Group();
  beadHolder.add(beadHead);
  scene.add(plateShadow, heroHolder, beadShadow, beadHolder);

  /* ---------- Estado ---------- */
  const st = {
    hero: { visible: false, x: 0, y: 0, size: 400, progress: 0, spin: 0, tiltX: 0, tiltY: 0, park: 0 },
    bead: { visible: false, x: 0, y: 0, size: 60, wobble: 0 },
  };
  let W = 1, Hpx = 1, k = 1, raf = 0;

  function resize() {
    W = canvas.clientWidth || innerWidth;
    Hpx = canvas.clientHeight || innerHeight;
    renderer.setSize(W, Hpx, false);
    camera.aspect = W / Hpx;
    camera.updateProjectionMatrix();
    k = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z) / Hpx;
    schedule();
  }
  const wx = (px) => (px - W / 2) * k;
  const wy = (py) => -(py - Hpx / 2) * k;

  function draw() {
    raf = 0;
    const h = st.hero, bd = st.bead;
    heroHolder.visible = plateShadow.visible = h.visible;
    beadHolder.visible = beadShadow.visible = bd.visible;
    if (!h.visible && !bd.visible) { renderer.clear(); return; }

    if (h.visible) {
      const s = (h.size * k) / TOTAL_H;
      heroHolder.scale.setScalar(s);
      heroHolder.position.set(wx(h.x), wy(h.y) - (H / 2) * s, 0);
      tilt.rotation.set(0.32 + h.tiltX * 0.08, h.tiltY * 0.25, 0);
      printer.rotation.y = h.spin;

      const p = THREE.MathUtils.clamp(h.progress, 0, 1);
      const yNow = p * H * 1.02;
      clip.constant = yNow;
      // El plano de corte trabaja en coordenadas de mundo: se recalcula con la matriz de la pieza
      piece.updateWorldMatrix(true, false);
      clip.normal.set(0, -1, 0).transformDirection(piece.matrixWorld);
      const planePoint = new THREE.Vector3(0, yNow, 0).applyMatrix4(piece.matrixWorld);
      clip.constant = -clip.normal.dot(planePoint);

      const printing = p > 0 && p < 1;
      const t = Math.min(p, 0.999);
      const r = Math.max(radiusAt(t), 0.12);
      hotRing.visible = printing && radiusAt(t) > 0.05;
      hotRing.scale.set(r + 0.01, r + 0.01, 1);
      hotRing.position.y = yNow;

      const theta = p * LAYERS * Math.PI * 2;
      const park = THREE.MathUtils.clamp(h.park, 0, 1);
      head.position.set(
        THREE.MathUtils.lerp(Math.cos(theta) * r, 1.6, park),
        yNow + 0.02 + park * 0.9,
        THREE.MathUtils.lerp(Math.sin(theta) * r, -0.6, park)
      );
      head.rotation.y = -printer.rotation.y; // el cabezal no gira con la cama
      head.userData.glow.visible = printing;

      plateShadow.position.set(heroHolder.position.x + 0.3 * s, heroHolder.position.y - 0.6 * s, -6);
      plateShadow.scale.set(5.4 * s, 1.9 * s, 1);
    }

    if (bd.visible) {
      const s = (bd.size * k) / 1.5;
      beadHolder.scale.setScalar(s);
      beadHolder.position.set(wx(bd.x), wy(bd.y), 2);
      beadHead.rotation.set(0.35, -0.5 + bd.wobble * 0.06, bd.wobble * 0.04);
      beadShadow.position.set(beadHolder.position.x + 0.15 * s, beadHolder.position.y - 0.1 * s, -4);
      beadShadow.scale.set(1.6 * s, 0.6 * s, 1);
    }
    renderer.render(scene, camera);
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(draw); }

  resize();
  addEventListener("resize", resize);

  return {
    hero(next) { Object.assign(st.hero, next); schedule(); },
    bead(next) { Object.assign(st.bead, next); schedule(); },
    get state() { return st; },
    resize,
  };
}
