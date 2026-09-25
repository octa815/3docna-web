/* Impresora 3D (Three.js): la mascota de 3DOCNA se imprime capa a capa.
   Un solo lienzo fijo a pantalla completa. Quien lo usa decide posición, tamaño y progreso. */
import * as THREE from "three";
import { RoomEnvironment } from "../vendor/RoomEnvironment.js";

export const LAYERS = 96;          // capas de la pieza (lo que enseña el contador)
const H = 3.2;                      // alto de la mascota, en unidades del modelo
const R = 1.25;                     // radio máximo
const TOTAL_H = H + 0.9;            // alto total aproximado con cama y cabezal

// Perfil de huevo con base plana (para que se sostenga en la cama)
const radiusAt = (t) => R * Math.sqrt(Math.max(0, 1 - ((t - 0.47) / 0.53) ** 2));

export function createPrinter(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
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
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0); // deja ver solo lo que está por debajo de la capa actual
  const pla = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.42, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.35,
    sheen: 0.4, sheenColor: new THREE.Color(0xffe0ec), side: THREE.DoubleSide, clippingPlanes: [clip],
  });
  const plaSolid = (hex) => new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3, clippingPlanes: [clip] });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x1a1518, roughness: 0.35, clearcoat: 0.8, clippingPlanes: [clip] });
  const hot = new THREE.MeshBasicMaterial({ color: 0xff8a4c, transparent: true, opacity: 0.9, toneMapped: false });
  const shell = new THREE.MeshPhysicalMaterial({ color: 0xf1eeea, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const darkPart = new THREE.MeshPhysicalMaterial({ color: 0x2a2a2e, roughness: 0.5, metalness: 0.2 });
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xd9a441, metalness: 1, roughness: 0.22 });
  const pinkMat = new THREE.MeshPhysicalMaterial({ color: 0xf07bb0, roughness: 0.35, clearcoat: 0.6 });

  /* ---------- Pieza: la mascota ---------- */
  const piece = new THREE.Group();
  {
    const pts = [];
    const N = LAYERS * 6;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const layerBump = 0.014 * (1 - Math.abs(Math.cos(Math.PI * t * LAYERS))); // líneas de capa
      pts.push(new THREE.Vector2(radiusAt(t) + (radiusAt(t) > 0.05 ? layerBump : 0), t * H));
    }
    const geo = new THREE.LatheGeometry(pts, 140);
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

    const base = new THREE.Mesh(new THREE.CircleGeometry(radiusAt(0) + 0.01, 64), plaSolid(0xf6a9c8));
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.002;
    piece.add(base);

    // Las dos bandas negras del casco
    for (const t of [0.4, 0.69]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(radiusAt(t) + 0.012, 0.028, 12, 140), black);
      band.rotation.x = Math.PI / 2;
      band.position.y = t * H;
      piece.add(band);
    }
    // Oreja redonda y cuerno
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.4, 40, 24), plaSolid(0xf39cc2));
    ear.position.set(-0.62, H * 0.9, 0.1);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 32), plaSolid(0xf6ac86));
    horn.position.set(0.72, H * 0.93, 0.05);
    horn.rotation.z = -0.62;
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
    [darkPart, darkPart, new THREE.MeshPhysicalMaterial({ map: plateTex, roughness: 0.6, clearcoat: 0.2 }), darkPart, darkPart, darkPart]
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
