/* El sobre en 3D y la tarjeta impresa que sale de él (Three.js desde jsDelivr).
   Tarjeta: eventos/<slug>/tarjeta.glb, generado con tarjeta/glb.py a partir de tarjeta.scad.
   Sobre: se construye aquí (papel, forro, solapa y lacre con las iniciales), con los colores de evento.json.
   Antes de abrir: el sobre flota bajo el foco y un brillo pasa por el lacre.
   Al abrir (un solo timeline de GSAP de ~5 s, con los sonidos de sonidos.js en su sitio):
     tiembla -> el lacre se parte en dos -> la solapa se abre, sale luz y empiezan los fuegos al fondo ->
     la tarjeta sube -> el sobre cae -> la tarjeta llega delante con un golpe, destello, traca de fuegos artificiales y lluvia de pétalos
     (con el pack Premium, dando una vuelta entera). Después se puede girar arrastrando y se aleja al bajar.
   Eventos: escucha "invitacion:abrir"; lanza "invitacion:lista", "invitacion:destello", "invitacion:revelada"
   y, si falla, "invitacion:sin3d".
   Si algo falla (sin WebGL, sin red), se queda la tarjeta dibujada con CSS. */
const escenario = document.getElementById("escenario");
const lienzo = escenario?.querySelector(".lienzo");
const modelo = escenario?.dataset.modelo;
const raiz = document.documentElement;
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (escenario && lienzo && modelo) {
  arrancar().catch((err) => {
    console.warn("Sobre 3D no disponible:", err);
    dispatchEvent(new CustomEvent("invitacion:sin3d"));   // invitacion.js sigue sin 3D
  });
}

async function arrancar() {
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");

  const css = getComputedStyle(raiz);
  const color = (v, defecto) => css.getPropertyValue(v).trim() || defecto;
  const C = {
    marfil: color("--marfil", "#F4EFE6"), oro: color("--oro", "#C9A25E"),
    sobre: color("--sobre", "#EADFC8"), forro: color("--forro", "#24332A"), lacre: color("--lacre", "#7E2B34"),
  };

  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: "low-power" });
  /* Rendimiento en móviles distintos:
     - gama: se estima al empezar (núcleos y memoria); en gama baja, menos resolución, texturas y partículas;
     - resolución dinámica: si los fotogramas tardan, baja la resolución del lienzo (y la sube si va sobrado);
     - en pantallas de 120 Hz dibuja uno de cada dos fotogramas (60 fps): no gasta el doble de batería;
     - no dibuja nada si el escenario no se ve o la pestaña está en segundo plano. */
  const nucleos = navigator.hardwareConcurrency || 4, memoria = navigator.deviceMemory || 4;
  const gamaBaja = nucleos <= 4 || memoria <= 3 || /[?&]gama=baja/.test(location.search);
  const DPR_MAX = Math.min(devicePixelRatio, gamaBaja ? 1.5 : 2);
  let dpr = DPR_MAX;
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environmentIntensity = 0.55;
  const camara = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

  const foco = new THREE.DirectionalLight(0xfff1d6, 1.5);   // luz principal suave, alta y lateral
  foco.position.set(-1.5, 3, 4);
  escena.add(foco);
  escena.add(new THREE.HemisphereLight(0xfff6e8, 0x2a3a30, .85));   // relleno amplio: la tarjeta se lee por igual en toda la cara
  const relleno = new THREE.DirectionalLight(0xffe9cc, .55);   // contraluz cálido desde la derecha: separa del fondo sin brillar de frente
  relleno.position.set(2.5, .5, 1.2);
  escena.add(relleno);
  const brillo = new THREE.PointLight(0xffe3a8, 0, 6, 1.6);
  escena.add(brillo);
  const dentro = new THREE.PointLight(0xffd68a, 0, 2.5, 1.5);   // la luz que sale del sobre al abrirlo
  dentro.position.set(0, 0.9, 0.2);
  escena.add(dentro);

  /* ------------------------------------------------ texturas dibujadas en canvas */
  function lienzo2d(w, h, pinta) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    pinta(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  // papel: grano suave (se multiplica por el color del sobre)
  const texPapel = lienzo2d(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 236 + Math.random() * 19;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
  texPapel.wrapS = texPapel.wrapT = THREE.RepeatWrapping;
  texPapel.repeat.set(3, 3);
  texPapel.colorSpace = THREE.NoColorSpace;

  /* ------------------------------------------------ la tarjeta impresa */
  const gltf = await new GLTFLoader().loadAsync(modelo);
  const tarjeta = gltf.scene;
  tarjeta.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (m.name === "texto") {
      m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -4;   // sin parpadeo con la placa
      // dorado satinado y algo más oscuro: se lee siempre, sin destellos que lo borren
      m.color.set(C.oro).multiplyScalar(.48);
      m.metalness = .25; m.roughness = .6; m.envMapIntensity = .5;
    } else { m.color.set(C.marfil); m.roughness = .8; m.envMapIntensity = .45; }
  });
  const caja = new THREE.Box3().setFromObject(tarjeta);
  const tam = caja.getSize(new THREE.Vector3());
  tarjeta.position.sub(caja.getCenter(new THREE.Vector3()));
  const escala = 1.5 / Math.max(tam.x, tam.y);
  const ALTO = tam.y * escala, ANCHO = tam.x * escala;
  const pivote = new THREE.Group();     // giro de la tarjeta (arrastre, vuelta)
  pivote.add(tarjeta);
  pivote.scale.setScalar(escala);
  const carta = new THREE.Group();      // posición de la tarjeta respecto al sobre
  carta.add(pivote);

  /* ------------------------------------------------ el sobre: formato de carta de boda, apaisado y barroco */
  // La tarjeta (A6, de pie) va dentro tumbada: el sobre es más ancho que alto, como un sobre de invitación clásico.
  const W = ALTO + 0.34, H = ANCHO + 0.28;        // ~1,84 x 1,34 (proporción de un sobre 5x7 / C5)
  const V = H * 0.36, F = H * 0.6;                 // pico del bolsillo y largo de la solapa
  const Z = { atras: -0.006, frente: 0.042, solapa: 0.048 };
  const PX = gamaBaja ? 400 : 560;                 // píxeles de textura por unidad

  // --- dibujo barroco en canvas: volutas, hojas de acanto y perlas
  function voluta(g, x, y, r, ang, sentido = 1, vueltas = 1.6) {
    g.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, th = ang + sentido * t * vueltas * Math.PI * 2, rr = r * (1 - t * .8);
      const px = x + Math.cos(th) * rr, py = y + Math.sin(th) * rr;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.stroke();
  }
  function hoja(g, x0, y0, x1, y1, ancho) {      // hoja de acanto: lanceolada con el nervio marcado
    const dx = x1 - x0, dy = y1 - y0, nx = -dy * ancho, ny = dx * ancho;
    g.beginPath();
    g.moveTo(x0, y0);
    g.bezierCurveTo(x0 + dx * .3 + nx, y0 + dy * .3 + ny, x0 + dx * .75 + nx * .6, y0 + dy * .75 + ny * .6, x1, y1);
    g.bezierCurveTo(x0 + dx * .75 - nx * .6, y0 + dy * .75 - ny * .6, x0 + dx * .3 - nx, y0 + dy * .3 - ny, x0, y0);
    g.fill();
  }
  function perla(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  // esquina con volutas: el rincón está en (0, 0) y el interior hacia +x, +y
  function esquina(g, s) {
    g.save(); g.scale(s, s);
    for (const espejo of [false, true]) {
      g.save();
      if (espejo) g.transform(0, 1, 1, 0, 0, 0);   // reflejo sobre la diagonal: queda simétrica
      g.beginPath(); g.moveTo(14, 14); g.bezierCurveTo(60, 4, 105, 34, 150, 20); g.stroke();
      voluta(g, 158, 30, 11, -Math.PI / 2, 1, 1.3);
      g.beginPath(); g.moveTo(52, 16); g.bezierCurveTo(62, 40, 92, 44, 100, 30); g.stroke();
      voluta(g, 96, 38, 7, 0, 1, 1.2);
      hoja(g, 112, 26, 140, 6, .16);
      perla(g, 178, 20, 3); perla(g, 190, 19, 2.2); perla(g, 200, 18.5, 1.6);
      g.restore();
    }
    voluta(g, 44, 44, 18, Math.PI * .25, -1, 1.4);
    hoja(g, 16, 16, 34, 34, .35);
    hoja(g, 50, 60, 80, 90, .22);
    g.restore();
  }
  // adorno central simétrico (debajo del lacre y abajo del bolsillo)
  function centro(g, s) {
    g.save(); g.scale(s, s);
    for (const lado of [1, -1]) {
      g.save(); g.scale(lado, 1);
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(30, -26, 72, -24, 92, -4); g.stroke();
      voluta(g, 98, 6, 12, Math.PI, -1, 1.3);
      g.beginPath(); g.moveTo(10, 8); g.bezierCurveTo(40, 26, 80, 30, 120, 14); g.stroke();
      voluta(g, 126, 6, 8, Math.PI / 2, -1, 1.2);
      hoja(g, 20, -2, 58, -34, .22);
      hoja(g, 60, 20, 92, 36, .18);
      perla(g, 146, 4, 3); perla(g, 158, 1, 2.2);
      g.restore();
    }
    hoja(g, 0, 6, 0, -40, .28);
    perla(g, 0, 18, 4.5);
    g.restore();
  }

  // Cada pieza del sobre tiene dos lienzos: color (papel + oro) y «material» (G = rugosidad, B = metal)
  // para que el dorado brille como estampado en caliente y el papel quede mate.
  function pieza(anchoU, altoU, dibuja) {
    const w = Math.round(anchoU * PX), h = Math.round(altoU * PX);
    const color = lienzo2d(w, h, (g) => {
      g.fillStyle = C.sobre; g.fillRect(0, 0, w, h);
      const img = g.getImageData(0, 0, w, h), d = img.data;   // grano del papel
      for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 10; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
      g.putImageData(img, 0, 0);
      dibuja(g, w, h, true);
    });
    const mat = lienzo2d(w, h, (g) => { g.fillStyle = "rgb(0,240,0)"; g.fillRect(0, 0, w, h); dibuja(g, w, h, false); });
    mat.colorSpace = THREE.NoColorSpace;
    return { color, mat };
  }
  const tinta = (g, esColor) => {   // el dorado: en color, oro con un poco de degradado; en material, metal liso
    if (esColor) {
      const gr = g.createLinearGradient(0, 0, g.canvas.width, g.canvas.height);
      gr.addColorStop(0, "#B8904A"); gr.addColorStop(.45, "#E6C77F"); gr.addColorStop(.7, "#B98F48"); gr.addColorStop(1, "#D9B66C");
      g.strokeStyle = g.fillStyle = gr;
    } else g.strokeStyle = g.fillStyle = "rgb(0,80,255)";
    g.lineCap = "round"; g.lineJoin = "round";
  };

  // bolsillo delantero (con la boca en pico): pliegues, filete doble y esquinas barrocas
  const piezaFrente = pieza(W, H, (g, w, h, esColor) => {
    const v = V * PX;
    if (esColor) {   // sombras de los pliegues de las solapas laterales e inferior
      const cy = h * .6;
      g.fillStyle = "rgba(60,40,20,.05)";
      g.beginPath(); g.moveTo(0, h); g.lineTo(w / 2, cy); g.lineTo(w, h); g.fill();
      g.strokeStyle = "rgba(60,40,20,.12)"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, h); g.lineTo(w / 2, cy); g.lineTo(w, h); g.stroke();
      g.beginPath(); g.moveTo(0, 0); g.lineTo(w * .36, h * .5); g.lineTo(0, h); g.moveTo(w, 0); g.lineTo(w * .64, h * .5); g.lineTo(w, h); g.stroke();
    }
    tinta(g, esColor);
    const d = 22, d2 = 32;
    g.lineWidth = 3.4;
    g.beginPath(); g.moveTo(d, d * 1.7); g.lineTo(w / 2, v + d * 1.5); g.lineTo(w - d, d * 1.7); g.lineTo(w - d, h - d); g.lineTo(d, h - d); g.closePath(); g.stroke();
    g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(d2, d2 * 1.75); g.lineTo(w / 2, v + d2 * 1.55); g.lineTo(w - d2, d2 * 1.75); g.lineTo(w - d2, h - d2); g.lineTo(d2, h - d2); g.closePath(); g.stroke();
    g.lineWidth = 3.6;
    for (const [x, y, sx, sy] of [[d2, h - d2, 1, -1], [w - d2, h - d2, -1, -1]]) {
      g.save(); g.translate(x, y); g.scale(sx, sy); esquina(g, 1.75); g.restore();
    }
    g.save(); g.translate(w / 2, h - 95); centro(g, 1.7); g.restore();
  });

  // solapa festoneada: bordes con ondas y punta en ojiva; filete dorado que sigue el festón y medallón en la punta
  function contornoSolapa(escala = 1, ondas = 9) {
    const pts = [];
    const lado = (x0, y0, x1, y1, sentido) => {
      for (let i = 0; i < ondas; i++) {
        const a = i / ondas, b = (i + 1) / ondas;
        const ax = x0 + (x1 - x0) * a, ay = y0 + (y1 - y0) * a, bx = x0 + (x1 - x0) * b, by = y0 + (y1 - y0) * b;
        const nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1;
        const k = .028 * sentido;
        pts.push(["q", (ax + bx) / 2 + nx / l * k, (ay + by) / 2 + ny / l * k, bx, by]);
      }
    };
    const pX = 0, pY = -F;
    pts.push(["m", -W / 2, 0]);
    lado(-W / 2, 0, pX - .1, pY + .07, -1);
    pts.push(["q", pX - .03, pY + .01, pX, pY]);
    pts.push(["q", pX + .03, pY + .01, pX + .1, pY + .07]);
    lado(pX + .1, pY + .07, W / 2, 0, -1);
    return pts.map(([t, ...c]) => [t, ...c.map((v, i) => (i % 2 ? (v + F * .45) * escala - F * .45 : v * escala))]);
  }
  const trazar = (forma, pts) => pts.forEach(([t, a, b, c, d]) => (t === "m" ? forma.moveTo(a, b) : forma.quadraticCurveTo(a, b, c, d)));
  const tri = new THREE.Shape();
  trazar(tri, contornoSolapa());
  tri.lineTo(-W / 2, 0);
  const piezaSolapa = pieza(W, F, (g, w, h, esColor) => {
    tinta(g, esColor);
    const aPx = (x, y) => [(x + W / 2) * PX, -y * PX];   // de unidades de la solapa (y de 0 a -F) a píxeles
    for (const [esc, grosor] of [[.93, 3.4], [.885, 1.6]]) {
      g.lineWidth = grosor;
      g.beginPath();
      contornoSolapa(esc).forEach(([t, a, b, c, d]) => {
        if (t === "m") g.moveTo(...aPx(a, b)); else g.quadraticCurveTo(...aPx(a, b), ...aPx(c, d));
      });
      g.stroke();
    }
    // medallón alrededor del lacre
    const [mx, my] = aPx(0, -F + .085);
    g.lineWidth = 2.2;
    g.beginPath(); g.arc(mx, my, .135 * PX, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 1.2;
    g.beginPath(); g.arc(mx, my, .148 * PX, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; perla(g, mx + Math.cos(a) * .162 * PX, my + Math.sin(a) * .162 * PX, 2.2); }
    g.lineWidth = 3.4;
    g.save(); g.translate(mx, my - .26 * PX); g.scale(1, -1); centro(g, 1.5); g.restore();
  });

  // forro adamascado: motivo de flor de lis barroca en oro viejo sobre el color del forro, en tresbolillo
  const texForro = lienzo2d(256, 256, (g, w, h) => {
    g.fillStyle = C.forro; g.fillRect(0, 0, w, h);
    g.fillStyle = g.strokeStyle = C.oro; g.lineWidth = 2; g.lineCap = "round";
    const motivo = (x, y, s) => {
      g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = .55;
      hoja(g, 0, 30, 0, -34, .25);
      for (const l of [1, -1]) {
        g.save(); g.scale(l, 1);
        hoja(g, 4, 8, 30, -18, .2);
        voluta(g, 26, -6, 9, Math.PI, -1, 1.2);
        g.beginPath(); g.moveTo(2, 22); g.bezierCurveTo(16, 30, 30, 26, 34, 14); g.stroke();
        g.restore();
      }
      perla(g, 0, 38, 3);
      g.restore();
    };
    motivo(w / 2, h / 2, 1.3);
    for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) motivo(x, y, 1.3);
  });
  texForro.wrapS = texForro.wrapT = THREE.RepeatWrapping;
  texForro.repeat.set(4.5, 4.5);

  const papel = (p) => {
    const mapear = (t) => { t.repeat.set(1 / p.w, 1 / p.h); t.offset.set(p.ox, p.oy); return t; };
    return new THREE.MeshStandardMaterial({
      map: mapear(p.color), roughnessMap: mapear(p.mat), metalnessMap: p.mat, roughness: 1, metalness: 1, envMapIntensity: 1.5,
    });
  };
  const matForro = new THREE.MeshStandardMaterial({ map: texForro, roughness: .6, metalness: .2 });
  const matPapelLiso = new THREE.MeshStandardMaterial({ color: C.sobre, roughness: .92, envMapIntensity: .35, map: texPapel });
  const materialesSobre = [];
  const malla = (geo, mat, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.z = z;
    materialesSobre.push(mat);
    return m;
  };
  const sobre = new THREE.Group();

  /* El sobre está vivo: el papel se deforma en el shader, en coordenadas del sobre (iguales para todas las piezas):
       - abombado (aire dentro): las caras de delante hacia el invitado y la de atrás hacia atrás;
       - curvatura y torsión de todo el sobre (se dobla como un papel);
       - un bulto que recorre el papel, como si algo empujara desde dentro.
     La tarjeta no se ve mientras el sobre está cerrado (la tapan bolsillo y solapa), así que no puede asomar.
     Las piezas planas se subdividen para que haya vértices que doblar. */
  const U = {
    uInflar: { value: 0 }, uDobla: { value: 0 }, uTuerce: { value: 0 }, uCurva: { value: 0 },
    uBulto: { value: new THREE.Vector3(0, 0, 0) }, uMedio: { value: new THREE.Vector2(W / 2, H / 2) },
  };
  const GLSL_DESPLAZA = `
    uniform float uInflar, uDobla, uTuerce, uCurva, uAlmohada, uOrient, uEspejo, uYoff;
    uniform vec2 uMedio; uniform vec3 uBulto;
    float desplaza(vec2 p) {
      vec2 q = p / uMedio;
      float fx = max(0., 1. - q.x * q.x), fy = max(0., 1. - q.y * q.y);
      vec2 d = p - uBulto.xy;
      return uAlmohada * (uInflar * fx * fy + uBulto.z * exp(-dot(d, d) / .09) * fx * fy)
           + uDobla * q.x * q.x + uTuerce * q.x * q.y
           // solo la solapa (uYoff > 0): al abrirse se curva como papel, la punta va por detrás de la bisagra
           + step(.001, uYoff) * uCurva * (p.y - uYoff) * (p.y - uYoff);
    }
  `;
  // almohada: hacia dónde se abomba la pieza (+1 hacia el invitado); orient: su z local respecto al sobre;
  // espejo: si su x local va al revés que la del sobre
  function vivo(mat, yOff, almohada, orient, espejo = 1) {
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U, { uAlmohada: { value: almohada }, uOrient: { value: orient }, uEspejo: { value: espejo }, uYoff: { value: yOff } });
      sh.vertexShader = GLSL_DESPLAZA + sh.vertexShader
        .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
          vec2 pS = vec2(uEspejo * position.x, position.y + uYoff);
          float d0 = desplaza(pS);
          float gx = (desplaza(pS + vec2(.01, 0.)) - d0) / .01 * uEspejo * uOrient;
          float gy = (desplaza(pS + vec2(0., .01)) - d0) / .01 * uOrient;
          objectNormal = normalize(objectNormal + vec3(-gx, -gy, 0.) * sign(objectNormal.z + 1e-4));`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          transformed.z += uOrient * d0;`);
    };
    mat.customProgramCacheKey = () => ["vivo", yOff.toFixed(3), almohada, orient, espejo].join("_");
    return mat;
  }
  // lo mismo en JS, para que el lacre vaya pegado al papel
  function desplazaJS(x, y) {
    const qx = x / (W / 2), qy = y / (H / 2), fx = Math.max(0, 1 - qx * qx), fy = Math.max(0, 1 - qy * qy);
    const b = U.uBulto.value, dx = x - b.x, dy = y - b.y;
    return U.uInflar.value * fx * fy + b.z * Math.exp(-(dx * dx + dy * dy) / .09) * fx * fy + U.uDobla.value * qx * qx + U.uTuerce.value * qx * qy;
  }
  function subdividir(geo, veces) {   // cada triángulo en 4, `veces` veces (posición y UV)
    let g = geo.index ? geo.toNonIndexed() : geo;
    for (let k = 0; k < veces; k++) {
      const P = g.attributes.position.array, U = g.attributes.uv.array, np = [], nu = [];
      for (let i = 0; i < P.length / 9; i++) {
        const v = [0, 1, 2].map((j) => [P[i * 9 + j * 3], P[i * 9 + j * 3 + 1], P[i * 9 + j * 3 + 2]]);
        const u = [0, 1, 2].map((j) => [U[i * 6 + j * 2], U[i * 6 + j * 2 + 1]]);
        const mv = (a, b) => a.map((x, n) => (x + b[n]) / 2);
        const m = [mv(v[0], v[1]), mv(v[1], v[2]), mv(v[2], v[0])], mu = [mv(u[0], u[1]), mv(u[1], u[2]), mv(u[2], u[0])];
        for (const [a, b, c] of [[v[0], m[0], m[2]], [m[0], v[1], m[1]], [m[2], m[1], v[2]], [m[0], m[1], m[2]]]) np.push(...a, ...b, ...c);
        for (const [a, b, c] of [[u[0], mu[0], mu[2]], [mu[0], u[1], mu[1]], [mu[2], mu[1], u[2]], [mu[0], mu[1], mu[2]]]) nu.push(...a, ...b, ...c);
      }
      g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(np, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(nu, 2));
    }
    g.computeVertexNormals();
    return g;
  }

  const atras = new THREE.PlaneGeometry(W, H, 24, 18);
  const fondoFuera = malla(atras, vivo(matPapelLiso, 0, -1, -1, -1), Z.atras); fondoFuera.rotation.y = Math.PI;   // se abomba hacia atrás
  const fondoDentro = malla(atras, vivo(matForro.clone(), 0, -1, 1), Z.atras + 0.001);
  sobre.add(fondoFuera, fondoDentro);

  const forma = new THREE.Shape();
  forma.moveTo(-W / 2, -H / 2); forma.lineTo(W / 2, -H / 2); forma.lineTo(W / 2, H / 2);
  forma.lineTo(0, H / 2 - V); forma.lineTo(-W / 2, H / 2); forma.closePath();
  // las UV de ShapeGeometry son las coordenadas de la forma: se llevan a 0..1 con repeat/offset
  const geoFrente = subdividir(new THREE.ShapeGeometry(forma), 4);
  const frente = malla(geoFrente, vivo(papel({ ...piezaFrente, w: W, h: H, ox: .5, oy: .5 }), 0, 1, 1), Z.frente);
  const frenteDorso = malla(geoFrente, vivo(matForro.clone(), 0, 1, -1), Z.frente - 0.001);
  frenteDorso.rotation.y = Math.PI; frenteDorso.scale.x = -1;
  sobre.add(frente, frenteDorso);

  /* La solapa es una tira de papel que sale del borde de arriba de la parte de atrás. Cerrada, da la vuelta en un
     pliegue redondo y cae por delante. Su forma se calcula en el shader como una curva de tres tramos:
       1) el pliegue (arco que gira uBeta: π cerrada, un poco menos de 0 abierta, ya echada hacia atrás);
       2) el cuerpo, con una curvatura uKappa (el papel se comba mientras se mueve y se queda atrás);
       3) la punta, que se dobla aparte (uTip): es lo primero que se despega al abrirla o al empujar desde dentro.
     Así no gira como una tapa rígida: se pela desde la punta y se desenrolla por el pliegue. */
  const R0 = (Z.solapa - Z.atras) / 2, LB = Math.PI * R0, LT = .3;
  const US = {
    uBeta: { value: Math.PI }, uKappa: { value: 0 }, uTip: { value: 0 },
    uLb: { value: LB }, uLt: { value: LT }, uF: { value: F }, uBase: { value: new THREE.Vector2(H / 2, Z.atras) },
  };
  const GLSL_SOLAPA = `
    uniform float uBeta, uKappa, uTip, uLb, uLt, uF; uniform vec2 uBase;
    void arco(inout vec2 P, inout float a, float k, float L) {
      if (L <= 0.) return;
      if (abs(k) < 1e-4) { P += vec2(cos(a), sin(a)) * L; return; }
      float a2 = a + k * L;
      P += vec2(sin(a2) - sin(a), cos(a) - cos(a2)) / k;
      a = a2;
    }
    void curvaSolapa(float s, out vec2 P, out float a) {   // (u = alto en el sobre, v = hacia el invitado)
      P = uBase; a = 0.;
      arco(P, a, uBeta / uLb + uKappa, min(s, uLb));
      arco(P, a, uKappa, min(s, uF - uLt) - uLb);
      arco(P, a, uKappa + uTip / uLt, s - (uF - uLt));
    }
  `;
  function vivoSolapa(mat, orient) {
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U, US, { uAlmohada: { value: 1 }, uOrient: { value: orient }, uEspejo: { value: 1 }, uYoff: { value: 0 } });
      sh.vertexShader = GLSL_DESPLAZA + GLSL_SOLAPA + sh.vertexShader
        .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
          vec2 Pc; float ac;
          curvaSolapa(max(0., -position.y), Pc, ac);
          vec2 nc = vec2(-sin(ac), cos(ac));
          Pc -= uOrient * nc * .0008;                                   // grosor del papel: cara de fuera y forro
          float vc = Pc.y + desplaza(vec2(position.x, Pc.x)) * step(2.5, ac);   // el abombado solo con la solapa cerrada
          vec2 ng = -uOrient * nc;
          objectNormal = vec3(0., ng.x, uOrient * ng.y);`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          transformed = vec3(position.x, Pc.x, uOrient * vc);`);
    };
    mat.customProgramCacheKey = () => "solapa" + orient;
    return mat;
  }
  // la misma curva en JS (para el lacre)
  function curvaJS(sl, beta, kappa, tip) {
    let u = H / 2, v = Z.atras, a = 0;
    const arco = (k, L) => {
      if (L <= 0) return;
      if (Math.abs(k) < 1e-4) { u += Math.cos(a) * L; v += Math.sin(a) * L; return; }
      const a2 = a + k * L;
      u += (Math.sin(a2) - Math.sin(a)) / k; v += (Math.cos(a) - Math.cos(a2)) / k; a = a2;
    };
    arco(beta / LB + kappa, Math.min(sl, LB));
    arco(kappa, Math.min(sl, F - LT) - LB);
    arco(kappa + tip / LT, sl - (F - LT));
    return { u, v, a };
  }

  const geoTri = subdividir(new THREE.ShapeGeometry(tri, 6), 3);
  const solapa = new THREE.Group();   // queda en el origen del sobre: la forma la pone el shader
  const solapaFuera = malla(geoTri, vivoSolapa(papel({ ...piezaSolapa, w: W, h: F, ox: .5, oy: 1 }), 1), 0);
  const solapaDentro = malla(geoTri, vivoSolapa(matForro.clone(), -1), 0);
  solapaDentro.rotation.y = Math.PI; solapaDentro.scale.x = -1;
  for (const m of [solapaFuera, solapaDentro]) m.frustumCulled = false;   // el shader la mueve fuera de su caja
  solapa.add(solapaFuera, solapaDentro);
  sobre.add(solapa);

  // lacre con las iniciales: dos mitades que se separan al romperse
  await document.fonts.load('italic 400 80px "Bodoni Moda"').catch(() => {});
  const iniciales = (escenario.dataset.iniciales || "").replace("&", " & ").trim();
  const texLacre = lienzo2d(256, 256, (g, w, h) => {
    const r = w / 2;
    const gr = g.createRadialGradient(r * .8, r * .7, 4, r, r, r);
    gr.addColorStop(0, "rgba(255,255,255,.18)"); gr.addColorStop(1, "rgba(0,0,0,.25)");
    g.fillStyle = C.lacre; g.fillRect(0, 0, w, h);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(0,0,0,.28)"; g.lineWidth = 5; g.beginPath(); g.arc(r, r, r * .78, 0, 7); g.stroke();
    g.font = 'italic 400 76px "Bodoni Moda", Georgia, serif';
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillText(iniciales, r + 2, r + 4);
    g.fillStyle = "rgba(255,225,215,.55)"; g.fillText(iniciales, r, r + 2);
  });
  const matCera = new THREE.MeshStandardMaterial({ color: C.lacre, roughness: .45, metalness: .05, envMapIntensity: .6, emissive: 0xff8a3a, emissiveIntensity: 0 });
  const matSello = new THREE.MeshStandardMaterial({ map: texLacre, roughness: .45, envMapIntensity: .6, emissive: 0xff8a3a, emissiveIntensity: 0 });
  const lacre = new THREE.Group();
  const mitades = [0, 1].map((i) => {   // la grieta va en vertical, entre las dos iniciales
    const m = new THREE.Group();
    const cera = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.035, 24, 1, false, i * Math.PI, Math.PI), matCera);
    cera.rotation.x = Math.PI / 2;
    const cara = new THREE.Mesh(new THREE.CircleGeometry(0.165, 24, Math.PI / 2 + i * Math.PI, Math.PI), matSello);
    cara.position.z = 0.0181;
    m.add(cera, cara);
    lacre.add(m);
    return m;
  });
  lacre.position.set(0, H / 2 - F + 0.085, Z.solapa + 0.02);

  /* ------------------------------------------------ luz: rayos que salen de la boca del sobre */
  const texRayos = lienzo2d(512, 512, (g, w, h) => {
    g.translate(w / 2, h / 2);   // los rayos nacen en el centro: sin bordes rectos en ningún lado
    for (let i = 0; i < 22; i++) {
      const a = -Math.PI / 2 + (Math.random() - .5) * 1.3, ancho = .012 + Math.random() * .04, largo = h / 2 * (.5 + Math.random() * .5);
      const gr = g.createLinearGradient(0, 0, Math.cos(a) * largo, Math.sin(a) * largo);
      gr.addColorStop(0, "rgba(255,214,140,.5)"); gr.addColorStop(.6, "rgba(255,206,120,.12)"); gr.addColorStop(1, "rgba(255,200,110,0)");
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, 0);
      g.lineTo(Math.cos(a - ancho) * largo, Math.sin(a - ancho) * largo);
      g.lineTo(Math.cos(a + ancho) * largo, Math.sin(a + ancho) * largo); g.fill();
    }
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, h * .16);
    gr.addColorStop(0, "rgba(255,236,190,.8)"); gr.addColorStop(1, "rgba(255,220,150,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, h * .16, 0, Math.PI * 2); g.fill();
  });
  const matRayos = new THREE.MeshBasicMaterial({ map: texRayos, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const rayos = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), matRayos);
  rayos.position.set(0, H / 2 - V * 0.55, Z.atras + 0.002);
  rayos.renderOrder = 2;
  sobre.add(rayos);

  /* ------------------------------------------------ chispas: fuegos artificiales al fondo y chispitas del lacre */
  const texChispa = lienzo2d(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.2, "rgba(255,255,255,.75)"); gr.addColorStop(.45, "rgba(255,255,255,.12)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  const N = gamaBaja ? 500 : innerWidth < 600 ? 900 : 1400;
  const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const vida = new Float32Array(N), dura = new Float32Array(N), tamP = new Float32Array(N), tam0 = new Float32Array(N), alfa = new Float32Array(N);
  const tipo = new Uint8Array(N);   // 0 chispa, 1 cohete (deja estela y estalla), 2 estela
  const geoP = new THREE.BufferGeometry();
  geoP.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geoP.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geoP.setAttribute("tam", new THREE.BufferAttribute(tamP, 1));
  geoP.setAttribute("alfa", new THREE.BufferAttribute(alfa, 1));
  const matP = new THREE.ShaderMaterial({
    uniforms: { mapa: { value: texChispa }, escalaPx: { value: 1 } },
    vertexShader: "attribute float tam; attribute float alfa; varying vec3 vC; varying float vA; uniform float escalaPx;" +
      "void main(){ vC = color; vA = alfa; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = tam * escalaPx / -mv.z; gl_Position = projectionMatrix * mv; }",
    fragmentShader: "uniform sampler2D mapa; varying vec3 vC; varying float vA; void main(){ vec4 t = texture2D(mapa, gl_PointCoord); gl_FragColor = vec4(vC * t.rgb, t.a * vA); }",
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const chispas = new THREE.Points(geoP, matP);
  chispas.frustumCulled = false;
  let libreP = 0;
  const PALETA = [[1, .84, .55], [1, .95, .82], [1, .72, .68], [.98, .88, .62], [.85, .92, 1]];   // oro, marfil, rosa, champán, plata
  function chispa(x, y, z, vx, vy, vz, vidaS, tam, c, t = 0) {
    const i = libreP; libreP = (libreP + 1) % N;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    dura[i] = vida[i] = vidaS; tamP[i] = tam0[i] = tam; alfa[i] = 1; tipo[i] = t;
    return i;
  }
  // chispitas pequeñas (al romperse el lacre)
  function chispitas(n, x, y, z, fuerza) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = fuerza * (.3 + Math.random() * .7);
      chispa(x, y, z, Math.cos(a) * v, Math.sin(a) * v, Math.random() * v * .4, .5 + Math.random() * .5, 5 + Math.random() * 6, PALETA[0]);
    }
  }
  // un cohete que sube desde abajo, detrás del sobre, y estalla en (x, y)
  let altoVis = 3.3;
  const fuegos = [];
  function cohete(x, y, retardoS = 0) {
    setTimeout(() => {
      const z = -2.6 - Math.random() * 1.2, y0 = -altoVis * .9, subida = .75 + Math.random() * .25;
      const i = chispa(x + (Math.random() - .5) * .4, y0, z, 0, (y - y0) / subida, 0, subida, 20, PALETA[1], 1);
      fuegos.push({ i, x, y, z, c: PALETA[(Math.random() * PALETA.length) | 0] });
      try { window.SFX && window.SFX.cohete && window.SFX.cohete(); } catch { /* sin sonido */ }
      seguir();
    }, Math.max(0, retardoS) * 1000);
  }
  function estallar(f) {
    const n = 70 + ((Math.random() * 40) | 0), v = 2.2 + Math.random() * 1.1, c2 = PALETA[(Math.random() * PALETA.length) | 0];
    for (let k = 0; k < n; k++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);   // dirección uniforme en la esfera
      const vv = v * (.85 + Math.random() * .15);
      chispa(f.x, f.y, f.z, r * Math.cos(a) * vv, r * Math.sin(a) * vv, u * vv, 1.5 + Math.random() * 1, 22 + Math.random() * 16, k % 3 ? f.c : c2);
    }
    try { window.SFX && window.SFX.fuego && window.SFX.fuego(); } catch { /* sin sonido */ }
  }
  function moverChispas(dt) {
    for (let i = 0; i < N; i++) {
      if (vida[i] <= 0) { if (tamP[i]) tamP[i] = 0; continue; }
      vida[i] -= dt;
      const j = i * 3;
      if (tipo[i] === 1) {   // cohete: deja estela y al acabar estalla
        for (let r = 0; r < 2; r++) chispa(pos[j] + (Math.random() - .5) * .02, pos[j + 1] - vel[j + 1] * dt * r * .5, pos[j + 2], (Math.random() - .5) * .04, -.05, 0, .16, 6, PALETA[0], 2);
        if (vida[i] <= 0) {
          const k = fuegos.findIndex((q) => q.i === i);
          if (k >= 0) estallar(fuegos.splice(k, 1)[0]);
        }
      } else {
        vel[j + 1] -= .55 * dt;                                       // gravedad
        const roce = 1 - 1.5 * dt;
        vel[j] *= roce; vel[j + 1] *= roce; vel[j + 2] *= roce;
      }
      pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
      const k = Math.max(0, vida[i] / dura[i]);
      alfa[i] = tipo[i] === 0 ? Math.min(1, k * 1.6) * (k < .35 ? (.6 + .4 * Math.sin(vida[i] * 60)) : 1) : k;   // titilan al apagarse
      tamP[i] = vida[i] > 0 ? tam0[i] * (.5 + .5 * k) : 0;
    }
    for (const n of ["position", "color", "tam", "alfa"]) geoP.attributes[n].needsUpdate = true;
  }

  /* ------------------------------------------------ pétalos que caen */
  const petalo = new THREE.Shape();
  petalo.moveTo(0, -.05);
  petalo.bezierCurveTo(.045, -.03, .05, .03, 0, .055);
  petalo.bezierCurveTo(-.05, .03, -.045, -.03, 0, -.05);
  const geoPetalo = new THREE.ShapeGeometry(petalo, 8);
  { // un poco curvado, como un pétalo de verdad
    const pp = geoPetalo.attributes.position;
    for (let i = 0; i < pp.count; i++) pp.setZ(i, -(pp.getX(i) ** 2) * 5);
    geoPetalo.computeVertexNormals();
  }
  const NP = gamaBaja ? 45 : innerWidth < 600 ? 70 : 110;
  const matPetalo = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .55, envMapIntensity: .5 });
  const petalos = new THREE.InstancedMesh(geoPetalo, matPetalo, NP);
  petalos.frustumCulled = false;
  const COLORES_PETALO = ["#F3D3D0", "#E9B4B2", "#F7EBE4", "#DDA0A3", "#F1DCC0"].map((c) => new THREE.Color(c));
  const pet = Array.from({ length: NP }, (_, i) => {
    petalos.setColorAt(i, COLORES_PETALO[i % COLORES_PETALO.length]);
    return { vivo: false, x: 0, y: 0, z: 0, vy: 0, fase: Math.random() * 6.28, ang: Math.random() * 6, vg: 1 + Math.random() * 2, esc: 1.3 + Math.random() * .9,
      giro: new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize() };
  });
  const oculto = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < NP; i++) petalos.setMatrixAt(i, oculto);
  let ritmoPetalos = 0, petalosPend = 0;
  function soltarPetalo(arriba = true) {
    const p = pet.find((q) => !q.vivo);
    if (!p) return;
    p.vivo = true;
    p.z = -1.2 + Math.random() * 2.4;                       // unos delante y otros detrás de la tarjeta
    const ancho = altoVis * camara.aspect * (1 + (1.2 - p.z) * .12);
    p.x = (Math.random() - .5) * ancho;
    p.y = arriba ? altoVis * .6 + Math.random() * .3 : (Math.random() - .3) * altoVis;
    p.vy = .28 + Math.random() * .22;
  }
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  function moverPetalos(dt, t) {
    petalosPend += ritmoPetalos * dt;
    while (petalosPend > 1) { petalosPend--; soltarPetalo(); }
    for (let i = 0; i < NP; i++) {
      const p = pet[i];
      if (!p.vivo) continue;
      p.y -= p.vy * dt;
      p.x += Math.sin(t * 1.3 + p.fase) * .25 * dt;         // vaivén
      p.ang += p.vg * dt;
      if (p.y < -altoVis * .65) { p.vivo = false; petalos.setMatrixAt(i, oculto); continue; }
      q4.setFromAxisAngle(p.giro, p.ang);
      m4.compose(e3.set(p.x, p.y, p.z), q4, s3.setScalar(p.esc));
      petalos.setMatrixAt(i, m4);
    }
    petalos.instanceMatrix.needsUpdate = true;
  }
  function lluviaDePetalos() {
    for (let k = 0; k < (innerWidth < 600 ? 34 : 50); k++) soltarPetalo(Math.random() < .6);
    ritmoPetalos = innerWidth < 600 ? 3 : 5;               // y luego siguen cayendo despacio
  }
  function traca(n, desde = 0) {   // varios fuegos seguidos por detrás
    for (let k = 0; k < n; k++) {
      const lado = Math.random() < .5 ? -1 : 1;   // a los lados: que las estelas no pasen por detrás de la tarjeta
      cohete(lado * (.75 + Math.random() * (altoVis * camara.aspect * .55 - .75)), altoVis * (.05 + Math.random() * .35), desde + k * (.18 + Math.random() * .3));
    }
  }

  /* ------------------------------------------------ montaje */
  const grupo = new THREE.Group();       // sobre + tarjeta: flota y se inclina
  grupo.add(sobre, carta, lacre);
  const soporte = new THREE.Group();     // posición en pantalla
  soporte.add(grupo);
  escena.add(soporte, chispas, petalos);   // chispas y pétalos van en coordenadas de escena
  carta.position.set(0, -0.02, (Z.atras + Z.frente) / 2);

  // estado (lo animan GSAP o el bucle)
  const abiertoYa = raiz.classList.contains("abierto") && !window.__abrirPendiente;
  const est = {
    rx: -0.18, ry: 0.32, rz: -0.05, sube: 0, escala: 0.92, tiembla: 0, sacude: 0, vida: 1, inflar: 0, empuja: 0, curva: 0, pelar: 0, saltoY: 0, aplasta: 0, giroExtra: 0, ladeo: 0, levanta: 0, vibra: 0, fuga: 0, dobla: 0, tuerce: 0, bultoX: 0, bultoY: -.2, bultoA: 0, cartaVista: 0,
    solapa: 0, cartaY: carta.position.y, cartaZ: carta.position.z, giro: 0, giroZ: Math.PI / 2, golpe: 1, enfoque: 0,
    sobreY: 0, sobreRX: 0, sobreAlfa: 1, sobreVisto: 1,
    lacreY: 0, lacreAbre: 0, lacreAlfa: 1, lacreLuz: 0,
    rayos: 0, brillo: 0.9, barrido: 0, dentro: 0, flota: 1,
  };
  const ABIERTO = { vida: 0, inflar: 0, empuja: 0, cartaVista: 1, brillo: .3, rx: 0, ry: 0, rz: 0, sube: 0, escala: 1, solapa: Math.PI - 0.2, cartaY: 0, cartaZ: 0.45, giroZ: 0, enfoque: 1,
    sobreY: -5, sobreAlfa: 0, sobreVisto: 0, lacreAlfa: 0 };
  if (abiertoYa) Object.assign(est, ABIERTO);
  if (quieto && !abiertoYa) Object.assign(est, { rx: 0, ry: 0, rz: 0, escala: 1 });

  /* encuadre: primero el sobre (apaisado, casi de lado a lado en el móvil) y luego la tarjeta, encima del titular */
  let distSobre = 8, distCarta = 7, tanFov = 1;
  function encuadre() {
    const w = escenario.clientWidth, h = escenario.clientHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    tanFov = Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
    distSobre = Math.max(H / 0.42, W / (0.86 * camara.aspect)) / (2 * tanFov);
    distCarta = Math.max(ALTO / 0.46, ANCHO / (0.6 * camara.aspect)) / (2 * tanFov);
    camara.updateProjectionMatrix();
    colocarCamara();
    matP.uniforms.escalaPx.value = h * renderer.getPixelRatio() / (2 * tanFov) * 0.0032;
  }
  function colocarCamara() {
    const k = est.enfoque;
    camara.position.z = distSobre + (distCarta - distSobre) * (k * k * (3 - 2 * k));
    altoVis = 2 * camara.position.z * tanFov;
    soporte.position.y = altoVis * (0.5 - 0.38);   // el centro, al 38 % de la altura
  }
  encuadre();
  new ResizeObserver(encuadre).observe(escenario);

  /* puntero / giroscopio (inclinación suave) y arrastre para girar la tarjeta */
  const apunta = { x: 0, y: 0 }, inclina = { x: 0, y: 0 };
  let arrastre = 0, arrastrando = false, ultimoX = 0, inercia = 0, libre = abiertoYa;
  addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") { apunta.x = (e.clientX / innerWidth) * 2 - 1; apunta.y = (e.clientY / innerHeight) * 2 - 1; }
    if (!arrastrando) return;
    const dx = e.clientX - ultimoX; ultimoX = e.clientX;
    arrastre += dx * 0.012; inercia = dx * 0.012;
  }, { passive: true });
  addEventListener("deviceorientation", (e) => {
    if (e.gamma == null) return;
    apunta.x = Math.max(-1, Math.min(1, e.gamma / 30));
    apunta.y = Math.max(-1, Math.min(1, (e.beta - 50) / 30));
  }, { passive: true });
  lienzo.addEventListener("pointerdown", (e) => { if (libre) { arrastrando = true; ultimoX = e.clientX; inercia = 0; } });
  addEventListener("pointerup", () => (arrastrando = false));
  addEventListener("pointercancel", () => (arrastrando = false));

  /* bucle (solo mientras el escenario se ve y la pestaña está delante) */
  let visible = true, corriendo = false, tPrevio = 0;
  const reloj = new THREE.Clock();
  const v3 = new THREE.Vector3();
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) seguir(); }).observe(escenario);
  document.addEventListener("visibilitychange", seguir);
  const baseCam = () => camara.position.z;

  let ultimoCuadro = 0, sumaMs = 0, cuadros = 0;
  function ajustarResolucion(ms) {   // cada ~1,5 s: si va lento, menos píxeles; si va sobrado, vuelve a subir
    sumaMs += ms; cuadros++;
    if (sumaMs < 1500) return;
    const media = sumaMs / cuadros;
    sumaMs = 0; cuadros = 0;
    let nuevo = dpr;
    if (media > 24 && dpr > 1) nuevo = Math.max(1, dpr - .25);          // por debajo de ~40 fps
    else if (media < 17.5 && dpr < DPR_MAX) nuevo = Math.min(DPR_MAX, dpr + .25);
    if (nuevo !== dpr) { dpr = nuevo; renderer.setPixelRatio(dpr); encuadre(); }
  }
  function cuadro(ahora) {
    corriendo = false;
    if (!visible || document.hidden) { ultimoCuadro = 0; return; }
    if (ultimoCuadro && ahora - ultimoCuadro < 10.5) { seguir(); return; }   // en pantallas de 120 Hz, uno de cada dos
    if (ultimoCuadro) ajustarResolucion(ahora - ultimoCuadro);
    ultimoCuadro = ahora;
    const t = reloj.getElapsedTime();
    const dt = Math.min(0.05, t - tPrevio); tPrevio = t;
    const flota = quieto ? 0 : est.flota;
    inclina.x += (apunta.x - inclina.x) * 0.05;
    inclina.y += (apunta.y - inclina.y) * 0.05;
    if (!arrastrando) { arrastre += inercia; inercia *= 0.92; arrastre *= 0.94; }   // vuelve de frente sola
    const bajado = Math.min(1, Math.max(0, scrollY / (escenario.offsetHeight * 0.9)));
    const vibra = (est.tiembla + est.vibra) * (Math.sin(t * 31) * .6 + Math.sin(t * 47) * .4);
    const tiembla = vibra * 0.02;
    // respiración de fondo (muy suave) más los gestos del sobre vivo (ver «el sobre vivo» más abajo)
    const respira = .5 + .5 * Math.sin(t * 1.25);
    U.uInflar.value = est.vida * (.008 + .014 * respira) * (quieto ? 0 : 1) + est.inflar * .06;
    U.uDobla.value = est.dobla;
    U.uTuerce.value = est.tuerce;
    U.uCurva.value = est.curva;
    U.uBulto.value.set(est.bultoX, est.bultoY, est.bultoA);
    const empujon = est.levanta + est.empuja * (.05 + .015 * Math.sin(t * 38)) + Math.abs(vibra) * .02 * (est.levanta > .02 ? 1 : 0);

    grupo.rotation.set(
      est.rx + inclina.y * 0.12 * flota + Math.sin(t * 0.7) * 0.03 * flota + bajado * 0.9,
      est.ry + inclina.x * 0.2 * flota + Math.sin(t * 0.5) * 0.05 * flota,
      est.rz + Math.sin(t * 0.6 + 1) * 0.012 * flota + tiembla + est.giroExtra,
    );
    grupo.rotation.x += est.ladeo;
    grupo.position.y = est.sube + est.saltoY + Math.sin(t * 0.9) * 0.025 * flota + bajado * 0.5;
    const e0 = est.escala * (1 - bajado * 0.15);
    grupo.scale.set(e0 * (1 + est.aplasta * .45), e0 * (1 - est.aplasta), e0);   // aplastarse y estirarse al saltar

    // solapa: el pliegue se desenrolla con la apertura (est.solapa de 0 a π-0,2) y con los empujones;
    // la punta se despega aparte (pelar) y el cuerpo se comba mientras se mueve (curva)
    const avance = est.solapa / (Math.PI - 0.2);
    const em = quieto ? 0 : empujon;
    const betaS = Math.PI - avance * (Math.PI + 0.15) - em * .55;
    const tipS = -(em * .9 + est.pelar);
    const kapS = est.curva * 1.8;
    US.uBeta.value = betaS; US.uTip.value = tipS; US.uKappa.value = kapS;
    colocarCamara();
    carta.position.set(0, est.cartaY, est.cartaZ);
    carta.visible = est.cartaVista > 0;
    pivote.rotation.set(0, est.giro + arrastre, est.giroZ);
    pivote.scale.setScalar(escala * est.golpe);
    sobre.position.y = est.sobreY;
    sobre.rotation.x = est.sobreRX;
    sobre.visible = est.sobreVisto > 0;
    for (const m of materialesSobre) { m.opacity = est.sobreAlfa; m.transparent = est.sobreAlfa < 1; }
    matRayos.opacity = est.rayos * est.sobreAlfa;
    rayos.visible = est.rayos > 0.01;
    rayos.rotation.z = Math.sin(t * 0.8) * 0.06;

    // lacre: brilla, se abre en dos y cae
    // el lacre va pegado a la punta de la solapa: gira con ella y sube con el abombado del papel
    // (cuando se rompe, las mitades ya no siguen a la solapa: caen por su cuenta)
    // (al romperse, las mitades se quedan donde estaba la punta cerrada y caen por su cuenta)
    const roto = est.lacreAbre > 0;
    const cL = curvaJS(F - 0.085, roto ? Math.PI : betaS, roto ? 0 : kapS, roto ? 0 : tipS);
    lacre.position.y = cL.u + Math.sin(cL.a) * 0.022 + est.lacreY;
    lacre.position.z = cL.v - Math.cos(cL.a) * 0.022 + (cL.a > 2.5 ? desplazaJS(0, cL.u) : 0) * (1 - est.lacreAbre);
    lacre.rotation.x = cL.a - Math.PI;
    mitades[0].position.set(-est.lacreAbre * 0.55, -est.lacreAbre * 0.1, est.lacreAbre * 0.25);
    mitades[0].rotation.set(est.lacreAbre * 0.8, -est.lacreAbre * 1.2, est.lacreAbre * 2.2);
    mitades[1].position.set(est.lacreAbre * 0.6, -est.lacreAbre * 0.05, est.lacreAbre * 0.2);
    mitades[1].rotation.set(est.lacreAbre * 0.6, est.lacreAbre * 1.4, -est.lacreAbre * 2.6);
    lacre.visible = est.lacreAlfa > 0.01;
    for (const m of [matCera, matSello]) { m.opacity = est.lacreAlfa; m.transparent = est.lacreAlfa < 1; m.emissiveIntensity = est.lacreLuz + est.vida * .25 * respira; }

    // el brillo cruza en diagonal cada pocos segundos (o lo empuja la apertura)
    const k = est.barrido || (quieto ? 0.5 : (t * 0.16) % 1.4);
    brillo.position.set(-1.4 + k * 2.8, 1.1 - k * 2.2 + soporte.position.y, 0.6);
    brillo.intensity = est.brillo * 2.2 * Math.sin(Math.PI * Math.min(1, k));
    dentro.intensity = est.dentro + est.fuga;
    dentro.position.set(0, soporte.position.y + grupo.position.y + est.sobreY + H / 2 - 0.1, 0.25);

    // cámara: pequeña sacudida en los golpes
    camara.position.x = (Math.random() - .5) * est.sacude * 0.06;
    camara.position.y = (Math.random() - .5) * est.sacude * 0.06;

    moverChispas(dt);
    moverPetalos(dt, t);

    renderer.render(escena, camara);
    seguir();
  }
  function seguir() {
    if (corriendo || !visible || document.hidden) return;
    corriendo = true;
    requestAnimationFrame(cuadro);
  }

  // dónde está un punto del sobre en la escena (para soltar el polvo justo ahí)
  function enEscena(obj, x = 0, y = 0, z = 0) {
    grupo.updateMatrixWorld(true);
    return obj.localToWorld(v3.set(x, y, z));
  }

  renderer.render(escena, camara);
  raiz.classList.add("modelo-listo");
  seguir();
  if (window.gsap && !quieto && !abiertoYa) window.gsap.from(est, { sube: 1.2, rx: -0.6, escala: 0.8, duration: 2.2, ease: "power3.out" });

  /* ------------------------------------------------ el sobre vivo
     Mientras espera, algo dentro quiere salir. Cada poco hace un gesto, elegido al azar y sin repetir el anterior:
     salta (se aplasta, se estira y cae), levanta la solapa y deja escapar luz, algo empuja el papel desde dentro
     y lo recorre, se retuerce, o tiembla. Entre gesto y gesto, unos segundos de calma: así no cansa. */
  let gestoActual = null, siguiente = null, ultimo = "";
  const sfx = (n, vol) => () => { try { const S = window.SFX; if (S && S.activo && S.activo()) S[n](vol); } catch { /* sin sonido */ } };
  const azar = (a, b) => a + Math.random() * (b - a);
  const GESTOS = {
    salto(g) {   // se agacha, salta girando un poco y cae con rebote
      const lado = Math.random() < .5 ? -1 : 1;
      return g.timeline()
        .add(sfx("papel", .5))
        .to(est, { aplasta: .14, saltoY: -.04, duration: .22, ease: "power2.out" })
        .to(est, { aplasta: -.1, saltoY: azar(.28, .42), giroExtra: lado * azar(.08, .18), ladeo: -.12, duration: .3, ease: "power2.out" })
        .to(est, { aplasta: 0, duration: .15 }, "<.15")
        .to(est, { saltoY: 0, giroExtra: 0, ladeo: 0, duration: .3, ease: "power2.in" })
        .add(sfx("golpePapel", .9))
        .to(est, { aplasta: .12, duration: .07, ease: "power1.out" })
        .to(est, { aplasta: 0, duration: .55, ease: "elastic.out(1, .35)" });
    },
    solapa(g) {   // la solapa se levanta temblando, se escapa luz y vuelve a cerrarse de golpe
      return g.timeline()
        .add(sfx("crujido", .8))
        .to(est, { vibra: .6, inflar: .3, duration: .3, ease: "power2.in" })
        .to(est, { levanta: azar(.6, .85), ladeo: -.12, fuga: 1.8, rayos: .45, lacreLuz: .8, duration: .4, ease: "back.out(2)" })
        .to(est, { vibra: 1, duration: .5 })
        .add(sfx("papel", .6), "-=.3")
        .to(est, { levanta: 0, ladeo: 0, vibra: 0, fuga: 0, rayos: 0, inflar: 0, lacreLuz: 0, duration: .22, ease: "power3.in" })
        .add(sfx("golpePapel", 1.1))
        .to(est, { aplasta: .07, duration: .06 })
        .to(est, { aplasta: 0, duration: .5, ease: "elastic.out(1, .4)" });
    },
    empuje(g) {   // algo empuja el papel desde dentro y lo recorre de un lado a otro
      const de = Math.random() < .5 ? -1 : 1;
      return g.timeline()
        .set(est, { bultoX: de * W * .32, bultoY: azar(-.35, .05) })
        .add(sfx("papel", .8))
        .to(est, { bultoA: .14, duration: .25, ease: "power2.out" })
        .add(sfx("papel", .6), "+=.5")
        .to(est, { bultoX: -de * W * .3, bultoY: azar(-.3, .1), duration: 1.1, ease: "sine.inOut" }, "<.05")
        .to(est, { giroExtra: -de * .05, duration: .55, ease: "sine.inOut", yoyo: true, repeat: 1 }, "<")
        .to(est, { bultoA: .18, levanta: .3, fuga: .9, duration: .2, ease: "power2.out" }, "-=.25")
        .add(sfx("crujido", .7), "<")       // intenta salir por arriba
        .to(est, { bultoA: 0, levanta: 0, fuga: 0, duration: .35, ease: "power2.in" });
    },
    retorcerse(g) {   // se dobla y se retuerce como un papel vivo
      return g.timeline()
        .add(sfx("papel", .9))
        .to(est, { tuerce: .13, dobla: .08, ladeo: .08, duration: .32, ease: "sine.inOut" })
        .add(sfx("crujido", .5), "+=.25")
        .to(est, { tuerce: -.13, dobla: -.05, ladeo: -.07, duration: .38, ease: "sine.inOut" })
        .to(est, { tuerce: .07, dobla: .04, duration: .3, ease: "sine.inOut" })
        .to(est, { tuerce: 0, dobla: 0, ladeo: 0, duration: .45, ease: "sine.out" });
    },
    temblor(g) {   // tiembla de impaciencia y se hincha un momento
      return g.timeline()
        .add(sfx("papel", .7))
        .to(est, { vibra: 1, inflar: .5, lacreLuz: .6, duration: .2 })
        .to(est, { vibra: 0, inflar: 0, lacreLuz: 0, duration: .6, ease: "power2.out" }, "+=.35");
    },
  };
  if (/[?&]depurar/.test(location.search)) window.__sobre = { est, GESTOS: () => GESTOS, calidad: () => ({ gamaBaja, dpr, DPR_MAX, N, NP, PX }) };   // solo para pruebas
  const PESOS = { salto: 3, solapa: 3, empuje: 2.5, retorcerse: 2, temblor: 1.5 };
  function gesto() {
    const g = window.gsap;
    if (!g || quieto || raiz.classList.contains("abierto")) return;
    const opciones = Object.keys(PESOS).filter((n) => n !== ultimo);
    let r = Math.random() * opciones.reduce((a, n) => a + PESOS[n], 0), n = opciones[0];
    for (const o of opciones) { r -= PESOS[o]; if (r <= 0) { n = o; break; } }
    ultimo = n;
    gestoActual = GESTOS[n](g);
    // a veces encadena otro gesto enseguida (como si se impacientara); si no, se calma un rato
    // despierto (ya suena) está más inquieto: menos calma entre gestos
    const calma = raiz.classList.contains("despierto") ? azar(.4, 1.3) : azar(1.2, 2.8);
    siguiente = g.delayedCall(gestoActual.duration() + (Math.random() < .3 ? azar(.15, .4) : calma), gesto);
  }
  function calmar() {
    if (siguiente) siguiente.kill();
    if (gestoActual) gestoActual.kill();
    if (window.gsap) window.gsap.to(est, { rayos: 0, saltoY: 0, aplasta: 0, giroExtra: 0, ladeo: 0, levanta: 0, vibra: 0, fuga: 0, dobla: 0, tuerce: 0, bultoA: 0, duration: .35, ease: "power2.out" });
  }
  if (!abiertoYa && window.gsap && !quieto) siguiente = window.gsap.delayedCall(2.4, gesto);
  // al despertarlo, reacciona enseguida con un gesto (y ya con sonido)
  function alDespertar() {
    if (raiz.classList.contains("abierto")) return;
    if (siguiente) siguiente.kill();
    if (gestoActual) gestoActual.progress(1).kill();
    ultimo = "";
    const g = window.gsap;
    if (g && !quieto) { gestoActual = GESTOS[Math.random() < .5 ? "solapa" : "salto"](g); siguiente = g.delayedCall(gestoActual.duration() + .3, gesto); }
  }
  addEventListener("invitacion:despertar", alDespertar);
  if (raiz.classList.contains("despierto") && !abiertoYa) alDespertar();   // lo tocaron mientras cargaba

  /* ------------------------------------------------ apertura */
  const SFX = window.SFX || {};
  const sonido = (n, ...a) => () => { try { SFX[n] && SFX[n](...a); } catch { /* sin sonido */ } };
  const avisar = (nombre) => () => dispatchEvent(new CustomEvent(nombre));

  function abrir() {
    const g = window.gsap;
    if (!g || quieto) {
      Object.assign(est, ABIERTO); libre = true;
      sonido("luz")();
      avisar("invitacion:revelada")();
      return;
    }
    const premium = raiz.classList.contains("con-apertura");
    const T = premium ? 7.5 : 7.0;   // momento del golpe final (la apertura dura unos 7 s)
    calmar();
    g.killTweensOf(est, "rx,ry,rz,sube,escala,flota,vida,inflar,empuja,tiembla,lacreLuz,dentro");
    const tl = g.timeline({ defaults: { overwrite: "auto" } });
    tl
      // 0. el sobre se endereza despacio y deja de respirar; empieza la tensión (sonido que crece hasta el lacre)
      .add(sonido("toque"), 0)
      .add(sonido("subida"), 0)
      .to(est, { rx: 0, ry: 0, rz: 0, sube: 0, escala: 1, flota: .25, duration: 1.1, ease: "sine.inOut" }, 0)
      .to(est, { vida: 0, duration: .8, ease: "sine.out" }, 0)
      .to(est, { inflar: 1, duration: 2.1, ease: "power2.in" }, .2)               // se va hinchando
      .to(est, { empuja: 1, duration: 1.9, ease: "power3.in" }, .4)              // la solapa empuja cada vez más
      .to(est, { tiembla: .7, duration: 1.6, ease: "power3.in" }, .7)            // y tiembla al final
      .to(est, { lacreLuz: 1.5, dentro: .9, duration: 1.8, ease: "power2.in" }, .5)
      // forcejeo: tres empujones cada vez más fuertes, con papel que cruje y la solapa que golpea
      .add(sonido("papel", .7), .35)
      .to(est, { levanta: .22, duration: .16, ease: "power2.out" }, .55).add(sonido("crujido", .7), .55)
      .to(est, { levanta: 0, duration: .14, ease: "power3.in" }, .71).add(sonido("golpePapel", .8), .85)
      .add(sonido("papel", .9), 1.05)
      .to(est, { levanta: .34, aplasta: -.05, duration: .16, ease: "power2.out" }, 1.15).add(sonido("crujido", .9), 1.15)
      .to(est, { levanta: 0, aplasta: 0, duration: .13, ease: "power3.in" }, 1.31).add(sonido("golpePapel", 1), 1.44)
      .add(sonido("papel", 1), 1.6)
      .to(est, { levanta: .45, aplasta: -.08, duration: .15, ease: "power2.out" }, 1.75).add(sonido("crujido", 1.1), 1.75)
      .to(est, { levanta: 0, aplasta: 0, duration: .12, ease: "power3.in" }, 1.9).add(sonido("golpePapel", 1.2), 2.02)

      // el sobre gira y se pone de lado (vista de tres cuartos) para que se vea abrirse de verdad
      .to(est, { ry: .62, rx: -.28, rz: -.06, duration: 1.2, ease: "sine.inOut" }, 1.9)

      // 1. el lacre cede: se parte en dos, el sobre suelta el aire y las mitades caen
      .add(sonido("lacre"), 2.35)
      .add(() => { const p = enEscena(lacre); chispitas(18, p.x, p.y, p.z + .1, 1); }, 2.35)
      .to(est, { sacude: .6, duration: .05 }, 2.35)
      .to(est, { sacude: 0, duration: .6, ease: "power2.out" }, 2.4)
      .to(est, { inflar: 0, empuja: 0, tiembla: 0, duration: .9, ease: "elastic.out(1, .5)" }, 2.35)
      .to(est, { lacreAbre: 1, lacreLuz: 0, duration: .7, ease: "power2.out" }, 2.35)
      .to(est, { lacreY: -3.6, duration: 1.5, ease: "power2.in" }, 2.6)
      .to(est, { lacreAlfa: 0, duration: .4 }, 3.7)

      // 2. la solapa se abre despacio y sale la luz; los primeros fuegos, al fondo
      .set(est, { cartaVista: 1 }, 2.6)
      .add(sonido("solapa"), 2.7)
      .to(est, { pelar: .9, duration: .45, ease: "power2.out" }, 2.6)               // primero se despega la punta
      .to(est, { solapa: Math.PI - 0.2, duration: 1.45, ease: "power2.inOut" }, 2.8)   // luego se desenrolla por el pliegue
      .to(est, { pelar: 0, duration: .9, ease: "sine.inOut" }, 3.15)
      .to(est, { curva: .35, duration: .6, ease: "sine.out" }, 2.9)                // el cuerpo se comba: se queda atrás
      .to(est, { curva: -.12, duration: .45, ease: "sine.inOut" }, 3.6)            // al llegar arriba cimbrea un poco
      .to(est, { curva: 0, duration: .6, ease: "sine.out" }, 4.05)
      .add(sonido("luz"), 3.3)
      .to(est, { dentro: 2.4, rayos: .7, duration: 1.3, ease: "sine.out" }, 3.2)
      .add(() => traca(2), 3.5)

      // 3. la tarjeta sale tumbada, sin prisa, y el sobre baja un poco para dejarla ver
      .add(sonido("desliza"), 4.15)
      .to(est, { cartaY: H / 2 + ANCHO / 2 + 0.08, duration: 1.7, ease: "sine.inOut" }, 4.1)
      .to(est, { sobreY: -0.8, sube: -0.55, duration: 1.7, ease: "sine.inOut" }, 4.1)
      .add(sonido("subida"), T - 2.4)                 // el golpe al revés acaba justo en el impacto

      // 4. ya fuera: viene hacia delante, se pone de pie, la cámara se acerca y el sobre se aleja hacia abajo
      .to(est, { ry: 0, rx: 0, rz: 0, duration: 1.1, ease: "sine.inOut" }, 5.5)     // vuelve de frente para la tarjeta
      .to(est, { cartaZ: 0.45, duration: .9, ease: "sine.inOut" }, 5.6)
      .to(est, { giroZ: 0, duration: 1.1, ease: "power2.inOut" }, 5.75)
      .to(est, { cartaY: 0, sube: 0, duration: T - 5.7, ease: "power2.inOut" }, 5.7)
      .to(est, { enfoque: 1, duration: T - 5.6, ease: "sine.inOut" }, 5.6)
      .add(sonido("caida"), 5.8)
      .to(est, { sobreY: -6, sobreRX: -0.5, duration: 1.8, ease: "power2.in" }, 5.8)
      .to(est, { rayos: 0, dentro: 0, duration: 1 }, 5.8)
      .to(est, { sobreAlfa: 0, duration: .6 }, 6.8)
      .set(est, { sobreVisto: 0 }, 7.5)

      // 5. llega: golpe, destello, traca de fuegos detrás, lluvia de pétalos y la tarjeta late una vez
      .add(sonido("impacto"), T)
      .add(avisar("invitacion:destello"), T)
      .add(() => traca(premium ? 7 : 5), T - .85)     // los cohetes salen antes para estallar con el golpe
      .add(lluviaDePetalos, T)
      .add(() => traca(4, 1.2), T + .4)                // y siguen unos segundos más
      .to(est, { sacude: .8, duration: .04 }, T)
      .to(est, { sacude: 0, duration: .7, ease: "power3.out" }, T + .05)
      .fromTo(est, { golpe: 1.07 }, { golpe: 1, duration: 1.1, ease: "elastic.out(1, .45)", immediateRender: false }, T)
      .to(est, { barrido: 1.25, brillo: 1.1, duration: 1.3, ease: "power1.inOut" }, T)
      .set(est, { barrido: 0 }, T + 1.3)
      .to(est, { brillo: 0.3, flota: 1, duration: 1.2 }, T + 1.3)   // con la tarjeta delante, el brillo apenas roza: no tapa el texto
      .add(avisar("invitacion:revelada"), T + .15)
      .add(() => { libre = true; }, T + .9);

    if (premium) {
      // Premium: ya fuera del sobre, la tarjeta da una vuelta entera y el golpe llega justo al acabarla
      tl.to(est, { giro: Math.PI * 2, duration: T - 6.6, ease: "power2.inOut" }, 6.6)   // cuando ya está de pie
        .set(est, { giro: 0 }, T);
    }
  }

  const empezar = () => { window.__abrirPendiente = false; abrir(); };
  dispatchEvent(new CustomEvent("invitacion:lista"));
  if (abiertoYa) { libre = true; return; }
  if (window.__abrirPendiente) empezar();            // tocaron mientras cargaba
  else addEventListener("invitacion:abrir", empezar, { once: true });
}
