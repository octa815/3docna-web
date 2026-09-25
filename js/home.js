/* 3DOCNA — portada: la mascota se imprime con el scroll y la pantalla se lamina en capas */
import { $, $$, root, clamp, lerp, hasGsap, motionOK, finePointer, initReveals, beadHooks } from "./app.js";

const { gsap, ScrollTrigger } = window;
const STRIPS = 6;
const PIECE_MM = 64; // alto real de la mascota impresa, para el contador Z

/* ---------- Cuenta atrás de Halloween (funciona sin animaciones) ---------- */
const cd = $(".countdown");
if (cd) {
  const end = new Date(cd.dataset.deadline).getTime();
  const tick = () => {
    const ms = end - Date.now();
    if (ms <= 0) { cd.innerHTML = '<div><b>Cerrado</b><span>pedidos de esta campaña</span></div>'; return; }
    const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
    $('[data-cd="d"]', cd).textContent = d;
    $('[data-cd="h"]', cd).textContent = String(h).padStart(2, "0");
    $('[data-cd="m"]', cd).textContent = String(m).padStart(2, "0");
    setTimeout(tick, 30000);
  };
  tick();
}

/* ---------- Contador de la impresión ---------- */
let hud = null, lastL = -1;
function collectHud() { hud = { layer: $$('[data-hud="layer"]'), z: $$('[data-hud="z"]'), pct: $$('[data-hud="pct"]'), bar: $$(".hud-bar i") }; lastL = -1; }
function paintHud(p, layers) {
  if (!hud) collectHud();
  const L = Math.round(p * layers);
  if (L === lastL) return; // solo se toca el DOM cuando cambia la capa
  lastL = L;
  hud.layer.forEach((e) => (e.textContent = String(L).padStart(3, "0")));
  hud.z.forEach((e) => (e.textContent = (p * PIECE_MM).toFixed(2).replace(".", ",")));
  hud.pct.forEach((e) => (e.textContent = Math.round(p * 100)));
  hud.bar.forEach((e) => (e.style.transform = `scaleX(${p})`));
}

if (!hasGsap || !motionOK()) {
  paintHud(1, 96);
  initReveals();
} else {
  start();
}

async function start() {
  const stage = $(".stage");
  const layer = $(".layer", stage);
  const canvas = document.createElement("canvas");
  canvas.className = "gl-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  /* ---------- Laminado: la portada se copia en tiras horizontales ---------- */
  const strips = [layer];
  for (let i = 1; i < STRIPS; i++) {
    const c = layer.cloneNode(true);
    c.setAttribute("aria-hidden", "true");
    c.inert = true;
    $$("[id]", c).forEach((n) => n.removeAttribute("id"));
    $$("h1, h2, h3", c).forEach((n) => { const s = document.createElement("div"); s.className = n.className; s.innerHTML = n.innerHTML; n.replaceWith(s); });
    stage.insertBefore(c, $(".hero-cue", stage));
    strips.push(c);
  }
  strips.forEach((s, i) => {
    const a = (i / STRIPS) * 100, b = 100 - ((i + 1) / STRIPS) * 100;
    s.style.clipPath = `inset(${a}% 0 ${b}% 0)`;
  });
  collectHud(); // ahora también incluye los contadores de las tiras copiadas
  const underLines = $$(".under-title .line > span");
  gsap.set(underLines, { yPercent: 110 });
  gsap.set([".under img", ".under-sub"], { opacity: 0, y: 20 });

  /* ---------- Entrada ---------- */
  const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
  intro
    .from(".hdr", { yPercent: -120, duration: 1.2, clearProps: "transform" }, 0.1)
    .from($$(".hero-copy > *", stage), { y: 40, opacity: 0, duration: 1.1, stagger: 0.07 }, 0.15)
    .from($$(".hud", stage), { y: 20, opacity: 0, duration: 1 }, 0.7)
    .from(".hero-cue", { opacity: 0, duration: 1 }, 1.2);

  /* ---------- Impresora 3D ---------- */
  let printer = null, LAYERS = 96;
  try {
    const m = await import("./printer.js");
    printer = m.createPrinter(canvas);
    LAYERS = m.LAYERS;
    if (printer) root.classList.add("gl-ok");
  } catch (e) { console.warn("[3DOCNA] Sin 3D:", e); }

  const coarse = matchMedia("(pointer: coarse)").matches;
  const printArea = $(".hero-print", layer);
  const P = { intro: 0, scroll: 0, park: 0, spin: 0, tiltX: 0, tiltY: 0, lift: 0, fade: 1 };
  let heroOn = true;
  const beadOn = new Set();
  const syncCanvas = () => canvas.classList.toggle("is-on", Boolean(printer) && (heroOn || beadOn.size > 0));

  // Medidas del hueco de la impresora, calculadas una vez (la portada está fija mientras se ve)
  let area = null;
  const measure = () => {
    const a = printArea.getBoundingClientRect(), s = stage.getBoundingClientRect();
    area = { left: a.left, top: a.top - s.top, width: a.width, height: a.height };
  };
  function placePrinter() {
    const progress = clamp(lerp(0, 0.1, P.intro) + P.scroll * 0.9, 0, 1);
    if (coarse) P.spin = P.intro * 0.6 + P.scroll * Math.PI * 1.4;
    paintHud(progress, LAYERS);
    if (!printer || !heroOn) return;
    if (!area) measure();
    const r = area;
    const small = innerWidth < 700;
    const size = Math.min(r.height * (small ? 0.56 : 0.66), r.width * 0.78) * (1 - P.lift * 0.35);
    printer.hero({
      visible: heroOn, x: r.left + r.width / 2, y: r.top + r.height * (small ? 0.36 : 0.4) - P.lift * innerHeight * 0.6,
      size, progress, park: P.park, spin: P.spin, tiltX: P.tiltX, tiltY: P.tiltY,
    });
  }
  // Primeras capas solas al cargar
  gsap.to(P, { intro: 1, duration: 2.4, delay: 0.5, ease: "power1.inOut", onUpdate: placePrinter });
  // Giro lento y continuo mientras se ve
  // En ordenador gira siempre; en móvil el giro va con el scroll y solo se dibuja cuando algo cambia
  if (!coarse) gsap.ticker.add(() => { if (heroOn && printer) { P.spin += 0.0035; placePrinter(); } });
  addEventListener("resize", () => { area = null; placePrinter(); });
  ScrollTrigger.addEventListener("refresh", () => { area = null; placePrinter(); });
  syncCanvas();
  placePrinter();

  if (finePointer) {
    const qx = gsap.quickTo(P, "tiltX", { duration: 1, ease: "power3.out" });
    const qy = gsap.quickTo(P, "tiltY", { duration: 1, ease: "power3.out" });
    stage.addEventListener("pointermove", (e) => { qy(e.clientX / innerWidth - 0.5); qx(e.clientY / innerHeight - 0.5); });
  }

  /* ---------- Scroll: imprimir, aparcar el cabezal y laminar ---------- */
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: stage, start: "top top", end: () => "+=" + innerHeight * 2.4,
      pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: (self) => {
        const on = self.progress < 0.8;
        if (on !== heroOn) { heroOn = on; syncCanvas(); placePrinter(); }
        $(".hdr").classList.toggle("on-dark", self.progress > 0.78 && self.progress < 1);
      },
    },
  });
  tl.to(P, { scroll: 1, duration: 0.6, ease: "none", onUpdate: placePrinter }, 0)
    .to(".hero-cue", { opacity: 0, duration: 0.05 }, 0)
    .to(P, { park: 1, duration: 0.08, ease: "power2.inOut", onUpdate: placePrinter }, 0.6)
    .to(P, { lift: 1, duration: 0.14, ease: "power2.in", onUpdate: placePrinter }, 0.66);
  strips.forEach((s, i) => {
    tl.to(s, { xPercent: i % 2 ? 105 : -105, duration: 0.2, ease: "power2.in" }, 0.68 + i * 0.022);
  });
  tl.fromTo(".under", { scale: 1.08 }, { scale: 1, duration: 0.25, ease: "power2.out" }, 0.72)
    .to(".under img", { opacity: 1, y: 0, duration: 0.12, ease: "power2.out" }, 0.8)
    .to(underLines, { yPercent: 0, duration: 0.16, stagger: 0.04, ease: "power3.out" }, 0.82)
    .to(".under-sub", { opacity: 0.7, y: 0, duration: 0.1 }, 0.9)
    .to({}, { duration: 0.06 });

  /* ---------- Separadores: la boquilla dibuja la línea ---------- */
  beadHooks.push((bead, p, active, i) => {
    if (!printer) return;
    active ? beadOn.add(i) : beadOn.delete(i);
    syncCanvas();
    const r = bead.getBoundingClientRect();
    const size = innerWidth < 700 ? 58 : 84;
    printer.bead({ visible: beadOn.size > 0, x: r.left + r.width * p, y: r.top + 3, size, wobble: Math.sin(p * 40) });
  });

  /* ---------- Cinta de materiales ---------- */
  const track = $(".marquee-track");
  if (track) {
    track.append(...[...track.children].map((n) => n.cloneNode(true)));
    const loop = gsap.to(track, { xPercent: -50, duration: 36, ease: "none", repeat: -1 });
    const skewTo = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3.out" });
    let dir = 1, settle = 0;
    ScrollTrigger.create({
      trigger: ".marquee", start: "top bottom", end: "bottom top",
      onUpdate: (self) => {
        const v = self.getVelocity();
        dir = v < 0 ? -1 : 1;
        gsap.to(loop, { timeScale: dir * clamp(1 + Math.abs(v) / 400, 1, 5), duration: 0.2, overwrite: true });
        skewTo(clamp(v / -300, -7, 7));
        clearTimeout(settle);
        settle = setTimeout(() => { gsap.to(loop, { timeScale: dir, duration: 1.2, overwrite: true }); skewTo(0); }, 140);
      },
    });
  }

  /* ---------- Tarjetas de negocio apiladas ---------- */
  // Solo en pantallas grandes: en móvil las tarjetas son una lista normal
  gsap.matchMedia().add("(min-width: 701px) and (min-height: 701px)", () => {
    const cards = $$(".stack-card");
    cards.forEach((c, i) => {
      const next = cards[i + 1];
      if (!next) return;
      gsap.to(c, {
        scale: 0.94, "--dim": 0.5, ease: "none",
        scrollTrigger: { trigger: next, start: "top 85%", end: "top 30%", scrub: true },
      });
    });
  });

  /* ---------- Pasos: la línea se rellena ---------- */
  const fill = $(".steps-fill");
  if (fill) gsap.to(fill, { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".steps", start: "top 70%", end: "bottom 60%", scrub: true } });

  /* ---------- Farol de Halloween: vaivén suave ---------- */
  gsap.to(".farol-art svg", { rotate: 2.5, transformOrigin: "50% 8%", duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1 });

  initReveals();
}
